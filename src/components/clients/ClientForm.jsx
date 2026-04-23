import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

const inputClass = "bg-surface-secondary border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-lg focus:border-[#7F5BFF] focus:ring-[#7F5BFF]/20";
const NONE = "__none__";

export default function ClientForm({ client, onSubmit, onCancel, isLoading }) {
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.filter({ status: "Active" }),
  });

  const [form, setForm] = useState({
    name: client?.name || "",
    type: client?.type || "Hotel",
    reporting_group: client?.reporting_group || "",
    status: client?.status || "Active",
    lead_team_member_id: client?.lead_team_member_id || "",
    lead_team_member_name: client?.lead_team_member_name || "",
    supporting_team_member_ids: client?.supporting_team_member_ids || [],
    supporting_team_member_names: client?.supporting_team_member_names || [],
    notes: client?.notes || "",
    internal_notes: client?.internal_notes || "",
  });

  const handleLeadChange = (v) => {
    if (v === NONE) return setForm(f => ({ ...f, lead_team_member_id: "", lead_team_member_name: "" }));
    const m = teamMembers.find(t => t.id === v);
    setForm(f => ({ ...f, lead_team_member_id: v, lead_team_member_name: m?.full_name || "" }));
  };

  const toggleSupporting = (member) => {
    const isIn = form.supporting_team_member_ids.includes(member.id);
    setForm(f => ({
      ...f,
      supporting_team_member_ids: isIn
        ? f.supporting_team_member_ids.filter(id => id !== member.id)
        : [...f.supporting_team_member_ids, member.id],
      supporting_team_member_names: isIn
        ? f.supporting_team_member_names.filter(n => n !== member.full_name)
        : [...f.supporting_team_member_names, member.full_name],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-medium">{client ? "Edit Client" : "New Client"}</h2>
        <button onClick={onCancel} className="text-[#6C6C80] hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                <SelectItem value="Hotel">Hotel</SelectItem>
                <SelectItem value="DMC">DMC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Reporting Group</Label>
            <Input value={form.reporting_group} onChange={(e) => setForm({ ...form, reporting_group: e.target.value })} className={inputClass} placeholder="e.g. CROSSROADS" />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Onboarding">Onboarding</SelectItem>
                <SelectItem value="Paused">Paused</SelectItem>
                <SelectItem value="Ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* WDT Team */}
        {teamMembers.length > 0 && (
          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <p className="text-[#6C6C80] text-xs font-medium uppercase tracking-wider">WDT Team</p>
            <div>
              <Label className="text-[#A1A1B5] text-xs mb-1.5">Lead</Label>
              <Select value={form.lead_team_member_id || NONE} onValueChange={handleLeadChange}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Select lead…" /></SelectTrigger>
                <SelectContent className="bg-surface-elevated border-white/[0.06]">
                  <SelectItem value={NONE}>None</SelectItem>
                  {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}{m.job_title ? ` — ${m.job_title}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#A1A1B5] text-xs mb-1.5">Supporting</Label>
              <div className="flex flex-wrap gap-2">
                {teamMembers.map(m => (
                  <button key={m.id} type="button" onClick={() => toggleSupporting(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      form.supporting_team_member_ids.includes(m.id)
                        ? "bg-[#7F5BFF]/20 text-[#7F5BFF] border-[#7F5BFF]/30"
                        : "bg-white/[0.02] text-[#6C6C80] border-white/[0.06] hover:border-white/[0.12]"
                    }`}>
                    {m.full_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} min-h-[80px]`} />
        </div>
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Internal Notes</Label>
          <Textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} className={`${inputClass} min-h-[80px]`} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-[#A1A1B5] hover:text-white">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-6">
            {isLoading ? "Saving..." : client ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}