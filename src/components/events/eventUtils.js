// ─── Event Planning module — shared helpers ─────────────────────────────────
// Pure utilities for the Events list, editor, itinerary template and invite.

import { format, addDays } from "date-fns";
import { TONES } from "@/lib/statusColors";
import { Briefcase, UtensilsCrossed, Wine, Plane, BedDouble, Tag } from "lucide-react";

export const EVENT_TYPES = ["Sales Trip", "Dinner", "Evening Event", "Training", "Roadshow", "Other"];
export const EVENT_STATUSES = ["Planning", "Confirmed", "Completed", "Cancelled"];
export const ITEM_KINDS = ["Meeting", "Dinner", "Evening Event", "Travel", "Hotel", "Other"];

// Event statuses deliberately diverge from the shared STATUS_TONE map
// (campaign "Planning" is warning; event "Planning" is neutral).
const EVENT_STATUS_TONE = {
  Planning: "neutral",
  Confirmed: "info",
  Completed: "success",
  Cancelled: "danger",
};

export function eventStatusPill(status) {
  const tone = TONES[EVENT_STATUS_TONE[status]] || TONES.neutral;
  return `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${tone.pill}`;
}

export const KIND_META = {
  Meeting: { icon: Briefcase, tone: "info" },
  Dinner: { icon: UtensilsCrossed, tone: "warning" },
  "Evening Event": { icon: Wine, tone: "primary" },
  Travel: { icon: Plane, tone: "neutral" },
  Hotel: { icon: BedDouble, tone: "success" },
  Other: { icon: Tag, tone: "neutral" },
};

export function kindPill(kind) {
  const meta = KIND_META[kind] || KIND_META.Other;
  const tone = TONES[meta.tone] || TONES.neutral;
  return `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${tone.pill}`;
}

// ── Dates ────────────────────────────────────────────────────────────────────

const parseDay = (d) => new Date(`${d}T00:00:00`);

export function formatDay(date, fmt = "EEEE d MMMM") {
  if (!date) return "";
  const d = parseDay(date);
  return Number.isNaN(d.getTime()) ? date : format(d, fmt);
}

export function formatDateRange(start, end) {
  if (!start) return "";
  if (!end || end === start) return formatDay(start, "EEEE d MMMM yyyy");
  const s = parseDay(start);
  const e = parseDay(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${start} — ${end}`;
  const sameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
  return sameMonth
    ? `${format(s, "d")}–${format(e, "d MMMM yyyy")}`
    : `${format(s, "d MMMM")} – ${format(e, "d MMMM yyyy")}`;
}

// Ordered list of yyyy-MM-dd dates the event spans (start..end), plus any
// stray item dates outside that range so nothing ever disappears.
export function eventDays(event) {
  const dates = new Set();
  const start = event.start_date;
  const end = event.end_date || event.start_date;
  if (start) {
    let d = parseDay(start);
    const e = parseDay(end);
    let guard = 0;
    while (!Number.isNaN(d.getTime()) && !Number.isNaN(e.getTime()) && d <= e && guard < 60) {
      dates.add(format(d, "yyyy-MM-dd"));
      d = addDays(d, 1);
      guard += 1;
    }
  }
  (event.items || []).forEach((it) => { if (it.date) dates.add(it.date); });
  return [...dates].sort();
}

export function itemsForDay(items, date) {
  return (items || [])
    .filter((it) => it.date === date)
    .sort((a, b) => (a.start_time || "99:99").localeCompare(b.start_time || "99:99"));
}

export function timeRange(item) {
  if (!item.start_time) return "";
  return item.end_time ? `${item.start_time} – ${item.end_time}` : item.start_time;
}

// ── Costs ────────────────────────────────────────────────────────────────────

export const formatGBP = (n) =>
  `£${Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function eventTotalCost(event) {
  return (event.items || []).reduce((sum, it) => sum + (Number(it.cost) || 0), 0);
}

export function dayCost(items, date) {
  return itemsForDay(items, date).reduce((sum, it) => sum + (Number(it.cost) || 0), 0);
}

// ── Address auto-fill from a TradeAccount record ─────────────────────────────

export function addressFromAccount(account) {
  return {
    address: account.address_line1 || "",
    city: [account.city, account.county].filter(Boolean).join(", "),
    postcode: account.address_postcode || "",
  };
}

export function itemAddressLine(item) {
  return [item.address, item.city, item.postcode].filter(Boolean).join(", ");
}

// ── Previously used venues (built client-side across all events) ────────────

export function collectVenues(events) {
  const map = new Map();
  (events || []).forEach((ev) =>
    (ev.items || []).forEach((it) => {
      const name = (it.venue_name || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      // Keep the entry with the most address detail
      const existing = map.get(key);
      const candidate = { name, address: it.address || "", city: it.city || "", postcode: it.postcode || "" };
      if (!existing || (!existing.address && candidate.address)) map.set(key, candidate);
    })
  );
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ── Client-facing plain-text itinerary (for pasting into email) ──────────────

export function buildItineraryText(event) {
  const lines = [];
  lines.push((event.title || "Itinerary").toUpperCase());
  if (event.start_date) lines.push(formatDateRange(event.start_date, event.end_date));
  if (event.client_names?.length) lines.push(`Prepared for ${event.client_names.join(", ")}`);
  lines.push("");
  if (event.description?.trim()) {
    lines.push(event.description.trim());
    lines.push("");
  }
  eventDays(event).forEach((date, i) => {
    const items = itemsForDay(event.items, date);
    lines.push(`DAY ${i + 1} — ${formatDay(date, "EEEE d MMMM").toUpperCase()}`);
    if (items.length === 0) {
      lines.push("  (free)");
    }
    items.forEach((it) => {
      const time = timeRange(it);
      const what = [it.kind, it.title].filter(Boolean).join(": ");
      lines.push(`  ${time ? `${time}  ` : ""}${what || "Untitled"}`);
      const where = [it.company_name || it.venue_name, itemAddressLine(it)].filter(Boolean).join(" — ");
      if (where) lines.push(`    ${where}`);
      if (it.contact_names?.length) lines.push(`    With: ${it.contact_names.join(", ")}`);
      if (it.notes?.trim()) lines.push(`    ${it.notes.trim()}`);
    });
    lines.push("");
  });
  lines.push("We Define Travel");
  return lines.join("\n");
}

// ── Invite auto-suggestions ──────────────────────────────────────────────────

export function suggestInvite(event) {
  const evening = (event.items || [])
    .filter((it) => ["Dinner", "Evening Event"].includes(it.kind))
    .sort((a, b) => `${a.date || ""}${a.start_time || ""}`.localeCompare(`${b.date || ""}${b.start_time || ""}`))[0];

  const clientLine = event.client_names?.length ? event.client_names.join(" · ") : "our hotel partners";
  const isDinner = event.event_type === "Dinner" || evening?.kind === "Dinner";

  const venueParts = evening
    ? [evening.venue_name, itemAddressLine(evening)].filter(Boolean)
    : [];
  const date = evening?.date || event.start_date;
  let dateLine = date ? formatDay(date, "EEEE d MMMM yyyy") : "";
  if (dateLine && evening?.start_time) dateLine += ` · from ${evening.start_time}`;

  return {
    headline: isDinner ? "An Invitation to Dinner" : "An Evening Invitation",
    intro: `We Define Travel, together with ${clientLine}, warmly invites you to join us for ${isDinner ? "dinner" : "an evening of conversation and connection"}.`,
    venue_line: venueParts.join(", "),
    date_line: dateLine,
    dress_code: "Smart casual",
    rsvp_line: "Kindly RSVP to your We Define Travel contact",
  };
}
