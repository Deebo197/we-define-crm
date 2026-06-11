import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";
const NONE = "__none__";

const DESTINATIONS = ["Maldives", "Mauritius", "UAE", "Far East"];
const FUNCTIONS = ["Commercial", "Product", "Marketing", "Press", "Admin"];
const SENIORITIES = ["Head/Director", "Manager", "Executive", "Other"];

export default function ContactForm({ contact, onSubmit, onCancel, isLoading }) {
  const { data: tradeAccounts = [] } = useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => listActiveTradeAccounts(),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const [form, setForm] = useState({
    first_name: contact?.first_name ?? "",
    last_name: contact?.last_name ?? "",
    name: contact?.name ?? "",
    role: contact?.role ?? "",
    function: contact?.function ?? "",
    seniority: contact?.seniority ?? "",
    company_id: contact?.company_id ?? "",
    company_name: contact?.company_name ?? "",
    company_type: contact?.company_type ?? "TradeAccount",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    mobile: contact?.mobile ?? "",
    home_address_line1: contact?.home_address_line1 ?? "",
    home_address_line2: contact?.home_address_line2 ?? "",
    home_city: contact?.home_city ?? "",
    home_county: contact?.home_county ?? "",
    home_postcode: contact?.home_postcode ?? "",
    home_country: contact?.home_country ?? "",
    coverage: contact?.coverage ?? [],
    notes: contact?.notes ?? "",
    linkedin: contact?.linkedin ?? "",
    birthday: contact?.birthday ?? "",
    relationship_notes: contact?.relationship_notes ?? "",
    tags: contact?.tags ?? [],
    working_pattern: contact?.working_pattern ?? {},
  });

  const [tagInput, setTagInput] = useState("");

  const handleTradeAccountChange = (v) => {
    if (v === NONE) {
      setForm(f => ({ ...f, company_id: "", company_name: "", company_type: "TradeAccount" }));
      return;
    }
    const a = tradeAccounts.find(x => x.id === v);
    setForm(f => ({ ...f, company_id: v, company_name: a?.name ?? "", company_type: "TradeAccount" }));
  };

  const handleNameChange = (field, value) => {
    const updates = { [field]: value };
    const fn = field === "first_name" ? value : form.first_name;
    const ln = field === "last_name" ? value : form.last_name;
    if (fn || ln) updates.name = `${fn} ${ln}`.trim();
    setForm(f => ({ ...f, ...updates }));
  };

  const toggleDestination = (destination) => {
    setForm(f => ({
      ...f,
      coverage: f.coverage.some(c => c.destination === destination)
        ? f.coverage.filter(c => c.destination !== destination)
        : [...f.coverage, { destination, clients: [] }],
    }));
  };

  const toggleCoverageClient = (destination, clientId) => {
    setForm(f => ({
      ...f,
      coverage: f.coverage.map(c => c.destination !== destination ? c : {
        ...c,
        clients: (c.clients ?? []).includes(clientId)
          ? (c.clients ?? []).filter(id => id !== clientId)
          : [...(c.clients ?? []), clientId],
      }),
    }));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-ink font-medium">{contact ? "Edit Contact" : "New Contact"}</h2>
        <button type="button" onClick={onCancel} className="text-faint hover:text-ink"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Personal */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted text-xs mb-1.5">First Name</Label>
            <Input value={form.first_name} onChange={e => handleNameChange("first_name", e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Last Name</Label>
            <Input value={form.last_name} onChange={e => handleNameChange("last_name", e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Full Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} required placeholder="Auto-filled from first + last" />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Job Title</Label>
            <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Function</Label>
            <Select value={form.function || NONE} onValueChange={v => setForm(f => ({ ...f, function: v === NONE ? "" : v }))}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Select function..." /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                <SelectItem value={NONE}>None</SelectItem>
                {FUNCTIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Seniority</Label>
            <Select value={form.seniority || NONE} onValueChange={v => setForm(f => ({ ...f, seniority: v === NONE ? "" : v }))}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Select seniority..." /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                <SelectItem value={NONE}>None</SelectItem>
                {SENIORITIES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Mobile</Label>
            <Input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">LinkedIn</Label>
            <Input value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} className={inputClass} placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Birthday</Label>
            <Input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Company */}
        <div className="border-t border-line pt-4 space-y-3">
          <p className="text-faint text-xs font-medium uppercase tracking-wider">Company (Trade Account)</p>
          <div>
            <Label className="text-muted text-xs mb-1.5">Company Name</Label>
            <Select value={form.company_id || NONE} onValueChange={handleTradeAccountChange}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Select trade account..." /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                <SelectItem value={NONE}>None</SelectItem>
                {tradeAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>



        {/* Coverage */}
        <div className="border-t border-line pt-4">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-muted text-xs font-bold uppercase tracking-wider">Coverage</p>
            <span className="text-[10px] text-faint italic">Which destinations does this person sell or manage, and for which of your clients?</span>
          </div>
          <div className="space-y-3">
            {DESTINATIONS.map(destination => {
              const entry = form.coverage.find(c => c.destination === destination);
              return (
                <div key={destination}>
                  <button type="button" onClick={() => toggleDestination(destination)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${entry ? "bg-success/20 text-success border-success/30" : "bg-canvas text-faint border-line hover:border-line-strong"}`}>
                    {destination}
                  </button>
                  {entry && (
                    clients.length === 0 ? (
                      <p className="text-faint text-xs mt-2">No clients found in system.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {clients.map(client => (
                          <button key={client.id} type="button" onClick={() => toggleCoverageClient(destination, client.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                              (entry.clients ?? []).includes(client.id)
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                : "bg-canvas text-faint border-line hover:border-line-strong hover:text-ink"
                            }`}>
                            {(entry.clients ?? []).includes(client.id) && <span className="text-muted">✓</span>}
                            {client.name}
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Home Address */}
        <div className="border-t border-line pt-4 space-y-3">
          <p className="text-faint text-xs font-medium uppercase tracking-wider">Home Address</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-muted text-xs mb-1.5">Address Line 1</Label>
              <Input value={form.home_address_line1} onChange={e => setForm(f => ({ ...f, home_address_line1: e.target.value }))} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-muted text-xs mb-1.5">Address Line 2</Label>
              <Input value={form.home_address_line2} onChange={e => setForm(f => ({ ...f, home_address_line2: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">City</Label>
              <Input value={form.home_city} onChange={e => setForm(f => ({ ...f, home_city: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">County</Label>
              <Input value={form.home_county} onChange={e => setForm(f => ({ ...f, home_county: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Postcode</Label>
              <Input value={form.home_postcode} onChange={e => setForm(f => ({ ...f, home_postcode: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Country</Label>
              <Input value={form.home_country} onChange={e => setForm(f => ({ ...f, home_country: e.target.value }))} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Notes & Tags */}
        <div>
          <Label className="text-muted text-xs mb-1.5">Notes</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputClass} min-h-[80px]`} />
        </div>
        <div>
          <Label className="text-muted text-xs mb-1.5">Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                {tag}
                <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} className="hover:text-ink"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}} className={`${inputClass} flex-1`} placeholder="Add tag..." />
            <Button type="button" onClick={addTag} variant="ghost" className="text-primary text-xs">Add</Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-muted hover:text-ink">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6">
            {isLoading ? "Saving..." : contact ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}