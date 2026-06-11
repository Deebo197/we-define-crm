/**
 * moveDriveFolderToRoot — one-time utility to move a Drive folder into the
 * authenticated user's My Drive root so it appears in the normal folder tree.
 *
 * POST body: { folder_id: string } — the Drive folder id to move.
 * (The receipts root "We Define Travel Expenses" is created at the top of
 * My Drive by the sync functions, so this is only needed for folders that
 * ended up elsewhere.)
 *
 * Call from Dashboard → Code → Functions → moveDriveFolderToRoot → Test.
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const folderId = payload.folder_id;
    if (!folderId) {
      return Response.json({ error: 'folder_id required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Get My Drive root ID
    const rootRes = await fetch('https://www.googleapis.com/drive/v3/files/root?fields=id', {
      headers: authHeader,
    });
    const { id: rootId } = await rootRes.json();

    // Get current parents of the folder
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,parents`,
      { headers: authHeader }
    );
    const fileData = await fileRes.json();
    const currentParents = (fileData.parents || []).join(',');

    // Move: add My Drive root as parent, remove existing parents
    const moveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?addParents=${rootId}&removeParents=${currentParents}&fields=id,name,parents`,
      {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );
    const moved = await moveRes.json();

    if (moved.error) {
      return Response.json({ error: moved.error }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: `Folder "${moved.name || folderId}" moved to My Drive root`,
      folder: moved,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});