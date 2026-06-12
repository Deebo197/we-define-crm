// ─── Effective-targeting resolution & group expansion ────────────────────────
// A person's effective destinations / sector / specialisms are their own
// override values when set, otherwise inherited from their current employer
// (TradeAccount). Coverage entries are { destination, strength } rows.

/** Person's effective destination rows: coverage[] override else company destinations[]. */
export function effectiveDestinations(person, company) {
  if (person?.coverage?.length) return person.coverage;
  return company?.destinations ?? [];
}

/** True when the person has their own coverage rows (i.e. not inheriting). */
export function hasDestinationOverride(person) {
  return !!person?.coverage?.length;
}

export function effectiveSector(person, company) {
  return person?.sector_override || company?.sector || "";
}

export function effectiveSpecialisms(person, company) {
  if (person?.specialisms_override?.length) return person.specialisms_override;
  return company?.specialisms ?? [];
}

/** Compact patch label, e.g. "Maldives · Mauritius". */
export function patchLabel(destinationRows) {
  return (destinationRows ?? [])
    .map((d) => d.destination)
    .filter(Boolean)
    .join(" · ");
}

// ─── Group expansion over GroupLink ──────────────────────────────────────────

/**
 * Expand a set of company ids through GroupLinks (both directions, multi-level).
 * @param {Iterable<string>} companyIds seed ids
 * @param {Array} groupLinks all GroupLink records
 * @param {object} [opts] { kinds: ["Ownership"] } to restrict link kinds
 * @returns {Set<string>} closure including the seeds
 */
export function expandThroughGroupLinks(companyIds, groupLinks, opts = {}) {
  const kinds = opts.kinds ?? null;
  const links = kinds
    ? groupLinks.filter((l) => kinds.includes(l.link_kind))
    : groupLinks;

  // Undirected adjacency parent <-> child
  const adj = new Map();
  const add = (a, b) => {
    if (!a || !b) return;
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a).add(b);
  };
  links.forEach((l) => {
    add(l.parent_company_id, l.child_company_id);
    add(l.child_company_id, l.parent_company_id);
  });

  const seen = new Set(companyIds);
  const queue = [...seen];
  while (queue.length) {
    const id = queue.pop();
    for (const next of adj.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

/**
 * Group relations for one company.
 * Returns { parents, children, siblings } as arrays of GroupLink-shaped rows:
 * parents = links where this company is the child; children = links where it
 * is the parent; siblings = other children of the same parents.
 */
export function groupRelationsFor(companyId, groupLinks) {
  const parents = groupLinks.filter((l) => l.child_company_id === companyId);
  const children = groupLinks.filter((l) => l.parent_company_id === companyId);
  const parentIds = new Set(parents.map((l) => l.parent_company_id));
  const siblings = groupLinks.filter(
    (l) => parentIds.has(l.parent_company_id) && l.child_company_id !== companyId
  );
  return { parents, children, siblings };
}
