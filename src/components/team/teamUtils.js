// ─── Team page shared helpers ────────────────────────────────────────────────
// Bank holidays, leave day-counting and working-hours computation live here so
// the calendar, summary cards and working-hours grid all agree on the maths.
import { useQuery } from "@tanstack/react-query";
import { addDays, format, isSameDay, isWeekend, parseISO } from "date-fns";

// Default calendar colours assigned to members on first load (written back to
// the TeamMember record so they stay stable).
export const DEFAULT_COLOURS = ["#5A3DE6", "#00C875", "#FDAB3D", "#579BFC", "#E2445C", "#9CD326"];

export const LEAVE_TYPES = ["Annual Leave", "Sick", "Business Travel", "Other"];

// Hardcoded England & Wales fallback if gov.uk is unreachable.
export const FALLBACK_BANK_HOLIDAYS_2026 = [
  { date: "2026-01-01", title: "New Year's Day" },
  { date: "2026-04-03", title: "Good Friday" },
  { date: "2026-04-06", title: "Easter Monday" },
  { date: "2026-05-04", title: "Early May bank holiday" },
  { date: "2026-05-25", title: "Spring bank holiday" },
  { date: "2026-08-31", title: "Summer bank holiday" },
  { date: "2026-12-25", title: "Christmas Day" },
  { date: "2026-12-28", title: "Boxing Day (substitute day)" },
];

// UK bank holidays (England & Wales) — cached forever for the session.
export function useBankHolidays() {
  return useQuery({
    queryKey: ["uk-bank-holidays"],
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    queryFn: async () => {
      try {
        const res = await fetch("https://www.gov.uk/bank-holidays.json");
        if (!res.ok) throw new Error("Bad response");
        const json = await res.json();
        const events = json?.["england-and-wales"]?.events;
        if (!Array.isArray(events) || events.length === 0) throw new Error("No events");
        return events.map((e) => ({ date: e.date, title: e.title }));
      } catch {
        return FALLBACK_BANK_HOLIDAYS_2026;
      }
    },
  });
}

export const dayKey = (d) => format(d, "yyyy-MM-dd");

// Does a leave entry cover a given yyyy-MM-dd day? (string compare is safe)
export function entryCoversDay(entry, key) {
  const end = entry.end_date || entry.start_date;
  return entry.start_date <= key && key <= end;
}

// Count leave days for one entry, clamped to [rangeStart, rangeEnd].
// Rules: weekdays only, bank holidays excluded, half_day_start / half_day_end
// subtract 0.5 each (only when that boundary day actually counted).
export function countLeaveDays(entry, holidaySet, rangeStart, rangeEnd) {
  if (!entry.start_date) return 0;
  const start = parseISO(entry.start_date);
  const end = parseISO(entry.end_date || entry.start_date);
  if (end < start) return 0;
  let days = 0;
  let startCounted = false;
  let endCounted = false;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (rangeStart && d < rangeStart) continue;
    if (rangeEnd && d > rangeEnd) continue;
    if (isWeekend(d)) continue;
    if (holidaySet.has(dayKey(d))) continue;
    days += 1;
    if (isSameDay(d, start)) startCounted = true;
    if (isSameDay(d, end)) endCounted = true;
  }
  if (entry.half_day_start && startCounted) days -= 0.5;
  if (entry.half_day_end && endCounted) days -= 0.5;
  return Math.max(0, days);
}

// "HH:MM" → minutes since midnight, or null.
export function timeToMinutes(t) {
  if (!t || typeof t !== "string") return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Hours = end − start − break, never negative, 2 dp.
export function computeHours(startTime, endTime, breakMinutes = 0) {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (s == null || e == null) return null;
  const mins = e - s - (Number(breakMinutes) || 0);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0;
}

// 7.5 → "7.5", 8 → "8"
export function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return "0";
  return String(parseFloat(Number(n).toFixed(2)));
}

export function hexWithAlpha(hex, alpha) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(196,199,212,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Inline style for a leave bar by type.
export function leaveBarStyle(type, colour) {
  switch (type) {
    case "Business Travel":
      return {
        border: `1.5px solid ${colour}`,
        background: `repeating-linear-gradient(45deg, ${hexWithAlpha(colour, 0.3)} 0px, ${hexWithAlpha(colour, 0.3)} 3px, transparent 3px, transparent 7px)`,
      };
    case "Sick":
      return { border: `1.5px dotted ${colour}`, background: hexWithAlpha(colour, 0.45) };
    case "Other":
      return { background: "#C4C7D4" };
    default: // Annual Leave
      return { background: colour };
  }
}

export function memberInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export function emailsMatch(a, b) {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

// "12–16 Jan" or "30 Jan – 2 Feb" (or "12 Jan" for one day)
export function formatDateRange(startStr, endStr) {
  const start = parseISO(startStr);
  const end = parseISO(endStr || startStr);
  if (isSameDay(start, end)) return format(start, "d MMM");
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, "d")}–${format(end, "d MMM")}`;
  }
  return `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
}
