import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { computeHours, formatNumber } from "@/components/team/teamUtils";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

// Add / edit / delete a WorkLog for one member on one day.
// Hours are computed live (end − start − break) and stored on save.
export default function WorkLogDialog({ open, onClose, log, date, member }) {
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [form, setForm] = useState(() => ({
    start_time: log?.start_time || "09:00",
    end_time: log?.end_time || "17:00",
    break_minutes: log?.break_minutes ?? 0,
    notes: log?.notes || "",
  }));

  const hours = computeHours(form.start_time, form.end_time, form.break_minutes);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["work-logs"] });

  const save = useMutation({
    mutationFn: async () => {
      const data = {
        team_member_email: member.email,
        team_member_name: member.full_name,
        date,
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: Number(form.break_minutes) || 0,
        hours: hours ?? 0,
        notes: form.notes,
      };
      if (log) await base44.entities.WorkLog.update(log.id, data);
      else await base44.entities.WorkLog.create(data);
    },
    onSuccess: () => { invalidate(); toast.success(log ? "Hours updated" : "Hours logged"); onClose(); },
    onError: (err) => toast.error(err.message || "Failed to save hours"),
  });

  const remove = useMutation({
    mutationFn: () => base44.entities.WorkLog.delete(log.id),
    onSuccess: () => { invalidate(); toast.success("Entry deleted"); onClose(); },
    onError: (err) => toast.error(err.message || "Failed to delete entry"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.start_time || !form.end_time) return toast.error("Start and end times are required");
    if (hours === 0) return toast.error("End time must be after start time (plus break)");
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm bg-surface border-line max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ink">
            {log ? "Edit hours" : "Log hours"} — {member.full_name?.split(" ")[0]}, {format(parseISO(date), "EEE d MMM")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted text-xs mb-1.5">Start *</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">End *</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputClass} required />
            </div>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Break (minutes)</Label>
            <Input type="number" min="0" step="5" value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: e.target.value })} className={inputClass} />
          </div>
          <div className="bg-surface-secondary rounded-lg px-3 py-2 text-sm flex items-center justify-between">
            <span className="text-faint text-xs">Hours</span>
            <span className="text-ink font-semibold">{hours == null ? "—" : `${formatNumber(hours)} h`}</span>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} min-h-[50px]`} />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {log && (
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
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
