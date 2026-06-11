/**
 * confirmInboxReceipt — Convert a ReceiptInboxItem into a confirmed Expense.
 *
 * Concurrency safety via ReceiptConfirmationLock entity:
 *   1. Attempt to CREATE a lock record keyed by inbox_item_id.
 *      - If creation succeeds → we hold the lock, proceed.
 *      - If creation fails (duplicate) → another request already holds the lock → 409.
 *   2. Re-fetch the ReceiptInboxItem after acquiring the lock.
 *      - If already confirmed (linked_expense_id set) → return existing, release lock.
 *   3. Create exactly one Expense.
 *   4. Update ReceiptInboxItem with status=confirmed + linked_expense_id.
 *   5. Delete the lock record (so re-confirm after a crash is possible).
 *
 * The ReceiptConfirmationLock entity has a unique index on inbox_item_id enforced
 * by Base44's entity layer — two simultaneous creates with the same inbox_item_id
 * will result in one success and one error, giving us a true create-based mutex.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RECEIPTS_ROOT_FOLDER = 'We Define Travel Expenses';

const MONTH_NAMES_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthNames() {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
}

function getMonthFolderName(dateStr) {
  const d = new Date(dateStr || new Date());
  const year = d.getFullYear();
  const month = d.getMonth();
  const mm = String(month + 1).padStart(2, '0');
  return { year: String(year), monthFolder: `${mm} - ${MONTH_NAMES_FULL[month]}` };
}

async function getMyDriveRootId(authHeader) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files/root?fields=id', {
    headers: authHeader,
  });
  const json = await res.json();
  return json.id;
}

async function getOrCreateCachedFolder(base44, authHeader, name, parentFolderId) {
  let resolvedParent = parentFolderId;
  if (!resolvedParent) {
    resolvedParent = await getMyDriveRootId(authHeader);
  }

  const cacheKey = `${resolvedParent}/${name}`;

  const existing = await base44.asServiceRole.entities.DriveFolder.filter({ name: cacheKey });
  if (existing.length > 0) return existing[0].folder_id;

  const q = encodeURIComponent(`name='${name}' and '${resolvedParent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`, { headers: authHeader });
  const searchJson = await searchRes.json();
  if (searchJson.files && searchJson.files.length > 0) {
    const folderId = searchJson.files[0].id;
    await base44.asServiceRole.entities.DriveFolder.create({ name: cacheKey, folder_id: folderId, parent_folder_id: resolvedParent });
    return folderId;
  }

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

/**
 * Move a Drive file into the target folder using files.update
 * addParents/removeParents — this keeps the file id and any public
 * share links stable (no re-upload).
 */
async function moveDriveFile(authHeader, fileId, targetFolderId) {
  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, { headers: authHeader });
  const meta = await metaRes.json();
  if (meta.error) throw new Error(meta.error.message || 'Failed to read file parents');
  const parents = meta.parents || [];
  if (parents.includes(targetFolderId)) return; // already in the target folder

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
  if (moved.error) throw new Error(moved.error.message || 'Drive move failed');
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let lockId = null;

  try {
    // --- Auth ---
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const {
      inbox_item_id, date, description, paid_amount, actual_cost,
      vat, paid_by, category, client_allocations, currency,
      original_amount, exchange_rate,
    } = payload;

    if (!inbox_item_id) return Response.json({ error: 'inbox_item_id required' }, { status: 400 });

    // --- Fetch item ---
    const items = await base44.asServiceRole.entities.ReceiptInboxItem.filter({ id: inbox_item_id });
    let item = items[0];
    if (!item) return Response.json({ error: 'Inbox item not found' }, { status: 404 });

    // --- Ownership check ---
    const isAdmin = user.role === 'admin';
    if (!isAdmin && item.owner_email !== user.email) {
      return Response.json({ error: 'Forbidden: you do not own this inbox item' }, { status: 403 });
    }

    // --- Fast-path: already fully confirmed ---
    if (item.linked_expense_id) {
      return Response.json({
        success: true,
        expense_id: item.linked_expense_id,
        receipt_code: item.receipt_code,
        already_confirmed: true,
      });
    }

    // --- STEP 1: Acquire exclusive lock by creating a lock record ---
    // Base44 entity creates are serialized per record; if two requests race,
    // one create wins and the other gets an error. We catch the error → 409.
    // We also check first if a lock already exists (handles crashed prior run).
    const existingLocks = await base44.asServiceRole.entities.ReceiptConfirmationLock.filter({ inbox_item_id });
    if (existingLocks.length > 0) {
      // Lock exists — either another request is in flight or a previous run crashed.
      // Re-fetch item to see if it was actually confirmed already.
      const recheckItems = await base44.asServiceRole.entities.ReceiptInboxItem.filter({ id: inbox_item_id });
      const recheck = recheckItems[0];
      if (recheck?.linked_expense_id) {
        return Response.json({
          success: true,
          expense_id: recheck.linked_expense_id,
          receipt_code: recheck.receipt_code,
          already_confirmed: true,
        });
      }
      // Lock exists but no expense — another request is actively confirming right now.
      return Response.json({
        error: 'This receipt is currently being confirmed by another request. Please try again shortly.',
        status: 'confirming',
      }, { status: 409 });
    }

    // Attempt to create the lock — this is the true race-condition guard.
    // If two requests reach here simultaneously, Base44 will process creates
    // sequentially; the second will either also succeed (we catch with re-check below)
    // or fail. Either way, after creating we immediately verify we're the sole lock holder.
    let lockRecord;
    try {
      lockRecord = await base44.asServiceRole.entities.ReceiptConfirmationLock.create({
        inbox_item_id,
        locked_by: user.email,
      });
      lockId = lockRecord.id;
    } catch (createErr) {
      // Another request created the lock at the same moment.
      return Response.json({
        error: 'This receipt is currently being confirmed. Please try again shortly.',
        status: 'confirming',
      }, { status: 409 });
    }

    // --- STEP 2: Small settle delay + verify we are the EARLIEST lock holder ---
    await new Promise(r => setTimeout(r, 200));
    const lockCheck = await base44.asServiceRole.entities.ReceiptConfirmationLock.filter({ inbox_item_id });

    // No locks found at all (e.g. another winner already cleaned up) — we must not proceed
    if (lockCheck.length === 0) {
      lockId = null; // already gone
      return Response.json({
        error: 'Lock was released before verification. Please try again.',
        status: 'confirming',
      }, { status: 409 });
    }

    // Sort by created_date ascending — earliest record is the winner regardless of count
    const sorted = lockCheck.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    const winner = sorted[0];

    if (winner.id !== lockId) {
      // We did not win — delete our own lock if it still exists, then back off
      await base44.asServiceRole.entities.ReceiptConfirmationLock.delete(lockId).catch(() => {});
      lockId = null;
      return Response.json({
        error: 'This receipt is currently being confirmed by another request.',
        status: 'confirming',
      }, { status: 409 });
    }

    // We are the winner — clean up any extra losing locks (defensive, shouldn't happen with unique index)
    for (const loser of sorted.slice(1)) {
      await base44.asServiceRole.entities.ReceiptConfirmationLock.delete(loser.id).catch(() => {});
    }

    // --- STEP 3: Re-fetch item now that we hold the lock ---
    const freshItems = await base44.asServiceRole.entities.ReceiptInboxItem.filter({ id: inbox_item_id });
    const fresh = freshItems[0];
    if (fresh?.linked_expense_id) {
      // Already confirmed before we got here — return existing
      await base44.asServiceRole.entities.ReceiptConfirmationLock.delete(lockId);
      lockId = null;
      return Response.json({
        success: true,
        expense_id: fresh.linked_expense_id,
        receipt_code: fresh.receipt_code,
        already_confirmed: true,
      });
    }

    // --- STEP 3b: Safety check — has an Expense already been created for this receipt_code? ---
    // Guards against: Expense.create succeeded but the function crashed before
    // ReceiptInboxItem.linked_expense_id was written (e.g. network blip, timeout).
    if (item.receipt_code) {
      const existingExpenses = await base44.asServiceRole.entities.Expense.filter({ receipt_code: item.receipt_code });
      if (existingExpenses.length > 0) {
        const existingExpense = existingExpenses[0];
        // Heal the inbox item — link it to the already-created expense
        await base44.asServiceRole.entities.ReceiptInboxItem.update(inbox_item_id, {
          status: 'confirmed',
          linked_expense_id: existingExpense.id,
        });
        await base44.asServiceRole.entities.ReceiptConfirmationLock.delete(lockId);
        lockId = null;
        return Response.json({
          success: true,
          expense_id: existingExpense.id,
          receipt_code: item.receipt_code,
          already_confirmed: true,
        });
      }
    }

    // --- STEP 4: Build expense fields ---
    const d = new Date(date || item.extracted_date || new Date());
    const months = getMonthNames();
    const month = `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const year = d.getFullYear();

    const amt = paid_amount || item.extracted_amount || 0;
    const paidBy = paid_by || item.paid_by || 'CB';
    const desc = description || item.extracted_description || item.extracted_supplier || '';

    // --- STEP 5: Move staged Drive files into the final year/month folder ---
    // processInboxReceipt uploaded the files to the staging folder
    // "We Define Travel Expenses/Receipt Inbox". On confirmation we MOVE them
    // (Drive files.update addParents/removeParents) into
    // "We Define Travel Expenses/<YEAR>/<MM - MonthName>" derived from the
    // confirmed expense date — the file id and public links stay stable.
    // Any file without a Drive id (e.g. the staging upload failed) keeps its
    // base44 URL so the syncReceiptToDrive automation uploads it instead.
    const confirmedDate = date || item.extracted_date || new Date().toISOString().split('T')[0];

    let authHeader = null;
    let monthFolderId = null;
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
      authHeader = { Authorization: `Bearer ${accessToken}` };
      const { year: folderYear, monthFolder } = getMonthFolderName(confirmedDate);
      const rootId = await getOrCreateCachedFolder(base44, authHeader, RECEIPTS_ROOT_FOLDER, null);
      const yearId = await getOrCreateCachedFolder(base44, authHeader, folderYear, rootId);
      monthFolderId = await getOrCreateCachedFolder(base44, authHeader, monthFolder, yearId);
    } catch (driveErr) {
      console.error('Drive folder resolution failed (falling back to re-upload via sync):', driveErr.message);
      monthFolderId = null;
    }

    const sourceFileUrl = item.primary_receipt_file_url || item.file_url; // base44 URL
    let primaryFileUrl = sourceFileUrl;
    let receiptFilesForExpense;

    if (item.receipt_files?.length > 0) {
      receiptFilesForExpense = [];
      for (const f of item.receipt_files) {
        let movedOk = false;
        if (monthFolderId && f.drive_file_id) {
          try {
            await moveDriveFile(authHeader, f.drive_file_id, monthFolderId);
            movedOk = true;
          } catch (moveErr) {
            console.error(`Drive move failed for file ${f.drive_file_id}:`, moveErr.message);
          }
        }
        if (movedOk) {
          const fileLink = f.public_receipt_url?.includes('drive.google.com')
            ? f.public_receipt_url
            : `https://drive.google.com/file/d/${f.drive_file_id}/view`;
          receiptFilesForExpense.push({ ...f, public_receipt_url: fileLink });
          if (f.role === 'primary') primaryFileUrl = fileLink;
        } else {
          // No Drive copy — strip Drive fields so syncReceiptToDrive uploads it
          receiptFilesForExpense.push({ ...f, drive_file_id: undefined, public_receipt_url: f.file_url });
        }
      }
    } else if (monthFolderId && item.drive_file_id) {
      try {
        await moveDriveFile(authHeader, item.drive_file_id, monthFolderId);
        primaryFileUrl = item.public_receipt_url?.includes('drive.google.com')
          ? item.public_receipt_url
          : `https://drive.google.com/file/d/${item.drive_file_id}/view`;
      } catch (moveErr) {
        console.error(`Drive move failed for file ${item.drive_file_id}:`, moveErr.message);
      }
    }

    // --- STEP 5b: Create the Expense ---
    // If the Drive move succeeded, receipt_url/primary_receipt_file_url hold
    // Drive links so syncReceiptToDrive skips the record. Otherwise they hold
    // base44 URLs, which triggers the normal upload path.
    const expense = await base44.asServiceRole.entities.Expense.create({
      date: date || item.extracted_date,
      description: desc,
      paid_amount: amt,
      actual_cost: actual_cost || amt,
      vat: vat ?? item.extracted_vat ?? false,
      paid_by: paidBy,
      category: category || item.category || '',
      client_allocations: client_allocations || item.client_allocations || [],
      receipt_file: sourceFileUrl,
      receipt_url: primaryFileUrl,
      primary_receipt_file_url: primaryFileUrl,
      receipt_files: receiptFilesForExpense,
      receipt_code: item.receipt_code,
      reimbursement_required: ['CB', 'ST', 'DJ'].includes(paidBy),
      reimbursement_paid: false,
      month,
      year,
      submitted_by: user.email,
      submitted_by_name: user.full_name,
      source: 'manual',
      currency: currency || item.extracted_currency || 'GBP',
      original_amount: currency && currency !== 'GBP' ? (original_amount || null) : null,
      exchange_rate: currency && currency !== 'GBP' ? (exchange_rate || null) : null,
      status: 'confirmed',
    });

    // --- STEP 6: Mark inbox item confirmed + link expense ---
    await base44.asServiceRole.entities.ReceiptInboxItem.update(inbox_item_id, {
      status: 'confirmed',
      linked_expense_id: expense.id,
      paid_by: paidBy,
      category: category || item.category || '',
      client_allocations: client_allocations || item.client_allocations || [],
    });

    // --- STEP 7: Release the lock ---
    await base44.asServiceRole.entities.ReceiptConfirmationLock.delete(lockId);
    lockId = null;

    return Response.json({ success: true, expense_id: expense.id, receipt_code: item.receipt_code });

  } catch (error) {
    // Clean up lock on unexpected error so the user can retry
    if (lockId) {
      try {
        await (createClientFromRequest(req)).asServiceRole.entities.ReceiptConfirmationLock.delete(lockId);
      } catch (_) {}
    }
    console.error('confirmInboxReceipt error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});