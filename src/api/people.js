import { base44 } from "./base44Client";

// Archived people/seats are soft-deleted duplicates from the June 2026 contact
// dedupe — they must never appear in lists, pickers, or aggregations.
export const listActivePeople = (sort) =>
  base44.entities.Contact.list(sort).then((people) =>
    people.filter((p) => !p.archived)
  );

export const listActiveSeats = (sort, limit) =>
  base44.entities.RoleSeat.list(sort, limit).then((seats) =>
    seats.filter((s) => !s.archived)
  );
