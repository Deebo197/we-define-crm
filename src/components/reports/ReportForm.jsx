import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { isCrossroads } from "./reportUtils";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

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
    <div className="bg-surface rounded-2xl shadow-card border border-line p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-ink font-medium">New Report</h2>
        <button onClick={onCancel} className="text-faint hover:text-ink"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Config row */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-muted text-xs mb-1.5">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} required placeholder="e.g. April 2025 — Hard Rock" />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Client</Label>
            <Select value={form.client_id} onValueChange={handleClientChange}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Month</Label>
            <Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className={inputClass} />
          </div>
        </div>

        {/* CROSSROADS grouped toggle */}
        {form.client_id && isCrossroads(form.client_name) && crossroadsClients.length > 1 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20">
            <div className="flex-1">
              <p className="text-warning text-xs font-semibold">CROSSROADS Grouped Report</p>
              <p className="text-faint text-xs mt-0.5">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.is_grouped ? "bg-warning/20 text-warning border-warning/30" : "bg-canvas text-faint border-line hover:border-line-strong"}`}>
              {form.is_grouped ? "Grouped ✓" : "Group as CROSSROADS"}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <p className="text-faint text-xs">Creates the report backbone plus Internal and Client versions — open the report to draft content.</p>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onCancel} className="text-muted hover:text-ink">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6">
              {isLoading ? "Creating…" : "Create Report"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
