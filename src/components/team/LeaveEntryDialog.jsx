import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LEAVE_TYPES, emailsMatch, formatDateRange } from "@/components/team/teamUtils";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

// Add / view / edit / delete a LeaveEntry. Non-owners get a read-only view
// unless they are admins; only admins can book leave for someone else.
export default function LeaveEntryDialog({ open, onClose, entry, defaultDate, members, currentMember, isAdmin, user }) {
  const queryClient = useQueryClient();
  const activeMembers = members.filter((m) => m.status !== "Inactive" && m.email);

  const canEdit = !entry || isAdmin || emailsMatch(entry.team_member_email, user?.email) || emailsMatch(entry.created_by, user?.email);
  const canPickMember = isAdmin || !currentMember;

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [form, setForm] = useState(() => ({
    team_member_email: entry?.team_member_email || currentMember?.email || activeMembers[0]?.email || "",
    type: entry?.type || "Annual Leave",
    start_date: entry?.start_date || defaultDate || "",
    end_date: entry?.end_date || entry?.start_date || defaultDate || "",
    half_day_start: entry?.half_day_start || false,
    half_day_end: entry?.half_day_end || false,
    notes: entry?.notes || "",
  }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leave-entries"] });

  const save = useMutation({
    mutationFn: async () => {
      const member = activeMembers.find((m) => emailsMatch(m.email, form.team_member_email)) ||
        members.find((m) => emailsMatch(m.email, form.team_member_email));
      const data = {
        team_member_email: form.team_member_email,
        team_member_name: member?.full_name || entry?.team_member_name || "",
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        half_day_start: form.half_day_start,
        half_day_end: form.half_day_end,
        notes: form.notes,
      };
      if (entry) await base44.entities.LeaveEntry.update(entry.id, data);
      else await base44.entities.LeaveEntry.create(data);
    },
    onSuccess: () => { invalidate(); toast.success(entry ? "Leave updated" : "Leave added"); onClose(); },
    onError: (err) => toast.error(err.message || "Failed to save leave"),
  });

  const remove = useMutation({
    mutationFn: () => base44.entities.LeaveEntry.delete(entry.id),
    onSuccess: () => { invalidate(); toast.success("Leave deleted"); onClose(); },
    onError: (err) => toast.error(err.message || "Failed to delete leave"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.team_member_email) return toast.error("Choose a team member");
    if (!form.start_date) return toast.error("Choose a start date");
    if (form.end_date && form.end_date < form.start_date) return toast.error("End date can't be before start date");
    save.mutate();
  };

  const memberName = entry?.team_member_name ||
    activeMembers.find((m) => emailsMatch(m.email, form.team_member_email))?.full_name;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-surface border-line max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ink">
            {!entry ? "Add leave" : canEdit ? "Edit leave" : "Leave details"}
          </DialogTitle>
        </DialogHeader>

        {entry && !canEdit ? (
          <div className="space-y-2 text-sm">
            <p className="text-ink font-medium">{entry.team_member_name}</p>
            <p className="text-muted">{entry.type || "Annual Leave"} · {formatDateRange(entry.start_date, entry.end_date)}</p>
            {(entry.half_day_start || entry.half_day_end) && (
              <p className="text-faint text-xs">
                {entry.half_day_start && "Half day at start"}{entry.half_day_start && entry.half_day_end && " · "}{entry.half_day_end && "Half day at end"}
              </p>
            )}
            {entry.notes && <p className="text-faint text-xs whitespace-pre-wrap">{entry.notes}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="text-muted hover:text-ink">Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-muted text-xs mb-1.5">Team member</Label>
              {canPickMember ? (
                <Select value={form.team_member_email} onValueChange={(v) => setForm({ ...form, team_member_email: v })}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent className="bg-surface-elevated border-line">
                    {activeMembers.map((m) => (
                      <SelectItem key={m.id} value={m.email}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-ink text-sm font-medium py-2">{memberName}</p>
              )}
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface-elevated border-line">
                  {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted text-xs mb-1.5">Start date *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    start_date: e.target.value,
                    end_date: f.end_date && f.end_date < e.target.value ? e.target.value : f.end_date,
                  }))}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <Label className="text-muted text-xs mb-1.5">End date</Label>
                <Input type="date" value={form.end_date} min={form.start_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                <Checkbox checked={form.half_day_start} onCheckedChange={(v) => setForm({ ...form, half_day_start: !!v })} />
                Half day at start
              </label>
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                <Checkbox checked={form.half_day_end} onCheckedChange={(v) => setForm({ ...form, half_day_end: !!v })} />
                Half day at end
              </label>
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} min-h-[60px]`} />
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <div>
                {entry && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-danger hover:text-danger hover:bg-danger/10"
                    disabled={remove.isPending}
                    onClick={() => (confirmingDelete ? remove.mutate() : setConfirmingDelete(true))}
                  >
                    {remove.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                    {confirmingDelete ? "Confirm delete" : "Delete"}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} className="text-muted hover:text-ink">Cancel</Button>
                <Button type="submit" disabled={save.isPending} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6">
                  {save.isPending ? "Saving…" : entry ? "Update" : "Add leave"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
