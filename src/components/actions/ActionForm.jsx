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
const statuses = ["To Do", "In Progress", "Completed", "Waiting on Partner", "Waiting on Client", "Cancelled"];
const priorities = ["Low", "Medium", "High", "Urgent"];

export default function ActionForm({ action, onSubmit, onCancel, isLoading }) {
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const [form, setForm] = useState({
    description: action?.description || "",
    owner: action?.owner || "",
    due_date: action?.due_date || "",
    status: action?.status || "To Do",
    priority: action?.priority || "Medium",
    linked_client: action?.linked_client || "",
    linked_client_name: action?.linked_client_name || "",
    linked_company_name: action?.linked_company_name || "",
    linked_contact_name: action?.linked_contact_name || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-medium">{action ? "Edit Action" : "New Action"}</h2>
        <button onClick={onCancel} className="text-[#6C6C80] hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Description *</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} min-h-[60px]`} required placeholder="What needs to be done?" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Owner</Label>
            <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Due Date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                {priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Linked Client</Label>
            <Select value={form.linked_client} onValueChange={(v) => {
              const client = clients.find(c => c.id === v);
              setForm({ ...form, linked_client: v, linked_client_name: client?.name || "" });
            }}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                <SelectItem value="none">None</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-[#A1A1B5] hover:text-white">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-6">
            {isLoading ? "Saving..." : action ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}