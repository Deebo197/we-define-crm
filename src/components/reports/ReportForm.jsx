import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";

const inputClass = "bg-surface-secondary border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-lg focus:border-[#7F5BFF] focus:ring-[#7F5BFF]/20";

const SECTIONS = [
  { key: "activity_summary",  label: "Activity Summary",         required: true  },
  { key: "key_interactions",  label: "Key Interactions",         required: true  },
  { key: "market_insights",   label: "Market Insights",          required: true  },
  { key: "client_updates",    label: "Client Updates",           required: true  },
  { key: "marketing_activity",label: "Marketing Activity",       required: true  },
  { key: "opportunities",     label: "Opportunities",            required: true  },
  { key: "challenges",        label: "Challenges",               required: false },
  { key: "actions_next_steps",label: "Actions & Next Steps",     required: true  },
];

const CROSSROADS_NAMES = ["hard rock", "saii lagoon", "saii"];
function isCrossroads(name) {
  const n = (name || "").toLowerCase();
  return CROSSROADS_NAMES.some(k => n.includes(k));
}

// Gather all client-relevant notes from an interaction's notes[] array
function extractClientNotes(interaction, clientId) {
  const out = { general: [], client: [], action: [] };
  // New structured notes
  if (interaction.notes?.length) {
    interaction.notes.forEach(n => {
      if (!n.assigned_clients?.length || n.assigned_clients.includes(clientId)) {
        out[n.type]?.push(n.text);
      }
    });
  }
  // Legacy fields
  if (interaction.general_notes && interaction.general_notes_assigned_clients?.includes(clientId)) {
    out.general.push(interaction.general_notes);
  }
  if (interaction.client_specific_notes?.length) {
    const csn = interaction.client_specific_notes.find(n => n.client_id === clientId);
    if (csn?.notes) out.client.push(csn.notes);
  }
  return out;
}

export default function ReportForm({ report, onSubmit, onCancel, isLoading }) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const [generating, setGenerating] = useState(false);
  const [showSections, setShowSections] = useState(true);

  // Determine which clients share a reporting group (CROSSROADS)
  const crossroadsClients = clients.filter(c => isCrossroads(c.name));

  const [form, setForm] = useState({
    title: report?.title || "",
    client_id: report?.client_id || "",
    client_name: report?.client_name || "",
    month: report?.month || new Date().toISOString().slice(0, 7),
    status: report?.status || "Draft",
    is_grouped: report?.is_grouped || false,
    grouped_client_ids: report?.grouped_client_ids || [],
    activity_summary: report?.activity_summary || "",
    key_interactions: report?.key_interactions || "",
    market_insights: report?.market_insights || "",
    client_updates: report?.client_updates || "",
    marketing_activity: report?.marketing_activity || "",
    opportunities: report?.opportunities || "",
    challenges: report?.challenges || "",
    actions_next_steps: report?.actions_next_steps || "",
  });

  // All client IDs this report covers
  const reportClientIds = form.is_grouped
    ? form.grouped_client_ids
    : form.client_id ? [form.client_id] : [];

  const handleClientChange = (v) => {
    const client = clients.find(c => c.id === v);
    // If selecting a CROSSROADS client, offer grouped option
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

  const handleGenerate = async () => {
    if (reportClientIds.length === 0) return;
    setGenerating(true);
    try {
      const [interactions, actions, campaigns, coverageEntries] = await Promise.all([
        base44.entities.Interaction.list("-date", 100),
        base44.entities.Action.list("-created_date", 100),
        base44.entities.Campaign.list(),
        base44.entities.CoverageEntry.list(),
      ]);

      // Filter to interactions that involve any of the report's clients
      const relevantInteractions = interactions.filter(i =>
        reportClientIds.some(cid =>
          i.linked_clients?.includes(cid) ||
          i.general_notes_assigned_clients?.includes(cid) ||
          i.notes?.some(n => !n.assigned_clients?.length || n.assigned_clients.includes(cid))
        )
      );

      // Build per-interaction summaries with extracted notes
      const interactionData = relevantInteractions.map(i => {
        const noteSets = reportClientIds.map(cid => extractClientNotes(i, cid));
        const allGeneral = [...new Set(noteSets.flatMap(ns => ns.general))];
        const allClient  = [...new Set(noteSets.flatMap(ns => ns.client))];
        const allActions = [...new Set(noteSets.flatMap(ns => ns.action))];
        return {
          title: i.title, date: i.date, type: i.type, company: i.company_name,
          contacts: i.contact_names?.join(", "),
          general_notes: allGeneral.join("\n\n"),
          client_notes: allClient.join("\n\n"),
          action_points: allActions.join("\n\n"),
        };
      });

      const clientActions = actions.filter(a => reportClientIds.includes(a.linked_client));
      const clientCampaigns = campaigns.filter(c =>
        reportClientIds.some(cid => c.linked_clients?.includes(cid))
      );
      const campaignIds = clientCampaigns.map(c => c.id);
      const coverage = coverageEntries.filter(e => campaignIds.includes(e.campaign_id));

      const isGrouped = form.is_grouped && crossroadsClients.length > 1;
      const reportLabel = isGrouped
        ? `CROSSROADS (${crossroadsClients.map(c => c.name).join(" & ")})`
        : form.client_name;

      const prompt = `You are writing a professional monthly client report for ${reportLabel} for ${form.month}.
This report is produced by We Define Travel, a UK travel representation company.

CRITICAL RULES:
- Write in full paragraphs only. Absolutely NO bullet points or lists.
- Be specific, professional and human. Reference actual meetings, dates, campaigns where available.
- Each section must be a standalone paragraph or multiple paragraphs — never a list.
${isGrouped ? "- This is a combined CROSSROADS report covering both Hard Rock Maldives and SAii Lagoon. Discuss both properties but group under the CROSSROADS brand." : ""}

DATA:

INTERACTIONS (${interactionData.length}):
${JSON.stringify(interactionData)}

CAMPAIGNS (${clientCampaigns.length}):
${JSON.stringify(clientCampaigns.map(c => ({ name: c.name, type: c.type, status: c.status, budget: c.budget, notes: c.notes })))}

MEDIA COVERAGE (${coverage.length} entries):
${JSON.stringify(coverage.map(e => ({ platform: e.platform_partner, summary: e.summary, reach: e.estimated_reach, value: e.estimated_value, date: e.date })))}

OPEN ACTIONS (${clientActions.length}):
${JSON.stringify(clientActions.map(a => ({ description: a.description, status: a.status, due: a.due_date, priority: a.priority })))}

Write each of the 8 sections as rich, professional paragraphs. If there is no data for a section, write a brief professional holding sentence.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: "claude_sonnet_4_6",
        response_json_schema: {
          type: "object",
          properties: {
            activity_summary:   { type: "string" },
            key_interactions:   { type: "string" },
            market_insights:    { type: "string" },
            client_updates:     { type: "string" },
            marketing_activity: { type: "string" },
            opportunities:      { type: "string" },
            challenges:         { type: "string" },
            actions_next_steps: { type: "string" },
          },
        },
      });

      setForm(prev => ({ ...prev, ...result }));
      setShowSections(true);
    } finally {
      setGenerating(false);
    }
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

        {/* Generate + Status row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button type="button" onClick={handleGenerate} disabled={generating || reportClientIds.length === 0}
            className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-5 h-9 text-sm gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating…" : "AI Generate Report"}
          </Button>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className={`${inputClass} w-32`}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface-elevated border-white/[0.06]">
              {["Draft", "Review", "Final"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {generating && <p className="text-[#6C6C80] text-xs">Using Claude Sonnet — may take ~15s…</p>}
        </div>

        {/* Sections */}
        <div>
          <button type="button" onClick={() => setShowSections(v => !v)}
            className="flex items-center gap-2 text-[#A1A1B5] text-xs font-medium mb-3 hover:text-white transition-colors">
            {showSections ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Report Sections
          </button>
          {showSections && (
            <div className="space-y-4">
              {SECTIONS.map(({ key, label, required }) => (
                <div key={key}>
                  <Label className="text-[#A1A1B5] text-xs mb-1.5">
                    {label}{!required && <span className="text-[#6C6C80] ml-1">· optional</span>}
                  </Label>
                  <Textarea
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className={`${inputClass} min-h-[90px]`}
                    placeholder={`Write or generate ${label.toLowerCase()}…`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-[#A1A1B5] hover:text-white">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-6">
            {isLoading ? "Saving…" : report ? "Update Report" : "Create Report"}
          </Button>
        </div>
      </form>
    </div>
  );
}