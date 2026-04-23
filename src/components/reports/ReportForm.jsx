import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Loader2 } from "lucide-react";

const inputClass = "bg-surface-secondary border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-lg focus:border-[#7F5BFF] focus:ring-[#7F5BFF]/20";

export default function ReportForm({ report, onSubmit, onCancel, isLoading }) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    title: report?.title || "",
    client_id: report?.client_id || "",
    client_name: report?.client_name || "",
    month: report?.month || new Date().toISOString().slice(0, 7),
    status: report?.status || "Draft",
    activity_summary: report?.activity_summary || "",
    key_interactions: report?.key_interactions || "",
    market_insights: report?.market_insights || "",
    client_updates: report?.client_updates || "",
    marketing_activity: report?.marketing_activity || "",
    opportunities: report?.opportunities || "",
    challenges: report?.challenges || "",
    actions_next_steps: report?.actions_next_steps || "",
    is_grouped: report?.is_grouped || false,
  });

  const handleGenerate = async () => {
    if (!form.client_id && !form.client_name) return;
    setGenerating(true);

    const [interactions, actions, campaigns] = await Promise.all([
      base44.entities.Interaction.list("-date", 50),
      base44.entities.Action.list("-created_date", 50),
      base44.entities.Campaign.list(),
    ]);

    const clientInteractions = interactions.filter(i =>
      i.linked_clients?.includes(form.client_id) ||
      i.general_notes_assigned_clients?.includes(form.client_id)
    );
    const clientActions = actions.filter(a => a.linked_client === form.client_id);
    const clientCampaigns = campaigns.filter(c => c.linked_clients?.includes(form.client_id));

    const prompt = `Generate a professional monthly report for "${form.client_name}" for ${form.month}.
Write in clean, professional paragraphs. NO bullet points. This is for a UK travel representation company called We Define Travel.

Data:
Interactions: ${JSON.stringify(clientInteractions.map(i => ({ title: i.title, date: i.date, type: i.type, notes: i.general_notes, client_notes: i.client_specific_notes?.filter(n => n.client_id === form.client_id) })))}
Actions: ${JSON.stringify(clientActions.map(a => ({ description: a.description, status: a.status, due: a.due_date })))}
Campaigns: ${JSON.stringify(clientCampaigns.map(c => ({ name: c.name, type: c.type, status: c.status })))}

Generate each section in paragraph format. Be specific and professional.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          activity_summary: { type: "string" },
          key_interactions: { type: "string" },
          market_insights: { type: "string" },
          client_updates: { type: "string" },
          marketing_activity: { type: "string" },
          opportunities: { type: "string" },
          challenges: { type: "string" },
          actions_next_steps: { type: "string" },
        },
      },
    });

    setForm(prev => ({ ...prev, ...result }));
    setGenerating(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-medium">{report ? "Edit Report" : "New Report"}</h2>
        <button onClick={onCancel} className="text-[#6C6C80] hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} required placeholder="e.g. Monthly Report - April 2025" />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Client</Label>
            <Select value={form.client_id} onValueChange={(v) => {
              const client = clients.find(c => c.id === v);
              setForm({ ...form, client_id: v, client_name: client?.name || "" });
            }}>
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

        <div className="flex items-center gap-3">
          <Button type="button" onClick={handleGenerate} disabled={generating || !form.client_id} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-5 h-9 text-sm">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generating ? "Generating..." : "AI Generate Report"}
          </Button>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className={`${inputClass} w-32`}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface-elevated border-white/[0.06]">
              {["Draft", "Review", "Final"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {[
          { key: "activity_summary", label: "Activity Summary" },
          { key: "key_interactions", label: "Key Interactions" },
          { key: "market_insights", label: "Market Insights" },
          { key: "client_updates", label: "Client-Specific Updates" },
          { key: "marketing_activity", label: "Marketing Activity" },
          { key: "opportunities", label: "Opportunities" },
          { key: "challenges", label: "Challenges (Optional)" },
          { key: "actions_next_steps", label: "Actions & Next Steps" },
        ].map(({ key, label }) => (
          <div key={key}>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">{label}</Label>
            <Textarea value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={`${inputClass} min-h-[80px]`} />
          </div>
        ))}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-[#A1A1B5] hover:text-white">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-6">
            {isLoading ? "Saving..." : report ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}