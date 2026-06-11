import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/use-toast";
import {
  ArrowLeft, Sparkles, Loader2, Download, Plus, Trash2, Globe, FileSpreadsheet, Save,
} from "lucide-react";
import {
  isCrossroads, mergeActivityLines, relevantMonthInteractions, computeMetrics,
  extractClientNotes, DESTINATIONS, inferDestinations,
} from "./reportUtils";
import { exportActivityExcel } from "./exportActivityExcel";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

const SECTIONS = [
  { key: "activity_summary",   label: "Activity Summary",     required: true  },
  { key: "key_interactions",   label: "Key Interactions",     required: true  },
  { key: "market_insights",    label: "Market Insights",      required: true  },
  { key: "client_updates",     label: "Client Updates",       required: true  },
  { key: "marketing_activity", label: "Marketing Activity",   required: true  },
  { key: "opportunities",      label: "Opportunities",        required: true  },
  { key: "challenges",         label: "Challenges",           required: false },
  { key: "actions_next_steps", label: "Actions & Next Steps", required: true  },
];

const METRIC_CARDS = [
  { key: "interaction_count", label: "Interactions" },
  { key: "actions_raised",    label: "Actions raised" },
  { key: "actions_closed",    label: "Actions closed" },
  { key: "campaigns_active",  label: "Active campaigns" },
  { key: "campaign_spend",    label: "Campaign spend", currency: true },
  { key: "coverage_entries",  label: "Coverage entries" },
  { key: "coverage_value",    label: "Coverage value", currency: true },
  { key: "coverage_reach",    label: "Coverage reach" },
];

const REPORT_FIELDS = ["title", "client_id", "client_name", "month", "status", "is_grouped", "grouped_client_ids", "metrics", "metrics_generated_date", "activity_lines"];
const VERSION_FIELDS = ["report_title", "status", "cover_note", "activity_summary", "key_interactions", "market_insights", "client_updates", "marketing_activity", "opportunities", "challenges", "actions_next_steps", "issued_date"];

const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj?.[k] !== undefined).map(k => [k, obj[k]]));

const EMPTY_LINE = { interaction_id: "", date: "", type: "", company_name: "", contact_person: "", overview: "", follow_update: "" };

function monthLabel(month) {
  const d = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(d.getTime()) ? month : d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function buildPdfHtml(report, version) {
  const sections = SECTIONS.filter(s => version[s.key]);
  const body = sections.map(s => `
    <div class="section">
      <h2>${s.label}</h2>
      <p>${(version[s.key] || "").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${report.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 48px 60px; max-width: 860px; margin: 0 auto; }
    header { margin-bottom: 40px; border-bottom: 2px solid #5A3DE6; padding-bottom: 20px; }
    .brand { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #5A3DE6; margin-bottom: 10px; }
    h1 { font-size: 24px; font-weight: 600; color: #0d0d1a; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #888; }
    .status { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
      background: ${version.status === "Final" ? "#d1fae5" : version.status === "Review" ? "#fef3c7" : "#f1f5f9"};
      color: ${version.status === "Final" ? "#065f46" : version.status === "Review" ? "#92400e" : "#64748b"}; }
    .section { margin-bottom: 32px; }
    h2 { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #5A3DE6; margin-bottom: 10px; }
    p { font-size: 14px; line-height: 1.85; color: #374151; margin-bottom: 10px; }
    footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <header>
    <div class="brand">We Define Travel</div>
    <h1>${report.title}</h1>
    <div class="meta">
      ${report.is_grouped ? "CROSSROADS Report" : report.client_name} · ${report.month} · Internal version
      <span class="status">${version.status}</span>
    </div>
  </header>
  ${body}
  <footer>
    <span>We Define Travel · Confidential</span>
    <span>Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
  </footer>
</body>
</html>`;
}

export default function ReportEditor({ report: initialReport, onBack }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [report, setReport] = useState(initialReport);
  const [clientVersion, setClientVersion] = useState(null);
  const [internalVersion, setInternalVersion] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [intelLoading, setIntelLoading] = useState(false);
  const [selectedDests, setSelectedDests] = useState(() => inferDestinations([initialReport.client_name]));

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const crossroadsClients = clients.filter(c => isCrossroads(c.name));

  // Load the two versions, creating them if missing
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ["reportVersions", initialReport.id],
    queryFn: async () => {
      const existing = await base44.entities.ReportVersion.filter({ report_id: initialReport.id });
      const ensure = async (versionName) => {
        const found = existing.find(v => v.version === versionName);
        if (found) return found;
        return base44.entities.ReportVersion.create({
          report_id: initialReport.id,
          report_title: initialReport.title,
          version: versionName,
          status: "Draft",
        });
      };
      return { client: await ensure("Client"), internal: await ensure("Internal") };
    },
  });

  useEffect(() => {
    if (versions) {
      setClientVersion(v => v ?? versions.client);
      setInternalVersion(v => v ?? versions.internal);
    }
  }, [versions]);

  // All client IDs this report covers
  const reportClientIds = report.is_grouped
    ? (report.grouped_client_ids || [])
    : report.client_id ? [report.client_id] : [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Report.update(report.id, pick(report, REPORT_FIELDS));
      if (clientVersion) await base44.entities.ReportVersion.update(clientVersion.id, { ...pick(clientVersion, VERSION_FIELDS), report_title: report.title });
      if (internalVersion) await base44.entities.ReportVersion.update(internalVersion.id, { ...pick(internalVersion, VERSION_FIELDS), report_title: report.title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["reportVersions", report.id] });
      toast({ title: "Report saved" });
    },
    onError: () => toast({ title: "Save failed", description: "Please try again.", variant: "destructive" }),
  });

  const handleClientChange = (v) => {
    const client = clients.find(c => c.id === v);
    const isGroup = isCrossroads(client?.name);
    setReport(r => ({
      ...r,
      client_id: v,
      client_name: client?.name || "",
      is_grouped: isGroup,
      grouped_client_ids: isGroup ? crossroadsClients.map(c => c.id) : [v],
    }));
    setSelectedDests(inferDestinations([client?.name]));
  };

  // ---- Auto-draft: activity lines + metrics + LLM narratives (Internal) ----
  const handleAutoDraft = async () => {
    if (reportClientIds.length === 0 || !internalVersion) return;
    setDrafting(true);
    try {
      const [interactions, actions, campaigns, coverageEntries] = await Promise.all([
        base44.entities.Interaction.list("-date", 500),
        base44.entities.Action.list("-created_date", 500),
        base44.entities.Campaign.list(),
        base44.entities.CoverageEntry.list(),
      ]);

      const month = report.month;
      const monthInteractions = relevantMonthInteractions(interactions, reportClientIds, month);

      // Activity lines — merge, preserving manually edited rows
      const activityLines = mergeActivityLines(report.activity_lines, monthInteractions, reportClientIds);

      // Metrics backbone
      const metrics = computeMetrics({ monthInteractions, actions, campaigns, coverageEntries, clientIds: reportClientIds, month });
      const today = new Date().toISOString().slice(0, 10);

      // Narrative generation (Internal version)
      const interactionData = monthInteractions.map(i => {
        const notes = extractClientNotes(i, reportClientIds);
        return {
          title: i.title, date: i.date, type: i.type, company: i.company_name,
          contacts: i.contact_names?.join(", "),
          general_notes: notes.general.join("\n\n"),
          client_notes: notes.client.join("\n\n"),
          action_points: notes.action.join("\n\n"),
        };
      });
      const clientActions = actions.filter(a => a.linked_client && reportClientIds.includes(a.linked_client));
      const clientCampaigns = campaigns.filter(c => reportClientIds.some(cid => c.linked_clients?.includes(cid)));
      const campaignIds = clientCampaigns.map(c => c.id);
      const coverage = coverageEntries.filter(e => campaignIds.includes(e.campaign_id));

      const isGrouped = report.is_grouped && reportClientIds.length > 1;
      const reportLabel = isGrouped
        ? `CROSSROADS (${crossroadsClients.map(c => c.name).join(" & ")})`
        : report.client_name;

      const prompt = `You are writing a professional monthly client report for ${reportLabel} for ${report.month}.
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
          properties: Object.fromEntries(SECTIONS.map(s => [s.key, { type: "string" }])),
        },
      });

      // Persist immediately so a long generation isn't lost
      await base44.entities.Report.update(report.id, {
        ...pick(report, REPORT_FIELDS),
        activity_lines: activityLines,
        metrics,
        metrics_generated_date: today,
      });
      await base44.entities.ReportVersion.update(internalVersion.id, {
        ...pick(internalVersion, VERSION_FIELDS),
        ...result,
      });

      setReport(r => ({ ...r, activity_lines: activityLines, metrics, metrics_generated_date: today }));
      setInternalVersion(v => ({ ...v, ...result }));
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["reportVersions", report.id] });
      toast({ title: "Auto-draft complete", description: `${activityLines.length} activity lines and metrics generated from CRM data.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Auto-draft failed", description: "Could not generate the draft. Please try again.", variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };

  // ---- Market intelligence (Internal tab) ----
  const handleMarketIntel = async () => {
    if (selectedDests.length === 0 || !internalVersion) return;
    setIntelLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a market intelligence analyst at We Define Travel, a UK travel representation company working with luxury resort clients.

Search recent news and write a concise market intelligence summary of the last month (report month: ${monthLabel(report.month)}) for the following destinations: ${selectedDests.join(", ")}.

Focus on what matters to a luxury resort client selling through the UK travel trade:
- UK tour operator and travel agent developments (new programmes, brochure launches, trade incentives)
- Airline capacity and route news affecting UK connectivity to these destinations
- Destination news: tourism arrivals, resort openings, tourist board campaigns, market trends
- The kind of stories covered by UK trade press such as TTG, Travel Weekly and Travolution

Write 2-4 short paragraphs of flowing prose in UK English. No bullet points, no headings, no preamble — start straight with the content. Mention sources inline where known.`,
        add_context_from_internet: true,
      });

      const text = typeof result === "string" ? result : (result?.text || result?.response || "");
      if (!text) throw new Error("Empty response");

      setInternalVersion(v => ({
        ...v,
        market_insights: v.market_insights?.trim()
          ? `${v.market_insights.trim()}\n\n— Market intelligence (${selectedDests.join(", ")}) —\n\n${text}`
          : text,
      }));
      toast({ title: "Market intelligence added", description: "Appended to Market Insights — review and save." });
    } catch (err) {
      console.error(err);
      toast({ title: "Market intelligence failed", description: "Could not fetch destination news. Please try again.", variant: "destructive" });
    } finally {
      setIntelLoading(false);
    }
  };

  // ---- Excel export (Client version) ----
  const handleExcelExport = async () => {
    try {
      await exportActivityExcel(report, clientVersion);
    } catch (err) {
      console.error(err);
      toast({ title: "Export failed", description: "Could not generate the Excel file.", variant: "destructive" });
    }
  };

  const handlePdfExport = () => {
    if (!internalVersion) return;
    const w = window.open("", "_blank");
    w.document.write(buildPdfHtml(report, internalVersion));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  // ---- Activity line editing ----
  const updateLine = (idx, key, value) => {
    setReport(r => ({
      ...r,
      activity_lines: (r.activity_lines || []).map((l, i) => i === idx ? { ...l, [key]: value } : l),
    }));
  };
  const deleteLine = (idx) => {
    setReport(r => ({ ...r, activity_lines: (r.activity_lines || []).filter((_, i) => i !== idx) }));
  };
  const addLine = () => {
    setReport(r => ({ ...r, activity_lines: [...(r.activity_lines || []), { ...EMPTY_LINE, date: `${r.month}-01` }] }));
  };

  const toggleDest = (d) => {
    setSelectedDests(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "client",   label: "Client version" },
    { id: "internal", label: "Internal version" },
  ];

  const lines = report.activity_lines || [];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      {/* Header bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={onBack} className="text-faint hover:text-ink transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-ink truncate">{report.title}</h1>
          <p className="text-faint text-sm">
            {report.is_grouped ? <span className="text-warning">CROSSROADS</span> : report.client_name}
            {" · "}{monthLabel(report.month)}
          </p>
        </div>
        <StatusBadge status={report.status} />
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || versionsLoading}
          className="bg-primary hover:bg-primary-hover text-white rounded-xl px-5 h-9 text-sm gap-2">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-surface rounded-xl border border-line w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-primary/15 text-primary" : "text-faint hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===================== OVERVIEW / BACKBONE ===================== */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="bg-surface rounded-2xl shadow-card border border-line p-6 space-y-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-muted text-xs mb-1.5">Title</Label>
                <Input value={report.title} onChange={(e) => setReport(r => ({ ...r, title: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <Label className="text-muted text-xs mb-1.5">Client</Label>
                <Select value={report.client_id || ""} onValueChange={handleClientChange}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent className="bg-surface-elevated border-line">
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted text-xs mb-1.5">Month</Label>
                <Input type="month" value={report.month} onChange={(e) => setReport(r => ({ ...r, month: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <Label className="text-muted text-xs mb-1.5">Overall status</Label>
                <Select value={report.status} onValueChange={(v) => setReport(r => ({ ...r, status: v }))}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface-elevated border-line">
                    {["Draft", "Review", "Final"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CROSSROADS grouped toggle */}
            {report.client_id && isCrossroads(report.client_name) && crossroadsClients.length > 1 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20">
                <div className="flex-1">
                  <p className="text-warning text-xs font-semibold">CROSSROADS Grouped Report</p>
                  <p className="text-faint text-xs mt-0.5">
                    {report.is_grouped
                      ? `Covering ${crossroadsClients.map(c => c.name).join(" & ")} under CROSSROADS`
                      : `Report for ${report.client_name} only`}
                  </p>
                </div>
                <button type="button" onClick={() => setReport(r => ({
                  ...r,
                  is_grouped: !r.is_grouped,
                  grouped_client_ids: !r.is_grouped ? crossroadsClients.map(c => c.id) : [r.client_id],
                }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${report.is_grouped ? "bg-warning/20 text-warning border-warning/30" : "bg-canvas text-faint border-line hover:border-line-strong"}`}>
                  {report.is_grouped ? "Grouped ✓" : "Group as CROSSROADS"}
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Button type="button" onClick={handleAutoDraft} disabled={drafting || versionsLoading || reportClientIds.length === 0}
                className="bg-primary hover:bg-primary-hover text-white rounded-xl px-5 h-9 text-sm gap-2">
                {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {drafting ? "Drafting…" : "Auto-draft from CRM"}
              </Button>
              <p className="text-faint text-xs">
                {drafting
                  ? "Assembling activity log, metrics and internal narrative — may take ~20s…"
                  : "Builds the activity log, metrics snapshot and internal narrative from this month's CRM data."}
              </p>
            </div>
          </div>

          {/* Metrics grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-muted text-xs font-medium uppercase tracking-wider">Month metrics</h3>
              {report.metrics_generated_date && (
                <p className="text-faint text-xs">Generated {new Date(report.metrics_generated_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {METRIC_CARDS.map(({ key, label, currency }) => {
                const value = report.metrics?.[key];
                return (
                  <div key={key} className="bg-surface rounded-xl border border-line p-4">
                    <p className="text-ink text-lg font-semibold">
                      {value == null ? "—" : currency ? `£${Number(value).toLocaleString("en-GB")}` : Number(value).toLocaleString("en-GB")}
                    </p>
                    <p className="text-faint text-xs mt-0.5">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================== CLIENT VERSION ===================== */}
      {tab === "client" && (
        versionsLoading || !clientVersion ? (
          <div className="flex items-center gap-2 text-faint text-sm py-12 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading version…</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-muted text-xs">Version status</Label>
                <Select value={clientVersion.status || "Draft"} onValueChange={(v) => setClientVersion(cv => ({ ...cv, status: v }))}>
                  <SelectTrigger className={`${inputClass} w-28 h-9`}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface-elevated border-line">
                    {["Draft", "Review", "Final"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1" />
              <Button type="button" variant="ghost" onClick={addLine} className="text-muted hover:text-ink gap-1.5 h-9">
                <Plus className="w-4 h-4" /><span className="text-xs">Add line</span>
              </Button>
              <Button type="button" onClick={handleExcelExport} disabled={lines.length === 0}
                className="bg-primary hover:bg-primary-hover text-white rounded-xl px-4 h-9 text-sm gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Export to Excel
              </Button>
            </div>

            <div>
              <Label className="text-muted text-xs mb-1.5">Cover note <span className="text-faint">· optional, appears above the table in the export</span></Label>
              <Textarea value={clientVersion.cover_note || ""} onChange={(e) => setClientVersion(cv => ({ ...cv, cover_note: e.target.value }))}
                className={`${inputClass} min-h-[60px]`} placeholder="Short note to the client for this month…" />
            </div>

            {/* Activity log table */}
            <div className="bg-surface rounded-2xl shadow-card border border-line overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-line">
                    {["#", "Date", "Type of Call", "Company or Agency Name", "Contact Person", "Overview & Follow up required", "Follow Update", ""].map((h, i) => (
                      <th key={i} className="text-left text-muted text-xs font-medium px-3 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-faint text-sm py-10">No activity lines yet — use Auto-draft from CRM on the Overview tab, or add a line manually.</td></tr>
                  ) : lines.map((line, idx) => (
                    <tr key={idx} className="border-b border-line align-top">
                      <td className="px-3 py-2 text-faint text-xs pt-4">{idx + 1}</td>
                      <td className="px-3 py-2 w-36">
                        <Input type="date" value={line.date || ""} onChange={(e) => updateLine(idx, "date", e.target.value)} className={`${inputClass} h-8 text-xs`} />
                      </td>
                      <td className="px-3 py-2 w-32">
                        <Input value={line.type || ""} onChange={(e) => updateLine(idx, "type", e.target.value)} className={`${inputClass} h-8 text-xs`} placeholder="Telephone" />
                      </td>
                      <td className="px-3 py-2 w-44">
                        <Input value={line.company_name || ""} onChange={(e) => updateLine(idx, "company_name", e.target.value)} className={`${inputClass} h-8 text-xs`} />
                      </td>
                      <td className="px-3 py-2 w-40">
                        <Input value={line.contact_person || ""} onChange={(e) => updateLine(idx, "contact_person", e.target.value)} className={`${inputClass} h-8 text-xs`} />
                      </td>
                      <td className="px-3 py-2 min-w-[260px]">
                        <Textarea value={line.overview || ""} onChange={(e) => updateLine(idx, "overview", e.target.value)} className={`${inputClass} min-h-[60px] text-xs`} />
                      </td>
                      <td className="px-3 py-2 min-w-[180px]">
                        <Textarea value={line.follow_update || ""} onChange={(e) => updateLine(idx, "follow_update", e.target.value)} className={`${inputClass} min-h-[60px] text-xs`} />
                      </td>
                      <td className="px-2 py-2 pt-4">
                        <button type="button" onClick={() => deleteLine(idx)} className="p-1.5 rounded-lg text-faint hover:text-danger hover:bg-danger/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ===================== INTERNAL VERSION ===================== */}
      {tab === "internal" && (
        versionsLoading || !internalVersion ? (
          <div className="flex items-center gap-2 text-faint text-sm py-12 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading version…</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-muted text-xs">Version status</Label>
                <Select value={internalVersion.status || "Draft"} onValueChange={(v) => setInternalVersion(iv => ({ ...iv, status: v }))}>
                  <SelectTrigger className={`${inputClass} w-28 h-9`}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface-elevated border-line">
                    {["Draft", "Review", "Final"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1" />
              <Button type="button" variant="ghost" onClick={handlePdfExport} className="text-muted hover:text-ink gap-1.5 h-9">
                <Download className="w-4 h-4" /><span className="text-xs">Export PDF</span>
              </Button>
            </div>

            {/* Market intelligence generator */}
            <div className="bg-surface rounded-2xl shadow-card border border-line p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-ink text-sm font-medium">Market intelligence</h3>
              </div>
              <p className="text-faint text-xs">Pulls last month's UK travel-trade news (TTG, Travel Weekly, Travolution and similar) for the selected destinations into Market Insights.</p>
              <div className="flex flex-wrap gap-2">
                {DESTINATIONS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDest(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedDests.includes(d) ? "bg-primary/15 text-primary border-primary/30" : "bg-canvas text-faint border-line hover:border-line-strong"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" onClick={handleMarketIntel} disabled={intelLoading || selectedDests.length === 0}
                  className="bg-primary hover:bg-primary-hover text-white rounded-xl px-4 h-9 text-sm gap-2">
                  {intelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {intelLoading ? "Generating…" : "Generate market intelligence"}
                </Button>
                {intelLoading && <p className="text-faint text-xs">Searching the web — may take ~20s…</p>}
              </div>
            </div>

            {/* Narrative sections */}
            <div className="space-y-4">
              {SECTIONS.map(({ key, label, required }) => (
                <div key={key}>
                  <Label className="text-muted text-xs mb-1.5">
                    {label}{!required && <span className="text-faint ml-1">· optional</span>}
                  </Label>
                  <Textarea
                    value={internalVersion[key] || ""}
                    onChange={(e) => setInternalVersion(iv => ({ ...iv, [key]: e.target.value }))}
                    className={`${inputClass} min-h-[90px]`}
                    placeholder={`Write or auto-draft ${label.toLowerCase()}…`}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
