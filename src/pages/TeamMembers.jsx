import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/ui/PageHeader";
import ShimmerCard from "@/components/ui/ShimmerCard";
import TeamMemberForm from "@/components/team/TeamMemberForm";
import WhosAwayStrip from "@/components/team/WhosAwayStrip";
import LeaveSummaryCards from "@/components/team/LeaveSummaryCards";
import LeaveCalendar from "@/components/team/LeaveCalendar";
import LeaveEntryDialog from "@/components/team/LeaveEntryDialog";
import WorkingHoursWeek from "@/components/team/WorkingHoursWeek";
import MemberCards from "@/components/team/MemberCards";
import { DEFAULT_COLOURS, dayKey, emailsMatch, useBankHolidays } from "@/components/team/teamUtils";
import { toast } from "sonner";

// Team page: who's away, leave summary, calendar, working hours, member cards.
export default function TeamMembers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [leaveDialog, setLeaveDialog] = useState(null); // { entry } | { date }

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.list("created_date"),
  });

  const { data: leaveEntries = [] } = useQuery({
    queryKey: ["leave-entries"],
    queryFn: () => base44.entities.LeaveEntry.list("-start_date", 1000),
  });

  const { data: bankHolidays = [] } = useBankHolidays();
  const holidaySet = useMemo(() => new Set(bankHolidays.map((h) => h.date)), [bankHolidays]);

  // Assign default calendar colours on first load (written back to Base44).
  const assignedColours = useRef(false);
  useEffect(() => {
    if (assignedColours.current || members.length === 0) return;
    const missing = members.filter((m) => m.status !== "Inactive" && !m.calendar_colour);
    if (missing.length === 0) return;
    assignedColours.current = true;
    const used = new Set(members.map((m) => m.calendar_colour).filter(Boolean));
    const palette = DEFAULT_COLOURS.filter((c) => !used.has(c));
    Promise.all(
      missing.map((m, i) =>
        base44.entities.TeamMember.update(m.id, { calendar_colour: palette[i % palette.length] || DEFAULT_COLOURS[i % DEFAULT_COLOURS.length] })
      )
    )
      .then(() => queryClient.invalidateQueries({ queryKey: ["team-members"] }))
      .catch(() => { /* colours fall back to defaults in the UI */ });
  }, [members, queryClient]);

  // Stable colour lookup (uses the stored colour, falls back to palette order).
  const colourOf = useMemo(() => {
    const fallback = new Map();
    members.forEach((m, i) => fallback.set(m.id, DEFAULT_COLOURS[i % DEFAULT_COLOURS.length]));
    return (member) => member?.calendar_colour || fallback.get(member?.id) || "#C4C7D4";
  }, [members]);

  const currentMember = useMemo(
    () => members.find((m) => emailsMatch(m.email, user?.email)) || null,
    [members, user?.email]
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Team member added");
      setShowForm(false);
    },
    onError: (err) => toast.error(err.message || "Failed to add member"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Team member updated");
      setEditing(null);
      setShowForm(false);
    },
    onError: (err) => toast.error(err.message || "Failed to update member"),
  });

  const handleSubmit = (data) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="Who's away, leave, working hours & profiles"
        action={() => { setEditing(null); setShowForm(true); }}
        actionLabel="Add Member"
      />

      {showForm && (
        <TeamMemberForm
          member={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {isLoading ? (
        <ShimmerCard count={3} />
      ) : (
        <>
          <WhosAwayStrip members={members} entries={leaveEntries} colourOf={colourOf} />

          <LeaveSummaryCards members={members} entries={leaveEntries} holidaySet={holidaySet} colourOf={colourOf} />

          <LeaveCalendar
            members={members}
            entries={leaveEntries}
            holidays={bankHolidays}
            colourOf={colourOf}
            onAddEntry={(date) => setLeaveDialog({ entry: null, date })}
            onSelectEntry={(entry) => setLeaveDialog({ entry, date: null })}
          />

          <WorkingHoursWeek members={members} colourOf={colourOf} isAdmin={isAdmin} user={user} />

          <MemberCards
            members={members}
            colourOf={colourOf}
            isAdmin={isAdmin}
            onEdit={(member) => { setEditing(member); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          />
        </>
      )}

      {leaveDialog && (
        <LeaveEntryDialog
          key={leaveDialog.entry?.id || leaveDialog.date || "new"}
          open
          onClose={() => setLeaveDialog(null)}
          entry={leaveDialog.entry}
          defaultDate={leaveDialog.date || dayKey(new Date())}
          members={members}
          currentMember={currentMember}
          isAdmin={isAdmin}
          user={user}
        />
      )}
    </div>
  );
}
