/**
 * processInboxReceipt — OCR + Drive upload for a ReceiptInboxItem.
 *
 * POST body: { inbox_item_id: string }
 *
 * Security:
 *   - Requires authenticated user
 *   - Allows if user.role === "admin" OR item.owner_email === user.email
 *
 * Steps:
 * 1. Auth + ownership check
 * 2. Fetch the ReceiptInboxItem
 * 3. Run OCR/AI extraction
 * 4. Upload to the Drive staging folder ("We Define Travel Expenses/Receipt Inbox"),
 *    create public share link. On confirmation, confirmInboxReceipt MOVES the file
 *    into the final year/month folder (file id and links stay stable).
 * 5. Update item with extracted fields + Drive info
 * 6. Set status to "needs_review" (or "failed" on error)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RECEIPTS_ROOT_FOLDER = 'We Define Travel Expenses';
const INBOX_FOLDER = 'Receipt Inbox';

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

async function getInboxFolderId(base44, authHeader) {
  const rootId = await getOrCreateCachedFolder(base44, authHeader, RECEIPTS_ROOT_FOLDER, null);
  const inboxId = await getOrCreateCachedFolder(base44, authHeader, INBOX_FOLDER, rootId);
  const folderPath = `${RECEIPTS_ROOT_FOLDER}/${INBOX_FOLDER}`;
  return { inboxId, folderPath };
}

async function uploadFileToDrive(authHeader, fileUrl, fileName, folderId, mimeType) {
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.status}`);
  const fileBlob = await fileRes.blob();
  const contentType = mimeType || fileBlob.type || 'application/octet-stream';
  const fileArrayBuffer = await fileBlob.arrayBuffer();
  const fileBytes = new Uint8Array(fileArrayBuffer);

  const boundary = 'WDTInboxBoundary';
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
  const base44 = createClientFromRequest(req);
  let inboxItemId;

  try {
    // --- Auth ---
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    inboxItemId = payload.inbox_item_id;
    if (!inboxItemId) return Response.json({ error: 'inbox_item_id required' }, { status: 400 });

    // --- Fetch item ---
    const items = await base44.asServiceRole.entities.ReceiptInboxItem.filter({ id: inboxItemId });
    const item = items[0];
    if (!item) return Response.json({ error: 'Item not found' }, { status: 404 });

    // --- Ownership check ---
    const isAdmin = user.role === 'admin';
    if (!isAdmin && item.owner_email !== user.email) {
      return Response.json({ error: 'Forbidden: you do not own this inbox item' }, { status: 403 });
    }

    // Mark as processing
    await base44.asServiceRole.entities.ReceiptInboxItem.update(inboxItemId, { status: 'processing' });

    // --- OCR: use primary file if multi-file, else the single file ---
    const primaryFileUrl = item.primary_receipt_file_url || item.file_url;
    const ocrFileUrl = item.receipt_files?.length > 0
      ? (item.receipt_files.find(f => f.role === 'primary')?.file_url || primaryFileUrl)
      : primaryFileUrl;

    let extracted = {};
    let ocrError = null;
    try {
      extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an expert receipt and invoice analyser. Extract the following fields from the attached receipt or invoice document.

Fields to extract:
- date: The receipt/invoice date in YYYY-MM-DD format. If not found, leave it as an empty string — do NOT guess or make up a date.
- supplier: The merchant or supplier name (who issued the document).
- description: A concise description of what was purchased (1-2 sentences).
- amount: The total amount paid (numeric, no currency symbol). Grand total including VAT.
- vat: true if VAT is shown on the document, false otherwise.
- currency: The 3-letter ISO currency code (e.g. GBP, EUR, USD). Default to GBP if not shown.
- confidence: A number 0-100 indicating your confidence in the extraction.

Return only valid JSON with those exact keys.`,
        file_urls: [ocrFileUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            supplier: { type: 'string' },
            description: { type: 'string' },
            amount: { type: 'number' },
            vat: { type: 'boolean' },
            currency: { type: 'string' },
            confidence: { type: 'number' },
          }
        }
      });
    } catch (err) {
      ocrError = err.message;
    }

    // Only accept OCR date if it's a valid YYYY-MM-DD string; otherwise use today.
    const todayStr = new Date().toISOString().split('T')[0];
    const isValidDate = (d) => {
      if (!d || typeof d !== 'string') return false;
      const parsed = new Date(d);
      return !isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(d);
    };
    const extractedDate = isValidDate(extracted.date) ? extracted.date : todayStr;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(extractedDate);
    const monthStr = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

    // --- Drive upload to the staging folder (Receipt Inbox) ---
    let driveFileId = null;
    let publicUrl = null;
    let folderPath = null;

    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
      const authHeader = { Authorization: `Bearer ${accessToken}` };

      const { inboxId, folderPath: fp } = await getInboxFolderId(base44, authHeader);
      folderPath = fp;

      // For multi-file items: upload each file with Primary/Supporting labels
      const receiptFiles = item.receipt_files?.length > 0 ? item.receipt_files : null;

      if (receiptFiles) {
        let supportingCount = 0;
        const updatedReceiptFiles = [];
        for (const rf of receiptFiles) {
          if (rf.drive_file_id) { updatedReceiptFiles.push(rf); continue; } // already uploaded
          const origExt = (rf.original_filename || 'receipt').split('.').pop().toLowerCase();
          const safeExt = ['jpg','jpeg','png','gif','pdf','webp','heic'].includes(origExt) ? origExt : 'jpg';
          const label = rf.role === 'primary' ? 'Primary' : `Supporting ${++supportingCount}`;
          const fname = `${item.receipt_code} - ${label} - ${rf.original_filename || 'receipt'}.${safeExt}`.replace(/\.{2,}/g, '.');
          const uploadData = await uploadFileToDrive(authHeader, rf.file_url, fname, inboxId, rf.mime_type);
          if (uploadData.id) {
            await makeFilePublic(authHeader, uploadData.id);
            const rfPublicUrl = uploadData.webViewLink || `https://drive.google.com/file/d/${uploadData.id}/view`;
            if (rf.role === 'primary') { driveFileId = uploadData.id; publicUrl = rfPublicUrl; }
            updatedReceiptFiles.push({ ...rf, drive_file_id: uploadData.id, public_receipt_url: rfPublicUrl });
          } else {
            updatedReceiptFiles.push(rf);
          }
        }
        // Save updated receipt_files back
        await base44.asServiceRole.entities.ReceiptInboxItem.update(inboxItemId, { receipt_files: updatedReceiptFiles });
      } else {
        // Single file
        const origExt = (item.original_filename || 'receipt').split('.').pop().toLowerCase();
        const safeExt = ['jpg','jpeg','png','gif','pdf','webp','heic'].includes(origExt) ? origExt : 'jpg';
        const inboxFileName = `${item.receipt_code} - Primary - ${item.original_filename || 'receipt'}.${safeExt}`.replace(/\.{2,}/g, '.');
        const uploadData = await uploadFileToDrive(authHeader, item.file_url, inboxFileName, inboxId, item.mime_type);
        if (uploadData.id) {
          driveFileId = uploadData.id;
          await makeFilePublic(authHeader, driveFileId);
          publicUrl = uploadData.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;
        }
      }
    } catch (driveErr) {
      console.error('Drive upload failed (non-fatal):', driveErr.message);
      if (!ocrError) ocrError = `Drive: ${driveErr.message}`;
    }

    // --- Update the inbox item ---
    const updates = {
      status: ocrError && !extracted.amount ? 'failed' : 'needs_review',
      extracted_date: extractedDate,
      extracted_supplier: extracted.supplier || '',
      extracted_description: extracted.description || '',
      extracted_amount: extracted.amount || 0,
      extracted_vat: extracted.vat || false,
      extracted_currency: extracted.currency || 'GBP',
      ocr_confidence: extracted.confidence || null,
      ocr_error: ocrError || null,
      month: monthStr,
      year: d.getFullYear(),
    };
    if (driveFileId) {
      updates.drive_file_id = driveFileId;
      updates.drive_folder_path = folderPath;
      updates.public_receipt_url = publicUrl;
    }

    await base44.asServiceRole.entities.ReceiptInboxItem.update(inboxItemId, updates);

    return Response.json({ success: true, receipt_code: item.receipt_code, extracted });
  } catch (error) {
    console.error('processInboxReceipt error:', error);
    if (inboxItemId) {
      await base44.asServiceRole.entities.ReceiptInboxItem.update(inboxItemId, {
        status: 'failed',
        ocr_error: error.message,
      }).catch(() => {});
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});