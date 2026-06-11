import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { addDays, addWeeks, format, isToday, parseISO, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Copy, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import WorkLogDialog from "@/components/team/WorkLogDialog";
import { computeHours, dayKey, emailsMatch, formatNumber, hexWithAlpha } from "@/components/team/teamUtils";

// Week view of WorkLogs: one row per active member, Mon–Sun columns, with a
// weekly total compared against contracted hours. Sophie picks her hours here.
export default function WorkingHoursWeek({ members, colourOf, isAdmin, user }) {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialog, setDialog] = useState(null); // { log, date, member }

  const activeMembers = members.filter((m) => m.status !== "Inactive" && m.email);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekKeys = days.map(dayKey);

  const { data: logs = [] } = useQuery({
    queryKey: ["work-logs"],
    queryFn: () => base44.entities.WorkLog.list("-date", 1000),
  });

  const logsFor = (email, key) =>
    logs.filter((l) => emailsMatch(l.team_member_email, email) && l.date === key);

  const hoursOf = (log) => (typeof log.hours === "number" ? log.hours : computeHours(log.start_time, log.end_time, log.break_minutes) ?? 0);

  const copyLastWeek = useMutation({
    mutationFn: async (member) => {
      const prevKeys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(addWeeks(weekStart, -1), i)));
      const prevLogs = logs.filter((l) => emailsMatch(l.team_member_email, member.email) && prevKeys.includes(l.date));
      if (prevLogs.length === 0) throw new Error("Nothing logged last week to copy");
      const thisWeekDates = new Set(
        logs.filter((l) => emailsMatch(l.team_member_email, member.email) && weekKeys.includes(l.date)).map((l) => l.date)
      );
      const toCreate = prevLogs.filter((l) => !thisWeekDates.has(dayKey(addWeeks(parseISO(l.date), 1))));
      if (toCreate.length === 0) throw new Error("This week already has entries on those days");
      await Promise.all(
        toCreate.map((l) =>
          base44.entities.WorkLog.create({
            team_member_email: member.email,
            team_member_name: member.full_name,
            date: dayKey(addWeeks(parseISO(l.date), 1)),
            start_time: l.start_time,
            end_time: l.end_time,
            break_minutes: l.break_minutes || 0,
            hours: hoursOf(l),
            notes: l.notes || "",
          })
        )
      );
      return toCreate.length;
    },
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
      toast.success(`Copied ${n} ${n === 1 ? "entry" : "entries"} from last week`);
    },
    onError: (err) => toast.error(err.message || "Failed to copy last week"),
  });

  return (
    <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-faint text-xs font-medium uppercase tracking-wider">Working hours</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-ink rounded-lg" onClick={() => setWeekStart((w) => addWeeks(w, -1))} aria-label="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-ink text-sm font-semibold whitespace-nowrap">
            {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-ink rounded-lg" onClick={() => setWeekStart((w) => addWeeks(w, 1))} aria-label="Next week">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="h-8 px-3 rounded-lg border-line text-muted hover:text-ink text-xs" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            This week
          </Button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border border-line overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Header row */}
          <div className="grid grid-cols-[150px_repeat(7,1fr)_170px] border-b border-line">
            <div />
            {days.map((d) => (
              <div key={dayKey(d)} className={`py-2 text-center text-[11px] font-medium uppercase tracking-wider ${isToday(d) ? "text-primary" : "text-faint"}`}>
                {format(d, "EEE d")}
              </div>
            ))}
            <div className="py-2 pr-4 text-right text-[11px] font-medium uppercase tracking-wider text-faint">Week total</div>
          </div>

          {activeMembers.map((member, rowIdx) => {
            const colour = colourOf(member);
            const canEditRow = isAdmin || emailsMatch(member.email, user?.email);
            const total = weekKeys.reduce((acc, key) => acc + logsFor(member.email, key).reduce((a, l) => a + hoursOf(l), 0), 0);
            const contracted = member.contracted_hours_per_week;
            const hasContract = contracted != null && contracted !== "";
            const over = hasContract && total > Number(contracted) + 0.001;
            const exact = hasContract && Math.abs(total - Number(contracted)) <= 0.001;

            return (
              <div key={member.id} className={`grid grid-cols-[150px_repeat(7,1fr)_170px] items-stretch ${rowIdx > 0 ? "border-t border-line" : ""}`}>
                <div className="px-4 py-3 flex flex-col justify-center gap-1.5 min-w-0">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colour }} />
                    <span className="text-ink text-sm font-medium truncate">{member.full_name?.split(" ")[0]}</span>
                  </span>
                  {canEditRow && (
                    <button
                      onClick={() => copyLastWeek.mutate(member)}
                      disabled={copyLastWeek.isPending}
                      className="flex items-center gap-1 text-[11px] text-faint hover:text-primary transition-colors w-fit"
                    >
                      {copyLastWeek.isPending && copyLastWeek.variables?.id === member.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Copy className="w-3 h-3" />}
                      Copy last week
                    </button>
                  )}
                </div>
                {days.map((d) => {
                  const key = dayKey(d);
                  const dayLogs = logsFor(member.email, key);
                  const log = dayLogs[0];
                  return (
                    <div
                      key={key}
                      onClick={canEditRow ? () => setDialog({ log: log || null, date: key, member }) : undefined}
                      className={`border-l border-line p-1.5 flex items-center justify-center min-h-[58px] group
                        ${canEditRow ? "cursor-pointer hover:bg-primary-soft/30" : ""} ${isToday(d) ? "bg-primary-soft/20" : ""}`}
                    >
                      {log ? (
                        <div
                          className="rounded-lg px-2 py-1 text-center w-full"
                          style={{ background: hexWithAlpha(colour, 0.13) }}
                          title={log.notes || undefined}
                        >
                          <p className="text-[11px] leading-tight font-medium" style={{ color: colour }}>
                            {log.start_time}–{log.end_time}
                          </p>
                          <p className="text-[11px] leading-tight text-muted">{formatNumber(hoursOf(log))} h</p>
                        </div>
                      ) : (
                        canEditRow && <Plus className="w-3.5 h-3.5 text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  );
                })}
                <div className="border-l border-line px-4 py-3 flex items-center justify-end text-right">
                  <p className="text-xs text-faint leading-snug">
                    total this week:{" "}
                    <span className={`font-semibold ${over ? "text-warning" : exact ? "text-success" : "text-ink"}`}>
                      {formatNumber(total)} h
                    </span>
                    {hasContract && <> of {formatNumber(contracted)} contracted</>}
                  </p>
                </div>
              </div>
            );
          })}
          {activeMembers.length === 0 && (
            <p className="text-faint text-sm text-center py-8">No active team members</p>
          )}
        </div>
      </div>

      {dialog && (
        <WorkLogDialog
          key={`${dialog.member.id}-${dialog.date}-${dialog.log?.id || "new"}`}
          open
          onClose={() => setDialog(null)}
          log={dialog.log}
          date={dialog.date}
          member={dialog.member}
        />
      )}
    </div>
  );
}
