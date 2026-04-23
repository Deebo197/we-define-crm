import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Globe, Search, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const inputClass = "bg-surface-secondary border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-lg focus:border-[#7F5BFF] focus:ring-[#7F5BFF]/20";

export default function OtherPartners() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["other-partners"],
    queryFn: () => base44.entities.OtherPartner.list("-created_date"),
  });

  const [form, setForm] = useState({ name: "", type: "Press", notes: "", opportunity_notes: "" });

  const openForm = (partner) => {
    if (partner) {
      setForm({ name: partner.name, type: partner.type, notes: partner.notes || "", opportunity_notes: partner.opportunity_notes || "" });
      setEditing(partner);
    } else {
      setForm({ name: "", type: "Press", notes: "", opportunity_notes: "" });
      setEditing(null);
    }
    setShowForm(true);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OtherPartner.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["other-partners"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OtherPartner.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["other-partners"] }); setShowForm(false); setEditing(null); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    editing ? updateMutation.mutate({ id: editing.id, data: form }) : createMutation.mutate(form);
  };

  const filtered = partners.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.type?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Other Partners" subtitle="Press, airlines, tourist boards" action={() => openForm(null)} actionLabel="Add Partner" />

      {showForm && (
        <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-medium">{editing ? "Edit Partner" : "New Partner"}</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-[#6C6C80] hover:text-white"><X className="w-5 h-5" /></button>
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
                    {["Press", "Airline", "Tourist Board", "DMO", "Technology", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[#A1A1B5] text-xs mb-1.5">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} min-h-[80px]`} />
            </div>
            <div>
              <Label className="text-[#A1A1B5] text-xs mb-1.5">Opportunity Notes</Label>
              <Textarea value={form.opportunity_notes} onChange={(e) => setForm({ ...form, opportunity_notes: e.target.value })} className={`${inputClass} min-h-[80px]`} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }} className="text-[#A1A1B5] hover:text-white">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-6">
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
        <Input placeholder="Search partners..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10" />
      </div>

      {isLoading ? <ShimmerCard count={3} /> : filtered.length === 0 ? (
        <EmptyState icon={Globe} title="No partners" description="Add press, airlines, and tourist boards" action={() => openForm(null)} actionLabel="Add Partner" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <div key={p.id} className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => openForm(p)}>
              <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{p.name}</h3>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-white/[0.04] text-[#A1A1B5] border border-white/[0.06]">{p.type}</span>
              {p.notes && <p className="text-[#6C6C80] text-xs mt-2 line-clamp-2">{p.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}