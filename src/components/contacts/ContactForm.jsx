import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const inputClass = "bg-surface-secondary border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-lg focus:border-[#7F5BFF] focus:ring-[#7F5BFF]/20";

export default function ContactForm({ contact, onSubmit, onCancel, isLoading }) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: tradeAccounts = [] } = useQuery({ queryKey: ["tradeaccounts"], queryFn: () => base44.entities.TradeAccount.list() });
  const { data: otherPartners = [] } = useQuery({ queryKey: ["otherpartners"], queryFn: () => base44.entities.OtherPartner.list() });

  const [form, setForm] = useState({
    name: contact?.name || "",
    role: contact?.role || "",
    client_role: contact?.client_role || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    linkedin: contact?.linkedin || "",
    birthday: contact?.birthday || "",
    company_type: contact?.company_type || "",
    company_id: contact?.company_id || "",
    company_name: contact?.company_name || "",
    linked_clients: contact?.linked_clients || [],
    linked_client_names: contact?.linked_client_names || [],
    relationship_notes: contact?.relationship_notes || "",
    tags: contact?.tags || [],
  });
  const [tagInput, setTagInput] = useState("");

  const companyOptions = form.company_type === "Client" ? clients
    : form.company_type === "TradeAccount" ? tradeAccounts
    : form.company_type === "OtherPartner" ? otherPartners
    : [];

  const handleCompanyTypeChange = (type) => {
    setForm({ ...form, company_type: type, company_id: "", company_name: "" });
  };

  const handleCompanyChange = (id) => {
    const company = companyOptions.find(c => c.id === id);
    setForm({ ...form, company_id: id, company_name: company?.name || "" });
  };

  const toggleClient = (client) => {
    const isLinked = form.linked_clients.includes(client.id);
    setForm({
      ...form,
      linked_clients: isLinked ? form.linked_clients.filter(id => id !== client.id) : [...form.linked_clients, client.id],
      linked_client_names: isLinked ? form.linked_client_names.filter(n => n !== client.name) : [...form.linked_client_names, client.name],
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-medium">{contact ? "Edit Contact" : "New Contact"}</h2>
        <button onClick={onCancel} className="text-[#6C6C80] hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal details */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Role / Title</Label>
            <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Role for Client</Label>
            <Input value={form.client_role} onChange={(e) => setForm({ ...form, client_role: e.target.value })} className={inputClass} placeholder="e.g. GM, DOSM, Reservations, Accounts" />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">LinkedIn URL</Label>
            <Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} className={inputClass} placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Birthday</Label>
            <Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className={inputClass} />
          </div>
        </div>

        {/* Company linkage */}
        <div className="border-t border-white/[0.06] pt-4 space-y-3">
          <p className="text-[#6C6C80] text-xs font-medium uppercase tracking-wider">Company</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#A1A1B5] text-xs mb-1.5">Company Type</Label>
              <Select value={form.company_type} onValueChange={handleCompanyTypeChange}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent className="bg-surface-elevated border-white/[0.06]">
                  <SelectItem value="Client">Client</SelectItem>
                  <SelectItem value="TradeAccount">Trade Account</SelectItem>
                  <SelectItem value="OtherPartner">Other Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#A1A1B5] text-xs mb-1.5">Company</Label>
              <Select value={form.company_id} onValueChange={handleCompanyChange} disabled={!form.company_type}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Select company..." /></SelectTrigger>
                <SelectContent className="bg-surface-elevated border-white/[0.06]">
                  {companyOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Linked Clients */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1 block">Linked Clients</Label>
          <p className="text-[#6C6C80] text-xs mb-2">Clients this contact is relevant to (for reporting)</p>
          <div className="flex flex-wrap gap-2">
            {clients.map(client => (
              <button key={client.id} type="button" onClick={() => toggleClient(client)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${form.linked_clients.includes(client.id) ? "bg-[#7F5BFF]/20 text-[#7F5BFF] border-[#7F5BFF]/30" : "bg-white/[0.02] text-[#6C6C80] border-white/[0.06] hover:border-white/[0.12]"}`}>
                {client.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">
                {tag}
                <button type="button" onClick={() => setForm({ ...form, tags: form.tags.filter(t => t !== tag) })} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}} className={`${inputClass} flex-1`} placeholder="Add tag..." />
            <Button type="button" onClick={addTag} variant="ghost" className="text-[#7F5BFF] text-xs">Add</Button>
          </div>
        </div>

        {/* Relationship Notes */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Relationship Notes</Label>
          <Textarea value={form.relationship_notes} onChange={(e) => setForm({ ...form, relationship_notes: e.target.value })} className={`${inputClass} min-h-[80px]`} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-[#A1A1B5] hover:text-white">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-6">
            {isLoading ? "Saving..." : contact ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}