/**
 * Exhaustive fetch helpers — page through an entity until the backend runs
 * out of records, instead of silently truncating at a fixed limit.
 *
 * Mirrors the proven fetchAll loop in base44/functions/reorganiseDriveReceipts:
 * dedupe by id and stop when a page comes back short or adds nothing new,
 * which also guards against backends that ignore the offset argument.
 */

const PAGE_SIZE = 500;
const MAX_PAGES = 50; // sanity cap: 25,000 records

export async function fetchAllRecords(entity, sort) {
  const all = [];
  const seen = new Set();
  let offset = 0;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await entity.list(sort, PAGE_SIZE, offset);
    if (!page || page.length === 0) break;
    let added = 0;
    for (const rec of page) {
      if (!seen.has(rec.id)) {
        seen.add(rec.id);
        all.push(rec);
        added++;
      }
    }
    if (added === 0 || page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

export async function filterAllRecords(entity, query, sort) {
  const all = [];
  const seen = new Set();
  let offset = 0;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await entity.filter(query, sort, PAGE_SIZE, offset);
    if (!page || page.length === 0) break;
    let added = 0;
    for (const rec of page) {
      if (!seen.has(rec.id)) {
        seen.add(rec.id);
        all.push(rec);
        added++;
      }
    }
    if (added === 0 || page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}
