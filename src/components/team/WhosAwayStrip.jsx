import React, { useMemo } from "react";
import { addDays, addYears, differenceInCalendarDays, differenceInYears, format, parseISO, startOfDay } from "date-fns";
import { Cake, Star, Sun } from "lucide-react";
import { entryCoversDay, dayKey, formatDateRange } from "@/components/team/teamUtils";

// Next occurrence of a recurring date (birthday / anniversary) on or after `from`.
function nextOccurrence(dateStr, from) {
  const d = parseISO(dateStr);
  let occ = new Date(from.getFullYear(), d.getMonth(), d.getDate());
  if (occ < from) occ = addYears(occ, 1);
  return occ;
}

export default function WhosAwayStrip({ members, entries, colourOf }) {
  const today = startOfDay(new Date());

  const { away, celebrations } = useMemo(() => {
    const windowEnd = dayKey(addDays(today, 7));
    const todayKey = dayKey(today);
    const activeByEmail = new Map(
      members.filter((m) => m.status !== "Inactive" && m.email).map((m) => [m.email.toLowerCase(), m])
    );

    const away = entries
      .filter((e) => {
        if (!e.start_date) return false;
        const end = e.end_date || e.start_date;
        return e.start_date <= windowEnd && end >= todayKey && activeByEmail.has((e.team_member_email || "").toLowerCase());
      })
      .map((e) => ({ entry: e, member: activeByEmail.get(e.team_member_email.toLowerCase()) }))
      .sort((a, b) => a.entry.start_date.localeCompare(b.entry.start_date));

    const celebrations = [];
    members
      .filter((m) => m.status !== "Inactive")
      .forEach((m) => {
        if (m.birthday) {
          const occ = nextOccurrence(m.birthday, today);
          const inDays = differenceInCalendarDays(occ, today);
          if (inDays <= 14) {
            celebrations.push({ kind: "birthday", member: m, date: occ, inDays, label: `${m.full_name?.split(" ")[0]}'s birthday` });
          }
        }
        if (m.start_date) {
          const occ = nextOccurrence(m.start_date, today);
          const inDays = differenceInCalendarDays(occ, today);
          const years = differenceInYears(occ, parseISO(m.start_date));
          if (inDays <= 14 && years >= 1) {
            celebrations.push({
              kind: "anniversary", member: m, date: occ, inDays,
              label: `${m.full_name?.split(" ")[0]} — ${years} ${years === 1 ? "year" : "years"} at WDT`,
            });
          }
        }
      });
    celebrations.sort((a, b) => a.inDays - b.inDays);

    return { away, celebrations };
  }, [members, entries]); // `today` only changes daily; recompute on data change is enough

  const todayKey = dayKey(today);

  return (
    <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
      <p className="text-faint text-xs font-medium uppercase tracking-wider mb-3">Who&rsquo;s away — next 7 days</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {away.length === 0 && (
          <div className="flex items-center gap-2.5 bg-surface rounded-2xl shadow-card border border-line px-4 py-3 flex-shrink-0">
            <Sun className="w-4 h-4 text-success" />
            <span className="text-ink text-sm font-medium">Everyone&rsquo;s in</span>
          </div>
        )}
        {away.map(({ entry, member }) => {
          const awayNow = entryCoversDay(entry, todayKey);
          return (
            <div key={entry.id} className="flex items-center gap-3 bg-surface rounded-2xl shadow-card border border-line px-4 py-3 flex-shrink-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colourOf(member) }} />
              <div>
                <p className="text-ink text-sm font-medium leading-tight">{member.full_name}</p>
                <p className="text-faint text-xs leading-tight">
                  {entry.type || "Annual Leave"} · {formatDateRange(entry.start_date, entry.end_date)}
                  {awayNow ? " · away now" : ""}
                </p>
              </div>
            </div>
          );
        })}
        {celebrations.map((c) => (
          <div key={`${c.kind}-${c.member.id}`} className="flex items-center gap-2.5 bg-primary-soft/60 rounded-2xl border border-line px-4 py-3 flex-shrink-0">
            {c.kind === "birthday" ? <Cake className="w-4 h-4 text-primary" /> : <Star className="w-4 h-4 text-warning" />}
            <div>
              <p className="text-ink text-xs font-medium leading-tight">{c.label}</p>
              <p className="text-faint text-[11px] leading-tight">{c.inDays === 0 ? "Today!" : format(c.date, "EEE d MMM")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
