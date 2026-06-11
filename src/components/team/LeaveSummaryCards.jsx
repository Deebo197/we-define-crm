import React, { useMemo } from "react";
import { endOfYear, startOfYear } from "date-fns";
import { countLeaveDays, emailsMatch, formatNumber, hexWithAlpha } from "@/components/team/teamUtils";

// One card per active member: annual leave taken this calendar year vs
// allowance, with sick / business travel as secondary counts.
export default function LeaveSummaryCards({ members, entries, holidaySet, colourOf }) {
  const year = new Date().getFullYear();

  const stats = useMemo(() => {
    const rangeStart = startOfYear(new Date(year, 0, 1));
    const rangeEnd = endOfYear(new Date(year, 0, 1));
    return members
      .filter((m) => m.status !== "Inactive")
      .map((member) => {
        const mine = entries.filter((e) => emailsMatch(e.team_member_email, member.email));
        const sum = (type) =>
          mine
            .filter((e) => (e.type || "Annual Leave") === type)
            .reduce((acc, e) => acc + countLeaveDays(e, holidaySet, rangeStart, rangeEnd), 0);
        return { member, annual: sum("Annual Leave"), sick: sum("Sick"), travel: sum("Business Travel") };
      });
  }, [members, entries, holidaySet, year]);

  if (stats.length === 0) return null;

  return (
    <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
      <p className="text-faint text-xs font-medium uppercase tracking-wider mb-3">Leave {year}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ member, annual, sick, travel }) => {
          const colour = colourOf(member);
          const allowance = member.annual_leave_allowance;
          const hasAllowance = allowance != null && allowance !== "";
          const pct = hasAllowance && allowance > 0 ? Math.min(100, (annual / allowance) * 100) : 0;
          const over = hasAllowance && annual > allowance;
          return (
            <div key={member.id} className="bg-surface rounded-2xl shadow-card border border-line p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colour }} />
                  <span className="text-ink text-sm font-medium truncate">{member.full_name}</span>
                </div>
                {hasAllowance ? (
                  <span className={`text-sm font-semibold whitespace-nowrap ${over ? "text-danger" : "text-ink"}`}>
                    {formatNumber(annual)} / {formatNumber(allowance)} days
                  </span>
                ) : (
                  <span className="text-faint text-xs whitespace-nowrap">taken: {formatNumber(annual)} days · allowance not set</span>
                )}
              </div>
              {hasAllowance && (
                <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: over ? "#E2445C" : colour }}
                  />
                </div>
              )}
              <div className="flex gap-3 text-xs text-faint">
                <span>Sick: <span className="text-muted font-medium">{formatNumber(sick)}</span></span>
                <span>Business travel: <span className="text-muted font-medium">{formatNumber(travel)}</span></span>
                {hasAllowance && !over && (
                  <span className="ml-auto" style={{ color: hexWithAlpha(colour, 0.9) }}>{formatNumber(allowance - annual)} left</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
