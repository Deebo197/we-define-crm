import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, X, ChevronDown, ChevronUp, Zap } from "lucide-react";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";
const types = ["Meeting (In-Person)", "Meeting (Virtual)", "Call", "Email", "Event", "FAM Feedback", "Marketing Discussion"];

// CROSSROADS clients detection
const CROSSROADS_NAMES = ["hard rock", "saii lagoon", "saii"];

function isCrossroads(name) {
  const n = (name || "").toLowerCase();
  return CROSSROADS_NAMES.some(k => n.includes(k));
}

function CrossroadsTag({ value, onChange }) {
  const tags = ["Hard Rock", "SAii", "Both (CROSSROADS)"];
  return (
    <div className="flex gap-1.5 mt-2">
      {tags.map(t => (
        <button key={t} type="button" onClick={() => onChange(value === t ? "" : t)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide border transition-all ${
            value === t
              ? t === "Both (CROSSROADS)" ? "bg-warning/20 text-warning border-warning/40"
                : t === "Hard Rock" ? "bg-danger/20 text-danger border-danger/40"
                : "bg-success/20 text-success border-success/40"
              : "bg-canvas text-faint border-line hover:border-line-strong"
          }`}>
          {t}
        </button>
      ))}
    </div>
  );
}

function ClientChip({ client, selected, onToggle }) {
  return (
    <button type="button" onClick={() => onToggle(client)}
      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
        selected
          ? "bg-primary/20 text-primary border-primary/30"
          : "bg-canvas text-faint border-line hover:border-line-strong"
      }`}>
      {client.name}
    </button>
  );
}

// Parsed note block from AI — user assigns to a client
function NoteBlock({ note, clients, linkedClientIds, onAssign, onUpdate, onRemove }) {
  const typeColors = {
    general: "text-muted border-line",
    client: "text-primary border-primary/20",
    action: "text-warning border-warning/20",
  };
  const typeLabels = { general: "Market / General", client: "Client Update", action: "Action Point" };
  const linkedClients = clients.filter(c => linkedClientIds.includes(c.id));

  return (
    <div className={`rounded-xl border p-4 space-y-3 bg-surface-secondary ${typeColors[note.type] || typeColors.general}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeColors[note.type] || typeColors.general} bg-canvas`}>
          {typeLabels[note.type] || "General"}
        </span>
        <button type="button" onClick={onRemove} className="text-faint hover:text-ink mt-0.5"><X className="w-3.5 h-3.5" /></button>
      </div>

      <Textarea
        value={note.text}
        onChange={(e) => onUpdate({ ...note, text: e.target.value })}
        className={`${inputClass} min-h-[72px] text-sm`}
      />

      {/* Assign to client(s) */}
      {linkedClients.length > 0 && (
        <div>
          <p className="text-faint text-[10px] mb-1.5">Assign to:</p>
          <div className="flex flex-wrap gap-1.5">
            {/* "All clients" shortcut */}
            <button type="button" onClick={() => onAssign("__all__")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                note.assigned_clients?.length === linkedClientIds.length && linkedClientIds.length > 0
                  ? "bg-warning/20 text-warning border-warning/40"
                  : "bg-canvas text-faint border-line hover:border-line-strong"
              }`}>All</button>
            {linkedClients.map(c => (
              <button key={c.id} type="button" onClick={() => onAssign(c.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                  note.assigned_clients?.includes(c.id)
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-canvas text-faint border-line hover:border-line-strong"
                }`}>{c.name}</button>
            ))}
          </div>
          {/* CROSSROADS tag if any assigned client is Hard Rock / SAii */}
          {note.assigned_clients?.some(id => {
            const c = clients.find(x => x.id === id);
            return isCrossroads(c?.name);
          }) && (
            <CrossroadsTag value={note.crossroads_tag || ""} onChange={(v) => onUpdate({ ...note, crossroads_tag: v })} />
          )}
        </div>
      )}
    </div>
  );
}

export default function InteractionFormContent({ interaction, onSuccess }) {
  const queryClient = useQueryClient();
  const [aiLoading, setAiLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(!interaction);

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => base44.entities.Contact.list() });
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => base44.entities.Campaign.list() });
  const { data: teamMembers = [] } = useQuery({ queryKey: ["team-members"], queryFn: () => base44.entities.TeamMember.filter({ status: "Active" }) });
  const { data: tradeAccounts = [] } = useQuery({ queryKey: ["trade-accounts"], queryFn: () => listActiveTradeAccounts() });
  const { data: otherPartners = [] } = useQuery({ queryKey: ["otherpartners"], queryFn: () => base44.entities.OtherPartner.list() });

  const [companyOpen, setCompanyOpen] = useState(false);
  const companyRef = useRef(null);

  const [form, setForm] = useState({
    title: interaction?.title || "",
    date: interaction?.date || new Date().toISOString().split("T")[0],
    type: interaction?.type || "Meeting (Virtual)",
    company_name: interaction?.company_name || "",
    contact_ids: interaction?.contact_ids || [],
    contact_names: interaction?.contact_names || [],
    internal_team: interaction?.internal_team || [],
    linked_clients: interaction?.linked_clients || [],
    linked_client_names: interaction?.linked_client_names || [],
    linked_campaigns: interaction?.linked_campaigns || [],
    linked_campaign_names: interaction?.linked_campaign_names || [],
    next_action_date: interaction?.next_action_date || "",
    raw_transcript: interaction?.raw_transcript || "",
    // notes: array of { id, type, text, assigned_clients: [], crossroads_tag }
    notes: interaction?.notes || [],
  });

  const companySuggestions = (() => {
    const q = form.company_name.toLowerCase().trim();
    if (!q) return [];
    const tas = tradeAccounts
      .filter(a => a.name?.toLowerCase().includes(q))
      .map(a => ({ id: a.id, name: a.name, label: a.type || "Trade Account", source: "trade" }));
    const ops = otherPartners
      .filter(p => p.name?.toLowerCase().includes(q))
      .map(p => ({ id: p.id, name: p.name, label: p.type || "Partner", source: "partner" }));
    return [...tas, ...ops].slice(0, 8);
  })();

  useEffect(() => {
    function handleClickOutside(e) {
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createMutation = useMutation({
    mutationFn: (data) => interaction
      ? base44.entities.Interaction.update(interaction.id, data)
      : base44.entities.Interaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
      onSuccess?.();
    },
  });

  const toggleClient = (client) => {
    const isLinked = form.linked_clients.includes(client.id);
    if (isLinked) {
      setForm(prev => ({
        ...prev,
        linked_clients: prev.linked_clients.filter(id => id !== client.id),
        linked_client_names: prev.linked_client_names.filter(n => n !== client.name),
        notes: prev.notes.map(n => ({
          ...n,
          assigned_clients: (n.assigned_clients || []).filter(id => id !== client.id),
        })),
      }));
    } else {
      setForm(prev => ({
        ...prev,
        linked_clients: [...prev.linked_clients, client.id],
        linked_client_names: [...prev.linked_client_names, client.name],
      }));
    }
  };

  const toggleContact = (contact) => {
    const isLinked = form.contact_ids.includes(contact.id);
    setForm(prev => ({
      ...prev,
      contact_ids: isLinked ? prev.contact_ids.filter(id => id !== contact.id) : [...prev.contact_ids, contact.id],
      contact_names: isLinked ? prev.contact_names.filter(n => n !== contact.name) : [...prev.contact_names, contact.name],
    }));
  };

  const toggleCampaign = (campaign) => {
    const isLinked = form.linked_campaigns.includes(campaign.id);
    setForm(prev => ({
      ...prev,
      linked_campaigns: isLinked ? prev.linked_campaigns.filter(id => id !== campaign.id) : [...prev.linked_campaigns, campaign.id],
      linked_campaign_names: isLinked ? prev.linked_campaign_names.filter(n => n !== campaign.name) : [...prev.linked_campaign_names, campaign.name],
    }));
  };

  const handleAiRewrite = async () => {
    const source = form.raw_transcript;
    if (!source) return;
    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional note-taker for We Define Travel, a UK travel representation company.

Parse the following raw notes/transcript and extract structured insights.
Write in clean, professional prose paragraphs — NO bullet points.

Linked clients for this meeting: ${form.linked_client_names.join(", ") || "none specified"}

For each item, classify it as:
- "general": market insights, general context, observations not tied to one client
- "client": update specifically about or for a named client
- "action": a task or follow-up that needs to happen

Raw notes:
${source}

Return a JSON array of note objects. Each object must have:
- type: "general" | "client" | "action"
- text: clean professional paragraph
- client_hint: name of the client this relates to (if type is "client"), else null`,
        response_json_schema: {
          type: "object",
          properties: {
            notes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  text: { type: "string" },
                  client_hint: { type: "string" },
                },
              },
            },
          },
        },
      });

      const parsed = (result.notes || []).map((n, i) => {
        // Auto-assign if client_hint matches a linked client
        let assigned = [];
        if (n.client_hint) {
          const match = clients.find(c =>
            c.name.toLowerCase().includes(n.client_hint.toLowerCase()) ||
            n.client_hint.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
          );
          if (match && form.linked_clients.includes(match.id)) {
            assigned = [match.id];
          }
        }
        return { id: Date.now() + i, type: n.type, text: n.text, assigned_clients: assigned, crossroads_tag: "" };
      });

      setForm(prev => ({ ...prev, notes: parsed }));
      setShowTranscript(false);
    } finally {
      setAiLoading(false);
    }
  };

  const updateNote = (idx, updated) => {
    setForm(prev => ({ ...prev, notes: prev.notes.map((n, i) => i === idx ? updated : n) }));
  };

  const removeNote = (idx) => {
    setForm(prev => ({ ...prev, notes: prev.notes.filter((_, i) => i !== idx) }));
  };

  const addBlankNote = (type = "general") => {
    setForm(prev => ({
      ...prev,
      notes: [...prev.notes, { id: Date.now(), type, text: "", assigned_clients: [...prev.linked_clients], crossroads_tag: "" }],
    }));
  };

  const assignNote = (idx, clientId) => {
    setForm(prev => {
      const note = prev.notes[idx];
      let assigned = note.assigned_clients || [];
      if (clientId === "__all__") {
        assigned = assigned.length === prev.linked_clients.length ? [] : [...prev.linked_clients];
      } else {
        assigned = assigned.includes(clientId) ? assigned.filter(id => id !== clientId) : [...assigned, clientId];
      }
      return { ...prev, notes: prev.notes.map((n, i) => i === idx ? { ...n, assigned_clients: assigned } : n) };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const linkedClients = clients.filter(c => form.linked_clients.includes(c.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up">

      {/* ── Meta ── */}
      <div className="bg-surface rounded-2xl shadow-card border border-line p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-muted text-xs mb-1.5">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} required placeholder="e.g. Call with Kuoni re: Maldives Summer" />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div ref={companyRef} className="relative">
            <Label className="text-muted text-xs mb-1.5">Company / Organisation</Label>
            <Input
              value={form.company_name}
              onChange={(e) => { setForm({ ...form, company_name: e.target.value }); setCompanyOpen(true); }}
              onFocus={() => setCompanyOpen(true)}
              className={inputClass}
              placeholder="e.g. Kuoni, Audley Travel…"
              autoComplete="off"
            />
            {companyOpen && companySuggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface border border-line rounded-xl shadow-xl overflow-hidden">
                {companySuggestions.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setForm(prev => ({ ...prev, company_name: s.name, company_id: s.id, company_type: s.source === "trade" ? "TradeAccount" : "OtherPartner" })); setCompanyOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-black/[0.03] transition-colors group"
                  >
                    <span className="text-ink text-sm group-hover:text-primary transition-colors">{s.name}</span>
                    <span className="text-faint text-[10px] bg-canvas px-2 py-0.5 rounded-full">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Next Action Date</Label>
            <Input type="date" value={form.next_action_date} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} className={inputClass} />
          </div>
        </div>

        {/* Clients */}
        <div>
          <Label className="text-muted text-xs mb-2 block">Clients in this meeting</Label>
          <div className="flex flex-wrap gap-2">
            {clients.map(c => <ClientChip key={c.id} client={c} selected={form.linked_clients.includes(c.id)} onToggle={toggleClient} />)}
          </div>
        </div>

        {/* Contacts */}
        {contacts.length > 0 && (
          <div>
            <Label className="text-muted text-xs mb-2 block">Contacts present</Label>
            <div className="flex flex-wrap gap-2">
              {contacts.map(c => (
                <button key={c.id} type="button" onClick={() => toggleContact(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${form.contact_ids.includes(c.id) ? "bg-success/20 text-success border-success/30" : "bg-canvas text-faint border-line hover:border-line-strong"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Internal Team */}
        <div>
          <Label className="text-muted text-xs mb-1.5">WDT Team</Label>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map(m => (
              <button key={m.id} type="button" onClick={() => {
                const isIn = form.internal_team.includes(m.full_name);
                setForm(prev => ({
                  ...prev,
                  internal_team: isIn
                    ? prev.internal_team.filter(n => n !== m.full_name)
                    : [...prev.internal_team, m.full_name],
                }));
              }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  form.internal_team.includes(m.full_name)
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-canvas text-faint border-line hover:border-line-strong"
                }`}>
                {m.full_name}
              </button>
            ))}
          </div>
        </div>

        {/* Campaigns */}
        {campaigns.length > 0 && (
          <div>
            <Label className="text-muted text-xs mb-2 block">Linked Campaigns</Label>
            <div className="flex flex-wrap gap-2">
              {campaigns.map(c => (
                <button key={c.id} type="button" onClick={() => toggleCampaign(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${form.linked_campaigns.includes(c.id) ? "bg-success/20 text-success border-success/30" : "bg-canvas text-faint border-line hover:border-line-strong"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Transcript + AI ── */}
      <div className="bg-surface rounded-2xl shadow-card border border-line p-5 space-y-3">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setShowTranscript(v => !v)} className="flex items-center gap-2 text-ink font-medium text-sm">
            {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Paste Notes / Transcript
          </button>
          <Button type="button" onClick={handleAiRewrite}
            disabled={aiLoading || (!form.raw_transcript)}
            className="bg-primary hover:bg-primary-hover text-white rounded-xl px-4 h-8 text-xs gap-1">
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {aiLoading ? "Processing…" : "AI Parse & Rewrite"}
          </Button>
        </div>
        {showTranscript && (
          <Textarea
            value={form.raw_transcript}
            onChange={(e) => setForm({ ...form, raw_transcript: e.target.value })}
            className={`${inputClass} min-h-[140px]`}
            placeholder="Paste raw transcript, voice notes, or bullet points. AI will rewrite into clean paragraphs and split by client…"
          />
        )}
        {form.raw_transcript && !showTranscript && (
          <p className="text-faint text-xs">Transcript saved · <button type="button" className="text-primary hover:underline" onClick={() => setShowTranscript(true)}>show</button></p>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-ink font-medium text-sm">Notes <span className="text-faint font-normal">({form.notes.length})</span></h3>
          <div className="flex gap-1.5">
            {[
              { type: "general", label: "+ General", color: "text-muted" },
              { type: "client", label: "+ Client", color: "text-primary" },
              { type: "action", label: "+ Action", color: "text-warning" },
            ].map(({ type, label, color }) => (
              <button key={type} type="button" onClick={() => addBlankNote(type)}
                className={`text-xs px-3 py-1 rounded-lg bg-canvas border border-line hover:border-line-strong ${color} transition-all`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {form.notes.length === 0 && (
          <div className="text-center py-8 rounded-2xl border border-dashed border-line">
            <Zap className="w-5 h-5 text-faint mx-auto mb-2" />
            <p className="text-faint text-sm">Paste notes above and click <span className="text-primary">AI Parse & Rewrite</span>,</p>
            <p className="text-faint text-sm">or add notes manually using the buttons above.</p>
          </div>
        )}

        {form.notes.map((note, idx) => (
          <NoteBlock
            key={note.id || idx}
            note={note}
            clients={clients}
            linkedClientIds={form.linked_clients}
            onAssign={(clientId) => assignNote(idx, clientId)}
            onUpdate={(updated) => updateNote(idx, updated)}
            onRemove={() => removeNote(idx)}
          />
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-8 h-11">
          {createMutation.isPending ? "Saving…" : interaction ? "Update Interaction" : "Save Interaction"}
        </Button>
      </div>
    </form>
  );
}