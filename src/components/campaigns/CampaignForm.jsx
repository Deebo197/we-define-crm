import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";
const campaignTypes = ["Tour Operator Campaign", "Press Campaign", "Discount Fund", "Training/Event", "WDT-Led", "Other"];

function ToggleChips({ items, selectedIds, onToggle, color = "purple" }) {
  const colorMap = {
    purple: { active: "bg-primary/20 text-primary border-primary/30", inactive: "bg-canvas text-faint border-line hover:border-line-strong" },
    teal: { active: "bg-success/20 text-success border-success/30", inactive: "bg-canvas text-faint border-line hover:border-line-strong" },
  };
  const c = colorMap[color];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <button key={item.id} type="button" onClick={() => onToggle(item)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${selectedIds.includes(item.id) ? c.active : c.inactive}`}>
          {item.name}
        </button>
      ))}
    </div>
  );
}

function CoverageEntryRow({ entry, onChange, onRemove }) {
  return (
    <div className="bg-surface-secondary rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-muted text-xs font-medium">Coverage Entry</span>
        <button type="button" onClick={onRemove}><X className="w-4 h-4 text-faint" /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-faint text-xs mb-1">Platform / Partner *</Label>
          <Input value={entry.platform_partner} onChange={(e) => onChange({ ...entry, platform_partner: e.target.value })} className={inputClass} placeholder="e.g. Condé Nast Traveller" required />
        </div>
        <div>
          <Label className="text-faint text-xs mb-1">Date</Label>
          <Input type="date" value={entry.date} onChange={(e) => onChange({ ...entry, date: e.target.value })} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-faint text-xs mb-1">Summary</Label>
          <Input value={entry.summary} onChange={(e) => onChange({ ...entry, summary: e.target.value })} className={inputClass} placeholder="Brief description of coverage" />
        </div>
        <div>
          <Label className="text-faint text-xs mb-1">URL</Label>
          <Input value={entry.url} onChange={(e) => onChange({ ...entry, url: e.target.value })} className={inputClass} placeholder="https://..." />
        </div>
        <div>
          <Label className="text-faint text-xs mb-1">Est. Reach</Label>
          <Input type="number" value={entry.estimated_reach} onChange={(e) => onChange({ ...entry, estimated_reach: e.target.value })} className={inputClass} placeholder="0" />
        </div>
        <div>
          <Label className="text-faint text-xs mb-1">Est. Value (£)</Label>
          <Input type="number" value={entry.estimated_value} onChange={(e) => onChange({ ...entry, estimated_value: e.target.value })} className={inputClass} placeholder="0" />
        </div>
      </div>
    </div>
  );
}

export default function CampaignForm({ campaign, onSubmit, onCancel, isLoading }) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: partners = [] } = useQuery({ queryKey: ["otherpartners"], queryFn: () => base44.entities.OtherPartner.list() });

  const [form, setForm] = useState({
    name: campaign?.name || "",
    type: campaign?.type || "Tour Operator Campaign",
    linked_clients: campaign?.linked_clients || [],
    linked_client_names: campaign?.linked_client_names || [],
    linked_partners: campaign?.linked_partners || [],
    linked_partner_names: campaign?.linked_partner_names || [],
    funding_type: campaign?.funding_type || "Cash",
    budget: campaign?.budget || "",
    start_date: campaign?.start_date || "",
    end_date: campaign?.end_date || "",
    status: campaign?.status || "Planning",
    notes: campaign?.notes || "",
  });

  // Inline coverage entries (stored separately but edited inline)
  const [coverageEntries, setCoverageEntries] = useState(
    campaign?._coverage_entries || []
  );

  const toggleClient = (client) => {
    const isLinked = form.linked_clients.includes(client.id);
    setForm({
      ...form,
      linked_clients: isLinked ? form.linked_clients.filter(id => id !== client.id) : [...form.linked_clients, client.id],
      linked_client_names: isLinked ? form.linked_client_names.filter(n => n !== client.name) : [...form.linked_client_names, client.name],
    });
  };

  const togglePartner = (partner) => {
    const isLinked = form.linked_partners.includes(partner.id);
    setForm({
      ...form,
      linked_partners: isLinked ? form.linked_partners.filter(id => id !== partner.id) : [...form.linked_partners, partner.id],
      linked_partner_names: isLinked ? form.linked_partner_names.filter(n => n !== partner.name) : [...form.linked_partner_names, partner.name],
    });
  };

  const addCoverageEntry = () => {
    setCoverageEntries([...coverageEntries, { platform_partner: "", summary: "", url: "", date: "", estimated_reach: "", estimated_value: "" }]);
  };

  const updateCoverageEntry = (idx, entry) => {
    setCoverageEntries(coverageEntries.map((e, i) => i === idx ? entry : e));
  };

  const removeCoverageEntry = (idx) => {
    setCoverageEntries(coverageEntries.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const campaignData = { ...form, budget: form.budget ? Number(form.budget) : undefined };

    // Save campaign first, then upsert coverage entries
    const savedCampaignId = await onSubmit(campaignData, coverageEntries);
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-ink font-medium">{campaign ? "Edit Campaign" : "New Campaign"}</h2>
        <button onClick={onCancel} className="text-faint hover:text-ink"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Core fields */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-muted text-xs mb-1.5">Campaign Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">{campaignTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                {["Planning", "Active", "Completed", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Funding</Label>
            <Select value={form.funding_type} onValueChange={(v) => setForm({ ...form, funding_type: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                {["Cash", "Barter", "Mixed"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Budget (£)</Label>
            <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Start Date</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">End Date</Label>
            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
          </div>
        </div>

        {/* Linked Clients */}
        <div>
          <Label className="text-muted text-xs mb-2 block">Linked Clients</Label>
          <ToggleChips items={clients} selectedIds={form.linked_clients} onToggle={toggleClient} color="purple" />
        </div>

        {/* Linked Partners */}
        <div>
          <Label className="text-muted text-xs mb-2 block">Linked Partners</Label>
          {partners.length > 0 ? (
            <ToggleChips items={partners} selectedIds={form.linked_partners} onToggle={togglePartner} color="teal" />
          ) : (
            <p className="text-faint text-xs">No partners in database yet. Add them via Other Partners.</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label className="text-muted text-xs mb-1.5">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} min-h-[80px]`} />
        </div>

        {/* Coverage Entries */}
        <div className="border-t border-line pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-medium uppercase tracking-wider">Coverage Entries ({coverageEntries.length})</p>
            <Button type="button" onClick={addCoverageEntry} variant="ghost" className="text-primary text-xs h-7 px-2">
              <Plus className="w-3 h-3 mr-1" />Add Coverage
            </Button>
          </div>
          {coverageEntries.map((entry, idx) => (
            <CoverageEntryRow
              key={idx}
              entry={entry}
              onChange={(updated) => updateCoverageEntry(idx, updated)}
              onRemove={() => removeCoverageEntry(idx)}
            />
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-muted hover:text-ink">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6">
            {isLoading ? "Saving..." : campaign ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}