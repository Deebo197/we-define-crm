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
const campaignTypes = ["Tour Operator Campaign", "Press Campaign", "Discount Fund", "Training/Event", "WDT-Led", "Other"];

export default function CampaignForm({ campaign, onSubmit, onCancel, isLoading }) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });

  const [form, setForm] = useState({
    name: campaign?.name || "",
    type: campaign?.type || "Tour Operator Campaign",
    linked_clients: campaign?.linked_clients || [],
    linked_client_names: campaign?.linked_client_names || [],
    funding_type: campaign?.funding_type || "Cash",
    budget: campaign?.budget || "",
    start_date: campaign?.start_date || "",
    end_date: campaign?.end_date || "",
    status: campaign?.status || "Planning",
    notes: campaign?.notes || "",
  });

  const toggleClient = (client) => {
    const isLinked = form.linked_clients.includes(client.id);
    setForm({
      ...form,
      linked_clients: isLinked ? form.linked_clients.filter(id => id !== client.id) : [...form.linked_clients, client.id],
      linked_client_names: isLinked ? form.linked_client_names.filter(n => n !== client.name) : [...form.linked_client_names, client.name],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, budget: form.budget ? Number(form.budget) : undefined });
  };

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-medium">{campaign ? "Edit Campaign" : "New Campaign"}</h2>
        <button onClick={onCancel} className="text-[#6C6C80] hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Campaign Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">{campaignTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                {["Planning", "Active", "Completed", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Funding</Label>
            <Select value={form.funding_type} onValueChange={(v) => setForm({ ...form, funding_type: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                {["Cash", "Barter", "Mixed"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Budget (£)</Label>
            <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Start Date</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">End Date</Label>
            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Linked Clients</Label>
          <div className="flex flex-wrap gap-2">
            {clients.map(client => (
              <button key={client.id} type="button" onClick={() => toggleClient(client)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${form.linked_clients.includes(client.id) ? "bg-[#7F5BFF]/20 text-[#7F5BFF] border border-[#7F5BFF]/30" : "bg-white/[0.02] text-[#6C6C80] border border-white/[0.06] hover:border-white/[0.12]"}`}>
                {client.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} min-h-[80px]`} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-[#A1A1B5] hover:text-white">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-6">
            {isLoading ? "Saving..." : campaign ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}