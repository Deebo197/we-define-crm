/**
 * reorganiseDriveReceipts — one-off, admin-only migration that MOVES every
 * existing receipt file in Google Drive into the canonical structure:
 *
 *   We Define Travel Expenses / <YEAR> / <MM - MonthName> / <USER>
 *
 * (month derived from each record's expense/journey date; user folder from
 * the paid-by code — Dee, Celine, Sophie or We Define Travel. Mileage
 * receipts and route images go to a Mileage folder alongside the users).
 *
 * It iterates ALL Expense and MileageJourney records, collects every Drive
 * file id it can find (receipt_files[].drive_file_id, plus ids parsed out of
 * drive.google.com URLs in receipt_url / primary_receipt_file_url /
 * route_image_url), then moves each file with Drive files.update
 * addParents/removeParents — no re-upload, so file ids and public share
 * links stay stable.
 *
 * Old-structure DriveFolder cache rows are never consulted: target folders
 * are resolved fresh (find-or-create against Drive) and the cache keys for
 * the new names naturally miss any rows cached for the old structure.
 *
 * Returns: { moved, skipped, failed: [{ id, error }], total }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RECEIPTS_ROOT_FOLDER = 'We Define Travel Expenses';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const PAID_BY_USER_FOLDER = {
  WDA: 'Dee', DJ: 'Dee',
  WCA: 'Celine', CB: 'Celine',
  WSA: 'Sophie', ST: 'Sophie',
  WD: 'We Define Travel', WD1: 'We Define Travel',
};

function getUserFolderName(paidBy) {
  return PAID_BY_USER_FOLDER[paidBy] || 'We Define Travel';
}

function getMonthFolderName(dateStr) {
  const d = new Date(dateStr || new Date());
  const year = d.getFullYear();
  const month = d.getMonth();
  const mm = String(month + 1).padStart(2, '0');
  return { year: String(year), monthFolder: `${mm} - ${MONTH_NAMES[month]}` };
}

/** Extract Drive file ids from a drive.google.com URL (file/d/<id> and id=<id> variants). */
function extractDriveFileId(url) {
  if (!url || typeof url !== 'string' || !url.includes('drive.google.com')) return null;
  const pathMatch = url.match(/\/file\/d\/([\w-]+)/);
  if (pathMatch) return pathMatch[1];
  const queryMatch = url.match(/[?&]id=([\w-]+)/);
  if (queryMatch) return queryMatch[1];
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // ── Drive helpers ────────────────────────────────────────────────────────
    // In-memory folder cache only — deliberately does NOT read DriveFolder
    // rows, so stale ids cached under old structure names can never be used.
    const folderCache = {};

    async function getMyDriveRootId() {
      const res = await fetch('https://www.googleapis.com/drive/v3/files/root?fields=id', { headers: authHeader });
      const json = await res.json();
      return json.id;
    }

    async function getOrCreateFolder(name, parentId) {
      const key = `${parentId}/${name}`;
      if (folderCache[key]) return folderCache[key];

      const q = encodeURIComponent(`name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`, { headers: authHeader });
      const searchJson = await searchRes.json();
      if (searchJson.files && searchJson.files.length > 0) {
        folderCache[key] = searchJson.files[0].id;
        return folderCache[key];
      }

      const meta = { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] };
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      });
      const json = await res.json();
      if (!json.id) throw new Error(`Failed to create folder "${name}": ${JSON.stringify(json)}`);
      folderCache[key] = json.id;
      return json.id;
    }

    /** Move a file into targetFolderId. Returns 'moved' or 'skipped' (already there). */
    async function moveFile(fileId, targetFolderId) {
      const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, { headers: authHeader });
      const meta = await metaRes.json();
      if (meta.error) throw new Error(meta.error.message || `Failed to read parents for ${fileId}`);
      const parents = meta.parents || [];
      if (parents.includes(targetFolderId)) return 'skipped';

      const removeParents = parents.join(',');
      const moveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${targetFolderId}${removeParents ? `&removeParents=${removeParents}` : ''}&fields=id,parents`,
        {
          method: 'PATCH',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      const moved = await moveRes.json();
      if (moved.error) throw new Error(moved.error.message || `Drive move failed for ${fileId}`);
      return 'moved';
    }

    // ── Fetch all records (paginated) ───────────────────────────────────────
    async function fetchAll(entity) {
      const all = [];
      const seen = new Set();
      const pageSize = 200;
      let offset = 0;
      for (let i = 0; i < 100; i++) {
        const page = await entity.list('-created_date', pageSize, offset);
        if (!page || page.length === 0) break;
        let added = 0;
        for (const rec of page) {
          if (!seen.has(rec.id)) {
            seen.add(rec.id);
            all.push(rec);
            added++;
          }
        }
        if (added === 0 || page.length < pageSize) break; // guard against non-paginating backends
        offset += pageSize;
      }
      return all;
    }

    const expenses = await fetchAll(base44.asServiceRole.entities.Expense);
    const mileage = await fetchAll(base44.asServiceRole.entities.MileageJourney);

    // ── Collect file ids per record, with target date + subfolder ──────────
    /** @type {{ fileId: string, date: string, subfolder: string }[]} */
    const moves = [];
    const seenFileIds = new Set();

    function addFileId(fileId, date, subfolder) {
      if (!fileId || seenFileIds.has(fileId)) return;
      seenFileIds.add(fileId);
      moves.push({ fileId, date, subfolder });
    }

    for (const e of expenses) {
      const date = e.date;
      const subfolder = getUserFolderName(e.paid_by);
      if (Array.isArray(e.receipt_files)) {
        for (const rf of e.receipt_files) {
          addFileId(rf?.drive_file_id, date, subfolder);
          addFileId(extractDriveFileId(rf?.public_receipt_url), date, subfolder);
        }
      }
      addFileId(extractDriveFileId(e.receipt_url), date, subfolder);
      addFileId(extractDriveFileId(e.primary_receipt_file_url), date, subfolder);
    }

    for (const m of mileage) {
      const date = m.date;
      addFileId(extractDriveFileId(m.receipt_url), date, 'Mileage');
      addFileId(extractDriveFileId(m.route_image_url), date, 'Mileage');
    }

    // ── Resolve target folders and move ─────────────────────────────────────
    const myDriveRootId = await getMyDriveRootId();
    const rootId = await getOrCreateFolder(RECEIPTS_ROOT_FOLDER, myDriveRootId);

    let moved = 0;
    let skipped = 0;
    const failed = [];

    for (const { fileId, date, subfolder } of moves) {
      try {
        const { year, monthFolder } = getMonthFolderName(date);
        const yearId = await getOrCreateFolder(year, rootId);
        const monthId = await getOrCreateFolder(monthFolder, yearId);
        const subId = await getOrCreateFolder(subfolder, monthId);
        const result = await moveFile(fileId, subId);
        if (result === 'moved') moved++;
        else skipped++;
      } catch (err) {
        failed.push({ id: fileId, error: err.message });
      }
    }

    return Response.json({
      moved,
      skipped,
      failed,
      total: moves.length,
    });

  } catch (error) {
    console.error('reorganiseDriveReceipts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
