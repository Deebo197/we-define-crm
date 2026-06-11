/**
 * syncReceiptToDrive — Sync a confirmed Expense or MileageJourney receipt to Google Drive.
 *
 * Supports both single-file and multi-file (receipt_files[]) expenses.
 *
 * Folder structure (expense and mileage receipts alike — no group subfolders):
 *   We Define Travel Expenses / YEAR / MM - MonthName
 * e.g. We Define Travel Expenses/2026/06 - June
 *
 * The month is derived from the expense date (data.date).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RECEIPTS_ROOT_FOLDER = 'We Define Travel Expenses';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthFolderName(dateStr) {
  const d = new Date(dateStr || new Date());
  const year = d.getFullYear();
  const month = d.getMonth();
  const mm = String(month + 1).padStart(2, '0');
  return { year: String(year), monthFolder: `${mm} - ${MONTH_NAMES[month]}` };
}

async function flagSyncFailed(base44, entityType, entityId) {
  if (!entityId) return;
  try {
    if (entityType === 'expense') {
      await base44.asServiceRole.entities.Expense.update(entityId, { drive_sync_failed: true });
    } else {
      await base44.asServiceRole.entities.MileageJourney.update(entityId, { drive_sync_failed: true });
    }
  } catch (_) { /* best-effort */ }
}

async function getMyDriveRootId(authHeader) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files/root?fields=id', {
    headers: authHeader,
  });
  const json = await res.json();
  return json.id;
}

async function getOrCreateCachedFolder(base44, authHeader, name, parentFolderId) {
  // For the root folder, resolve My Drive root as parent
  let resolvedParent = parentFolderId;
  if (!resolvedParent) {
    resolvedParent = await getMyDriveRootId(authHeader);
  }

  const cacheKey = `${resolvedParent}/${name}`;

  // Check DB cache first
  const existing = await base44.asServiceRole.entities.DriveFolder.filter({ name: cacheKey });
  if (existing.length > 0) return existing[0].folder_id;

  // Search Drive for an existing folder with this name under this parent
  const q = encodeURIComponent(`name='${name}' and '${resolvedParent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`, { headers: authHeader });
  const searchJson = await searchRes.json();
  if (searchJson.files && searchJson.files.length > 0) {
    const folderId = searchJson.files[0].id;
    // Cache it for next time
    await base44.asServiceRole.entities.DriveFolder.create({ name: cacheKey, folder_id: folderId, parent_folder_id: resolvedParent });
    return folderId;
  }

  // Not found — create it
  const meta = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [resolvedParent],
  };
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
  const json = await res.json();
  await base44.asServiceRole.entities.DriveFolder.create({
    name: cacheKey,
    folder_id: json.id,
    parent_folder_id: resolvedParent,
  });
  return json.id;
}

async function uploadFileToDrive(authHeader, fileUrl, fileName, folderId) {
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileUrl} (${fileRes.status})`);
  const fileBlob = await fileRes.blob();
  const contentType = fileBlob.type || 'application/octet-stream';
  const fileArrayBuffer = await fileBlob.arrayBuffer();
  const fileBytes = new Uint8Array(fileArrayBuffer);

  const boundary = 'WDTReceiptBoundary';
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const encoder = new TextEncoder();
  const metaPart = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`
  );
  const closingPart = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(metaPart.length + fileBytes.length + closingPart.length);
  body.set(metaPart, 0);
  body.set(fileBytes, metaPart.length);
  body.set(closingPart, metaPart.length + fileBytes.length);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  return uploadRes.json();
}

async function makeFilePublic(authHeader, fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
}

Deno.serve(async (req) => {
  let base44, entityId, entityType;
  try {
    base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Accept every payload shape Base44 automations or direct invocations produce:
    // { event: {entity_name, entity_id}, data }, { event: {..., data } }, { record },
    // or the record fields at the top level.
    const event = payload.event || {};
    const entityName =
      event.entity_name || event.entityName || payload.entity_type || payload.entity_name ||
      (payload.vehicle_type || payload.record?.vehicle_type ? 'MileageJourney' : 'Expense');
    entityId =
      event.entity_id || event.entityId || event.record_id || payload.entity_id ||
      payload.record?.id || payload.data?.id || payload.id;
    let data = payload.data || event.data || payload.record || (payload.event ? null : payload);
    entityType = /mileage/i.test(String(entityName)) ? 'mileage' : 'expense';

    // Automation payloads sometimes omit the record — fetch it by id instead of giving up.
    if ((!data || (!data.receipt_code && !data.receipt_file && !data.receipt_files)) && entityId) {
      const matches = entityType === 'expense'
        ? await base44.asServiceRole.entities.Expense.filter({ id: entityId })
        : await base44.asServiceRole.entities.MileageJourney.filter({ id: entityId });
      if (matches.length > 0) data = matches[0];
    }

    if (!data) {
      await flagSyncFailed(base44, entityType, entityId);
      return Response.json({ error: 'No data and record not found', entityId }, { status: 400 });
    }

    const receiptCode = data.receipt_code;
    const paidBy = data.paid_by;
    const receiptFiles = data.receipt_files; // may be array or undefined

    // For mileage, only single-file is supported
    if (entityType === 'mileage') {
      const receiptFile = data.receipt_file;
      if (!receiptFile || !receiptCode) {
        return Response.json({ skipped: true, reason: 'Missing receipt_file or receipt_code' });
      }
      if (data.receipt_url?.includes('drive.google.com')) {
        return Response.json({ skipped: true, reason: 'Already synced to Drive' });
      }

      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
      const authHeader = { Authorization: `Bearer ${accessToken}` };
      const dateStr = data.date || new Date().toISOString().split('T')[0];
      const { year, monthFolder } = getMonthFolderName(dateStr);

      const rootId = await getOrCreateCachedFolder(base44, authHeader, RECEIPTS_ROOT_FOLDER, null);
      const yearId = await getOrCreateCachedFolder(base44, authHeader, year, rootId);
      const monthId = await getOrCreateCachedFolder(base44, authHeader, monthFolder, yearId);

      const urlPath = receiptFile.split('?')[0];
      const ext = urlPath.split('.').pop().toLowerCase();
      const safeExt = ['jpg','jpeg','png','gif','pdf','webp','heic'].includes(ext) ? ext : 'jpg';
      const fileName = `${receiptCode} - Mileage.${safeExt}`;

      const uploadData = await uploadFileToDrive(authHeader, receiptFile, fileName, monthId);
      if (!uploadData.id) {
        await flagSyncFailed(base44, entityType, entityId);
        return Response.json({ error: 'Upload failed', details: uploadData }, { status: 500 });
      }
      await makeFilePublic(authHeader, uploadData.id);
      const shareableLink = uploadData.webViewLink || `https://drive.google.com/file/d/${uploadData.id}/view`;
      await base44.asServiceRole.entities.MileageJourney.update(entityId, { receipt_url: shareableLink, drive_sync_failed: false });
      return Response.json({ success: true, drive_link: shareableLink, file_id: uploadData.id });
    }

    // ── Expense path ──────────────────────────────────────────────────────────

    if (!receiptCode) {
      return Response.json({ skipped: true, reason: 'Missing receipt_code' });
    }

    // Skip entirely if primary receipt_url is already in Drive AND every receipt_file also has a drive link
    const hasMultiFile = Array.isArray(receiptFiles) && receiptFiles.length > 0;
    const primaryAlreadyInDrive = data.receipt_url?.includes('drive.google.com') || data.primary_receipt_file_url?.includes('drive.google.com');
    const allFilesInDrive = hasMultiFile && receiptFiles.every(f => f.drive_file_id && f.public_receipt_url?.includes('drive.google.com'));

    if (primaryAlreadyInDrive && (!hasMultiFile || allFilesInDrive)) {
      return Response.json({ skipped: true, reason: 'Already synced to Drive' });
    }

    // We need at least one uploadable file
    const singleReceiptFile = data.receipt_file;
    if (!hasMultiFile && !singleReceiptFile) {
      return Response.json({ skipped: true, reason: 'No receipt file to upload' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const dateStr = data.date || new Date().toISOString().split('T')[0];
    const { year, monthFolder } = getMonthFolderName(dateStr);

    const rootId = await getOrCreateCachedFolder(base44, authHeader, RECEIPTS_ROOT_FOLDER, null);
    const yearId = await getOrCreateCachedFolder(base44, authHeader, year, rootId);
    const monthId = await getOrCreateCachedFolder(base44, authHeader, monthFolder, yearId);

    const supplierOrDesc = (data.description || '').replace(/[^a-zA-Z0-9 \-]/g, '').trim().slice(0, 40);
    const amt = Number(data.paid_amount || 0).toFixed(2);
    const basePrefix = `${receiptCode} - ${paidBy || ''} - ${supplierOrDesc} - ${amt}`;

    let primaryPublicUrl = data.receipt_url || '';
    let updatedReceiptFiles = hasMultiFile ? [...receiptFiles] : null;

    if (hasMultiFile) {
      // Upload/move each file that doesn't yet have a drive_file_id
      let supportingCount = 0;
      for (let i = 0; i < receiptFiles.length; i++) {
        const rf = receiptFiles[i];

        // Already in Drive — skip
        if (rf.drive_file_id && rf.public_receipt_url?.includes('drive.google.com')) {
          if (rf.role === 'primary') primaryPublicUrl = rf.public_receipt_url;
          continue;
        }

        const origExt = (rf.original_filename || rf.file_url || 'receipt').split('.').pop().toLowerCase();
        const safeExt = ['jpg','jpeg','png','gif','pdf','webp','heic'].includes(origExt) ? origExt : 'jpg';
        const label = rf.role === 'primary' ? 'Primary' : `Supporting ${++supportingCount}`;
        const fileName = `${basePrefix} - ${label}.${safeExt}`;

        const uploadData = await uploadFileToDrive(authHeader, rf.file_url, fileName, monthId);
        if (!uploadData.id) {
          console.error(`Upload failed for receipt_file index ${i}:`, uploadData);
          continue; // best-effort — don't abort the whole sync
        }
        await makeFilePublic(authHeader, uploadData.id);
        const fileLink = uploadData.webViewLink || `https://drive.google.com/file/d/${uploadData.id}/view`;

        updatedReceiptFiles[i] = { ...rf, drive_file_id: uploadData.id, public_receipt_url: fileLink };
        if (rf.role === 'primary') primaryPublicUrl = fileLink;
      }

      await base44.asServiceRole.entities.Expense.update(entityId, {
        receipt_files: updatedReceiptFiles,
        receipt_url: primaryPublicUrl,
        primary_receipt_file_url: primaryPublicUrl,
        drive_sync_failed: false,
      });

    } else {
      // Single-file fallback
      const urlPath = singleReceiptFile.split('?')[0];
      const ext = urlPath.split('.').pop().toLowerCase();
      const safeExt = ['jpg','jpeg','png','gif','pdf','webp','heic'].includes(ext) ? ext : 'jpg';
      const fileName = `${basePrefix} - Primary.${safeExt}`;

      const uploadData = await uploadFileToDrive(authHeader, singleReceiptFile, fileName, monthId);
      if (!uploadData.id) {
        await flagSyncFailed(base44, entityType, entityId);
        return Response.json({ error: 'Upload failed', details: uploadData }, { status: 500 });
      }
      await makeFilePublic(authHeader, uploadData.id);
      primaryPublicUrl = uploadData.webViewLink || `https://drive.google.com/file/d/${uploadData.id}/view`;

      await base44.asServiceRole.entities.Expense.update(entityId, {
        receipt_url: primaryPublicUrl,
        drive_sync_failed: false,
      });
    }

    return Response.json({
      success: true,
      drive_link: primaryPublicUrl,
      folder_path: `${RECEIPTS_ROOT_FOLDER}/${year}/${monthFolder}`,
    });

  } catch (error) {
    await flagSyncFailed(base44, entityType, entityId);
    console.error('syncReceiptToDrive error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});