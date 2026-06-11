import React, { useMemo, useState } from "react";
import {
  addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, getDaysInMonth,
  isSameMonth, isToday, isWeekend, startOfMonth, startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dayKey, emailsMatch, entryCoversDay, hexWithAlpha, leaveBarStyle } from "@/components/team/teamUtils";

// Month grid (default) + compact year overview. Leave renders as horizontal
// bars in each member's calendar colour; bank holidays get a faint primary dot.
export default function LeaveCalendar({ members, entries, holidays, colourOf, onAddEntry, onSelectEntry }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState("month"); // "month" | "year"

  const laneMembers = useMemo(() => members.filter((m) => m.status !== "Inactive" && m.email), [members]);
  const holidayMap = useMemo(() => new Map((holidays || []).map((h) => [h.date, h.title])), [holidays]);

  const entriesFor = (member, key) =>
    entries.filter((e) => emailsMatch(e.team_member_email, member.email) && entryCoversDay(e, key));

  return (
    <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-faint text-xs font-medium uppercase tracking-wider">Calendar</p>
        <div className="flex items-center gap-2">
          {view === "month" && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-ink rounded-lg" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-ink text-sm font-semibold w-32 text-center">{format(month, "MMMM yyyy")}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-ink rounded-lg" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="h-8 px-3 rounded-lg border-line text-muted hover:text-ink text-xs" onClick={() => setMonth(startOfMonth(new Date()))}>
                Today
              </Button>
            </>
          )}
          {view === "year" && <span className="text-ink text-sm font-semibold">{format(month, "yyyy")}</span>}
          <div className="flex rounded-lg border border-line overflow-hidden ml-1">
            {["month", "year"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 h-8 text-xs font-medium transition-colors ${view === v ? "bg-primary text-white" : "bg-surface text-muted hover:text-ink"}`}
              >
                {v === "month" ? "Month" : "Year"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 text-[11px] text-faint">
        {laneMembers.map((m) => (
          <span key={m.id} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: colourOf(m) }} />
            {m.full_name?.split(" ")[0]}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-2"><span className="w-4 h-[7px] rounded-full" style={{ background: "#9699A6" }} /> Annual Leave</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-[7px] rounded-full" style={leaveBarStyle("Business Travel", "#9699A6")} /> Business Travel</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-[7px] rounded-full" style={leaveBarStyle("Sick", "#9699A6")} /> Sick</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-[7px] rounded-full" style={leaveBarStyle("Other")} /> Other</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary/40" /> Bank holiday</span>
      </div>

      {view === "month" ? (
        <MonthGrid
          month={month}
          laneMembers={laneMembers}
          colourOf={colourOf}
          entriesFor={entriesFor}
          holidayMap={holidayMap}
          onAddEntry={onAddEntry}
          onSelectEntry={onSelectEntry}
        />
      ) : (
        <YearOverview
          year={month.getFullYear()}
          laneMembers={laneMembers}
          colourOf={colourOf}
          entries={entries}
          holidayMap={holidayMap}
          onPickMonth={(m) => { setMonth(m); setView("month"); }}
        />
      )}
    </div>
  );
}

function MonthGrid({ month, laneMembers, colourOf, entriesFor, holidayMap, onAddEntry, onSelectEntry }) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-faint">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const key = dayKey(day);
          const inMonth = isSameMonth(day, month);
          const holiday = holidayMap.get(key);
          const weekend = isWeekend(day);
          return (
            <div
              key={key}
              onClick={() => onAddEntry(key)}
              className={`min-h-[88px] border-line cursor-pointer transition-colors hover:bg-primary-soft/30
                ${i % 7 !== 0 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""}
                ${weekend ? "bg-canvas/70" : ""} ${inMonth ? "" : "opacity-45"}`}
              title={holiday || undefined}
            >
              <div className="flex items-center justify-end gap-1 px-1.5 pt-1.5 pb-1">
                {holiday && <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" title={holiday} />}
                <span
                  className={`text-xs leading-none ${isToday(day)
                    ? "bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center font-semibold -my-0.5"
                    : inMonth ? "text-muted" : "text-faint"}`}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="pb-1.5">
                {laneMembers.map((member) => {
                  const dayEntries = entriesFor(member, key);
                  const entry = dayEntries[0];
                  return (
                    <div key={member.id} className="h-[11px] mb-[3px] flex items-center">
                      {entry && (
                        <BarSegment
                          entry={entry}
                          colour={colourOf(member)}
                          dayStr={key}
                          memberName={member.full_name}
                          onClick={(ev) => { ev.stopPropagation(); onSelectEntry(entry); }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarSegment({ entry, colour, dayStr, memberName, onClick }) {
  const endDate = entry.end_date || entry.start_date;
  const isStart = entry.start_date === dayStr;
  const isEnd = endDate === dayStr;
  const halfStart = isStart && entry.half_day_start;
  const halfEnd = isEnd && entry.half_day_end;
  const half = halfStart || halfEnd;

  // Half-width bars: a half start day fills the latter part of the day, a
  // half end day fills the earlier part — so the bar joins its neighbours.
  let align = "";
  if (halfStart && halfEnd) align = "mx-auto";
  else if (halfStart) align = "ml-auto";
  else if (halfEnd) align = "mr-auto";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(e); }}
      title={`${memberName} · ${entry.type || "Annual Leave"} (${entry.start_date}${endDate !== entry.start_date ? ` → ${endDate}` : ""})`}
      className={`h-[9px] cursor-pointer hover:opacity-75 transition-opacity ${half ? "w-1/2" : "w-full"} ${align}
        ${isStart || halfEnd ? "rounded-l-full" : ""} ${isEnd || halfStart ? "rounded-r-full" : ""}`}
      style={leaveBarStyle(entry.type || "Annual Leave", colour)}
    />
  );
}

function YearOverview({ year, laneMembers, colourOf, entries, holidayMap, onPickMonth }) {
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {months.map((monthStart) => {
        const total = getDaysInMonth(monthStart);
        const offset = (monthStart.getDay() + 6) % 7; // Monday-first
        return (
          <button
            key={monthStart.getMonth()}
            onClick={() => onPickMonth(monthStart)}
            className="bg-surface rounded-2xl shadow-card border border-line p-3 text-left hover:border-line-strong transition-colors"
          >
            <p className="text-ink text-xs font-semibold mb-2">{format(monthStart, "MMMM")}</p>
            <div className="grid grid-cols-7 gap-[3px]">
              {Array.from({ length: offset }).map((_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: total }, (_, i) => {
                const day = addDays(monthStart, i);
                const key = dayKey(day);
                const colours = laneMembers
                  .filter((m) => entries.some((e) => emailsMatch(e.team_member_email, m.email) && entryCoversDay(e, key)))
                  .map((m) => colourOf(m));
                const holiday = holidayMap.get(key);
                let style;
                if (colours.length === 1) style = { background: hexWithAlpha(colours[0], 0.85) };
                else if (colours.length > 1) style = { background: `linear-gradient(135deg, ${colours.map((c, ci) => `${c} ${(ci / colours.length) * 100}% ${((ci + 1) / colours.length) * 100}%`).join(", ")})` };
                return (
                  <span
                    key={key}
                    title={holiday || undefined}
                    className={`aspect-square rounded-[3px] ${colours.length ? "" : holiday ? "bg-primary-soft" : isWeekend(day) ? "bg-canvas" : "bg-surface-secondary"} ${isToday(day) ? "ring-1 ring-primary" : ""}`}
                    style={style}
                  />
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
