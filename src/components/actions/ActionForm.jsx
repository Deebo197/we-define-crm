import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActivePeople } from "@/api/people";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";
const statuses = ["To Do", "In Progress", "Completed", "Waiting on Partner", "Waiting on Client", "Cancelled"];
const priorities = ["Low", "Medium", "High", "Urgent"];
const NONE = "__none__";

export default function ActionForm({ action, onSubmit, onCancel, isLoading }) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => listActivePeople() });
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => base44.entities.Campaign.list() });
  const { data: interactions = [] } = useQuery({ queryKey: ["interactions"], queryFn: () => base44.entities.Interaction.list("-date", 100) });
  const { data: teamMembers = [] } = useQuery({ queryKey: ["team-members"], queryFn: () => base44.entities.TeamMember.filter({ status: "Active" }) });

  const [form, setForm] = useState({
    description: action?.description || "",
    owner: action?.owner || "",
    due_date: action?.due_date || "",
    status: action?.status || "To Do",
    priority: action?.priority || "Medium",
    linked_interaction: action?.linked_interaction || "",
    linked_interaction_title: action?.linked_interaction_title || "",
    linked_client: action?.linked_client || "",
    linked_client_name: action?.linked_client_name || "",
    linked_company_id: action?.linked_company_id || "",
    linked_company_name: action?.linked_company_name || "",
    linked_contact_id: action?.linked_contact_id || "",
    linked_contact_name: action?.linked_contact_name || "",
    linked_campaign: action?.linked_campaign || "",
    linked_campaign_name: action?.linked_campaign_name || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Clean NONE sentinels before saving
    const cleaned = { ...form };
    if (cleaned.linked_interaction === NONE) { cleaned.linked_interaction = ""; cleaned.linked_interaction_title = ""; }
    if (cleaned.linked_client === NONE) { cleaned.linked_client = ""; cleaned.linked_client_name = ""; }
    if (cleaned.linked_contact_id === NONE) { cleaned.linked_contact_id = ""; cleaned.linked_contact_name = ""; }
    if (cleaned.linked_campaign === NONE) { cleaned.linked_campaign = ""; cleaned.linked_campaign_name = ""; }
    onSubmit(cleaned);
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-ink font-medium">{action ? "Edit Action" : "New Action"}</h2>
        <button onClick={onCancel} className="text-faint hover:text-ink"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-muted text-xs mb-1.5">Description *</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} min-h-[60px]`} required placeholder="What needs to be done?" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted text-xs mb-1.5">Owner</Label>
            <Select value={form.owner || NONE} onValueChange={(v) => setForm({ ...form, owner: v === NONE ? "" : v })}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Assign to…" /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {teamMembers.map(m => <SelectItem key={m.id} value={m.full_name}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Due Date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                {priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Relationships */}
        <div className="border-t border-line pt-4 space-y-3">
          <p className="text-faint text-xs font-medium uppercase tracking-wider">Link To</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Linked Client */}
            <div>
              <Label className="text-muted text-xs mb-1.5">Client</Label>
              <Select value={form.linked_client || NONE} onValueChange={(v) => {
                if (v === NONE) return setForm({ ...form, linked_client: "", linked_client_name: "" });
                const c = clients.find(x => x.id === v);
                setForm({ ...form, linked_client: v, linked_client_name: c?.name || "" });
              }}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="bg-surface-elevated border-line">
                  <SelectItem value={NONE}>None</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Linked Contact */}
            <div>
              <Label className="text-muted text-xs mb-1.5">Contact</Label>
              <Select value={form.linked_contact_id || NONE} onValueChange={(v) => {
                if (v === NONE) return setForm({ ...form, linked_contact_id: "", linked_contact_name: "" });
                const c = contacts.find(x => x.id === v);
                setForm({ ...form, linked_contact_id: v, linked_contact_name: c?.name || "" });
              }}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="bg-surface-elevated border-line">
                  <SelectItem value={NONE}>None</SelectItem>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.company_name ? ` — ${c.company_name}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Linked Campaign */}
            <div>
              <Label className="text-muted text-xs mb-1.5">Campaign</Label>
              <Select value={form.linked_campaign || NONE} onValueChange={(v) => {
                if (v === NONE) return setForm({ ...form, linked_campaign: "", linked_campaign_name: "" });
                const c = campaigns.find(x => x.id === v);
                setForm({ ...form, linked_campaign: v, linked_campaign_name: c?.name || "" });
              }}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="bg-surface-elevated border-line">
                  <SelectItem value={NONE}>None</SelectItem>
                  {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Linked Interaction */}
            <div>
              <Label className="text-muted text-xs mb-1.5">Interaction</Label>
              <Select value={form.linked_interaction || NONE} onValueChange={(v) => {
                if (v === NONE) return setForm({ ...form, linked_interaction: "", linked_interaction_title: "" });
                const i = interactions.find(x => x.id === v);
                setForm({ ...form, linked_interaction: v, linked_interaction_title: i?.title || "" });
              }}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="bg-surface-elevated border-line">
                  <SelectItem value={NONE}>None</SelectItem>
                  {interactions.map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Company (free text) */}
            <div className="sm:col-span-2">
              <Label className="text-muted text-xs mb-1.5">Company (free text)</Label>
              <Input value={form.linked_company_name} onChange={(e) => setForm({ ...form, linked_company_name: e.target.value })} className={inputClass} placeholder="e.g. Kuoni, Destinology" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-muted hover:text-ink">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6">
            {isLoading ? "Saving..." : action ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}