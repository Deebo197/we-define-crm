import { format } from "date-fns";
import { base44 } from "./base44Client";

// ─── RoleSeat helpers ────────────────────────────────────────────────────────
// Seats are 1:1 with employed people. Historical interactions reference
// contact_ids and are never touched by seat moves — immutability is automatic.

/** The seat a person currently sits in (Occupied or Temp-covering counts via person_id). */
export function currentSeatFor(personId, seats) {
  if (!personId) return null;
  return (
    seats.find((s) => s.person_id === personId && s.status !== "Vacant") ||
    seats.find((s) => s.person_id === personId) ||
    null
  );
}

function vacatedNote(existingNotes, personName, dateStr) {
  const line = `Vacated by ${personName} on ${dateStr}`;
  return existingNotes ? `${existingNotes}\n${line}` : line;
}

/**
 * Vacate a person's current seat: status -> Vacant, person_id cleared, the
 * person's name preserved in notes, end_date set. No-op if they have no seat.
 */
export async function vacateSeat(person, seats, moveDate) {
  const seat = currentSeatFor(person.id, seats);
  if (!seat) return null;
  const dateStr = moveDate || format(new Date(), "yyyy-MM-dd");
  await base44.entities.RoleSeat.update(seat.id, {
    status: "Vacant",
    person_id: "",
    person_name: "",
    covering_person_id: "",
    covering_person_name: "",
    end_date: dateStr,
    notes: vacatedNote(seat.notes, person.name, dateStr),
  });
  return seat;
}

/**
 * Move a person to a new company: vacate the old seat, create a new Occupied
 * seat at the destination, repoint the Contact's employer.
 */
export async function movePersonToCompany({ person, seats, company, title, moveDate }) {
  const dateStr = moveDate || format(new Date(), "yyyy-MM-dd");
  await vacateSeat(person, seats, dateStr);
  await base44.entities.RoleSeat.create({
    company_id: company.id,
    company_name: company.name,
    title: title || "",
    person_id: person.id,
    person_name: person.name,
    status: "Occupied",
    start_date: dateStr,
  });
  await base44.entities.Contact.update(person.id, {
    company_id: company.id,
    company_name: company.name,
    company_type: "TradeAccount",
    role: title || "",
  });
}

/** Person leaves the industry: vacate their seat and clear their employer. */
export async function markPersonLeft({ person, seats, moveDate }) {
  await vacateSeat(person, seats, moveDate);
  await base44.entities.Contact.update(person.id, {
    company_id: "",
    company_name: "",
  });
}

/** Assign a temp cover to a vacant seat. */
export async function tempCoverSeat({ seat, coveringPerson }) {
  await base44.entities.RoleSeat.update(seat.id, {
    status: "Temp-covered",
    covering_person_id: coveringPerson.id,
    covering_person_name: coveringPerson.name,
  });
}

/**
 * Fill a seat with an existing person. Vacates the person's previous seat
 * (they can only sit in one) and repoints their Contact to this company.
 */
export async function fillSeat({ seat, person, seats, startDate }) {
  const dateStr = startDate || format(new Date(), "yyyy-MM-dd");
  await vacateSeat(person, seats, dateStr);
  await base44.entities.RoleSeat.update(seat.id, {
    status: "Occupied",
    person_id: person.id,
    person_name: person.name,
    covering_person_id: "",
    covering_person_name: "",
    start_date: dateStr,
    end_date: "",
  });
  await base44.entities.Contact.update(person.id, {
    company_id: seat.company_id,
    company_name: seat.company_name,
    company_type: "TradeAccount",
    role: seat.title || "",
  });
}

/**
 * Keep a person's seat title in sync with the contact form's job-title field.
 * Updates the current seat's title, or creates a seat when the person has a
 * company but no seat yet.
 */
export async function syncSeatTitle({ person, seats, title }) {
  const seat = currentSeatFor(person.id, seats);
  if (seat) {
    if ((seat.title || "") !== (title || "")) {
      await base44.entities.RoleSeat.update(seat.id, { title: title || "" });
    }
    return;
  }
  if (person.company_id && title) {
    await base44.entities.RoleSeat.create({
      company_id: person.company_id,
      company_name: person.company_name || "",
      title,
      person_id: person.id,
      person_name: person.name,
      status: "Occupied",
      start_date: format(new Date(), "yyyy-MM-dd"),
    });
  }
}
