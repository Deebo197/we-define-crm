import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";
const NONE = "__none__";

export default function ClientForm({ client, onSubmit, onCancel, isLoading }) {
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.filter({ status: "Active" }),
  });

  const [form, setForm] = useState({
    name: client?.name ?? "",
    type: client?.type ?? "Hotel",
    reporting_group: client?.reporting_group ?? "",
    status: client?.status ?? "Active",
    lead_team_member_id: client?.lead_team_member_id ?? "",
    lead_team_member_name: client?.lead_team_member_name ?? "",
    supporting_team_member_ids: client?.supporting_team_member_ids ?? [],
    supporting_team_member_names: client?.supporting_team_member_names ?? [],
    notes: client?.notes ?? "",
    internal_notes: client?.internal_notes ?? "",
  });

  const handleLeadChange = (v) => {
    if (v === NONE) {
      setForm(f => ({ ...f, lead_team_member_id: "", lead_team_member_name: "" }));
      return;
    }
    const m = teamMembers.find(t => t.id === v);
    setForm(f => ({ ...f, lead_team_member_id: v, lead_team_member_name: m?.full_name ?? "" }));
  };

  const toggleSupporting = (member) => {
    const isIn = (form.supporting_team_member_ids ?? []).includes(member.id);
    setForm(f => ({
      ...f,
      supporting_team_member_ids: isIn
        ? (f.supporting_team_member_ids ?? []).filter(id => id !== member.id)
        : [...(f.supporting_team_member_ids ?? []), member.id],
      supporting_team_member_names: isIn
        ? (f.supporting_team_member_names ?? []).filter(n => n !== member.full_name)
        : [...(f.supporting_team_member_names ?? []), member.full_name],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-ink font-medium">{client ? "Edit Client" : "New Client"}</h2>
        <button type="button" onClick={onCancel} className="text-faint hover:text-ink transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted text-xs mb-1.5">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputClass}
              required
              placeholder="Client name"
            />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                <SelectItem value="Hotel">Hotel</SelectItem>
                <SelectItem value="DMC">DMC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Reporting Group</Label>
            <Input
              value={form.reporting_group}
              onChange={(e) => setForm(f => ({ ...f, reporting_group: e.target.value }))}
              className={inputClass}
              placeholder="e.g. CROSSROADS"
            />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Onboarding">Onboarding</SelectItem>
                <SelectItem value="Paused">Paused</SelectItem>
                <SelectItem value="Ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {teamMembers.length > 0 && (
          <div className="border-t border-line pt-4 space-y-3">
            <p className="text-faint text-xs font-medium uppercase tracking-wider">WDT Team</p>
            <div>
              <Label className="text-muted text-xs mb-1.5">Lead</Label>
              <Select value={form.lead_team_member_id || NONE} onValueChange={handleLeadChange}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Select lead…" /></SelectTrigger>
                <SelectContent className="bg-surface-elevated border-line">
                  <SelectItem value={NONE}>None</SelectItem>
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}{m.job_title ? ` — ${m.job_title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Supporting</Label>
              <div className="flex flex-wrap gap-2">
                {teamMembers.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleSupporting(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      (form.supporting_team_member_ids ?? []).includes(m.id)
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-canvas text-faint border-line hover:border-line-strong"
                    }`}
                  >
                    {m.full_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <Label className="text-muted text-xs mb-1.5">Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            className={`${inputClass} min-h-[80px]`}
          />
        </div>
        <div>
          <Label className="text-muted text-xs mb-1.5">Internal Notes</Label>
          <Textarea
            value={form.internal_notes}
            onChange={(e) => setForm(f => ({ ...f, internal_notes: e.target.value }))}
            className={`${inputClass} min-h-[80px]`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-muted hover:text-ink">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6"
          >
            {isLoading ? "Saving..." : client ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}