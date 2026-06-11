import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { isCrossroads } from "./reportUtils";

const inputClass = "bg-surface-secondary border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-lg focus:border-[#7F5BFF] focus:ring-[#7F5BFF]/20";

// Creates the report backbone — narrative content lives on the two
// ReportVersions and is edited in the report editor after creation.
export default function ReportForm({ onSubmit, onCancel, isLoading }) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });

  // Determine which clients share a reporting group (CROSSROADS)
  const crossroadsClients = clients.filter(c => isCrossroads(c.name));

  const [form, setForm] = useState({
    title: "",
    client_id: "",
    client_name: "",
    month: new Date().toISOString().slice(0, 7),
    status: "Draft",
    is_grouped: false,
    grouped_client_ids: [],
  });

  const handleClientChange = (v) => {
    const client = clients.find(c => c.id === v);
    // If selecting a CROSSROADS client, default to the grouped report
    const isGroup = isCrossroads(client?.name);
    const groupedIds = isGroup ? crossroadsClients.map(c => c.id) : [v];
    setForm(f => ({
      ...f,
      client_id: v,
      client_name: client?.name || "",
      is_grouped: isGroup,
      grouped_client_ids: groupedIds,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-medium">New Report</h2>
        <button onClick={onCancel} className="text-[#6C6C80] hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Config row */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} required placeholder="e.g. April 2025 — Hard Rock" />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Client</Label>
            <Select value={form.client_id} onValueChange={handleClientChange}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Month</Label>
            <Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className={inputClass} />
          </div>
        </div>

        {/* CROSSROADS grouped toggle */}
        {form.client_id && isCrossroads(form.client_name) && crossroadsClients.length > 1 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FFB547]/5 border border-[#FFB547]/20">
            <div className="flex-1">
              <p className="text-[#FFB547] text-xs font-semibold">CROSSROADS Grouped Report</p>
              <p className="text-[#6C6C80] text-xs mt-0.5">
                {form.is_grouped
                  ? `Covering ${crossroadsClients.map(c => c.name).join(" & ")} under CROSSROADS`
                  : `Report for ${form.client_name} only`}
              </p>
            </div>
            <button type="button" onClick={() => setForm(f => ({
              ...f,
              is_grouped: !f.is_grouped,
              grouped_client_ids: !f.is_grouped ? crossroadsClients.map(c => c.id) : [f.client_id],
            }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.is_grouped ? "bg-[#FFB547]/20 text-[#FFB547] border-[#FFB547]/30" : "bg-white/[0.02] text-[#6C6C80] border-white/[0.06] hover:border-white/[0.12]"}`}>
              {form.is_grouped ? "Grouped ✓" : "Group as CROSSROADS"}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <p className="text-[#6C6C80] text-xs">Creates the report backbone plus Internal and Client versions — open the report to draft content.</p>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onCancel} className="text-[#A1A1B5] hover:text-white">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-6">
              {isLoading ? "Creating…" : "Create Report"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
