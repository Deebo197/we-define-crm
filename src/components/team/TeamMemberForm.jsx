import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { DEFAULT_COLOURS } from "@/components/team/teamUtils";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

export default function TeamMemberForm({ member, onSubmit, onCancel, isLoading }) {
  const [form, setForm] = useState({
    full_name: member?.full_name || "",
    job_title: member?.job_title || "",
    email: member?.email || "",
    phone: member?.phone || "",
    status: member?.status || "Active",
    birthday: member?.birthday || "",
    start_date: member?.start_date || "",
    annual_leave_allowance: member?.annual_leave_allowance ?? "",
    contracted_hours_per_week: member?.contracted_hours_per_week ?? "",
    calendar_colour: member?.calendar_colour || "",
    notes: member?.notes || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      birthday: form.birthday || null,
      start_date: form.start_date || null,
      annual_leave_allowance: form.annual_leave_allowance === "" ? null : Number(form.annual_leave_allowance),
      contracted_hours_per_week: form.contracted_hours_per_week === "" ? null : Number(form.contracted_hours_per_week),
    });
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-ink font-medium">{member ? "Edit Team Member" : "New Team Member"}</h2>
        <button onClick={onCancel} className="text-faint hover:text-ink"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted text-xs mb-1.5">Full Name *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Job Title</Label>
            <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className={inputClass} placeholder="e.g. Account Manager" />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Birthday</Label>
            <Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Start Date</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Annual Leave Allowance (days)</Label>
            <Input type="number" min="0" step="0.5" value={form.annual_leave_allowance} onChange={(e) => setForm({ ...form, annual_leave_allowance: e.target.value })} className={inputClass} placeholder="e.g. 25" />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Contracted Hours / Week</Label>
            <Input type="number" min="0" step="0.5" value={form.contracted_hours_per_week} onChange={(e) => setForm({ ...form, contracted_hours_per_week: e.target.value })} className={inputClass} placeholder="e.g. 37.5" />
          </div>
        </div>
        <div>
          <Label className="text-muted text-xs mb-1.5">Calendar Colour</Label>
          <div className="flex items-center gap-2">
            {DEFAULT_COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, calendar_colour: c })}
                className={`w-7 h-7 rounded-full transition-transform ${form.calendar_colour === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-110"}`}
                style={{ background: c }}
                aria-label={`Colour ${c}`}
              />
            ))}
            <input
              type="color"
              value={form.calendar_colour || "#5A3DE6"}
              onChange={(e) => setForm({ ...form, calendar_colour: e.target.value })}
              className="w-7 h-7 rounded-full border border-line cursor-pointer bg-transparent"
              title="Custom colour"
            />
          </div>
        </div>
        <div>
          <Label className="text-muted text-xs mb-1.5">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} min-h-[70px]`} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-muted hover:text-ink">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6">
            {isLoading ? "Saving..." : member ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}