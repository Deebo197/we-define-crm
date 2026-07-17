import React, { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActivePeople } from "@/api/people";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, X, ChevronDown, ChevronUp, Zap, Search, Plus, User, KanbanSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import {
  STAGES,
  STAGE_TONES,
  TIERS,
  TIER_TONES,
  isPipelineEligible,
  usePipelineLinks,
  applyInteractionToPair,
  updateCompanyTier,
} from "@/api/pipeline";

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
    <div className="flex flex-wrap gap-1.5 mt-2">
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

// Section card with a small uppercase heading
function Section({ title, action, children }) {
  return (
    <section className="bg-surface rounded-2xl shadow-card border border-line p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// Contact picker: never lists all 2,000+ contacts.
// Shows the selected company's contacts as quick-select chips, plus a
// type-ahead search (2+ chars, max 8 results) over the cached list.
function ContactPicker({ contacts, companyName, companyId, contactIds, contactNames, onAdd, onRemove }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Contacts at the selected company: prefer company_id, fall back to name match
  const companyContacts = useMemo(() => {
    if (companyId) {
      const byId = contacts.filter(c => c.company_id === companyId);
      if (byId.length > 0) return byId;
    }
    const cn = (companyName || "").trim().toLowerCase();
    if (!cn) return [];
    return contacts.filter(c => (c.company_name || "").trim().toLowerCase() === cn);
  }, [contacts, companyId, companyName]);

  const quickPicks = companyContacts.filter(c => !contactIds.includes(c.id)).slice(0, 20);

  const q = query.trim().toLowerCase();
  const searchMatches = q.length >= 2
    ? contacts
        .filter(c => !contactIds.includes(c.id))
        .filter(c => c.name?.toLowerCase().includes(q))
        .slice(0, 8)
    : [];

  // Selected pills — name from cache when available, fall back to stored names
  const selected = contactIds.map((id, i) => {
    const c = contacts.find(x => x.id === id);
    return { id, name: c?.name || contactNames[i] || "Unknown contact", company: c?.company_name || "" };
  });

  const cn = (companyName || "").trim().toLowerCase();

  return (
    <div className="space-y-3">
      {/* Selected contacts */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(p => (
            <span key={p.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl text-xs font-medium bg-success/15 text-success border border-success/30 max-w-full">
              <span className="truncate">{p.name}</span>
              {p.company && p.company.trim().toLowerCase() !== cn && (
                <span className="text-success/70 text-[10px] truncate">· {p.company}</span>
              )}
              <button type="button" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`}
                className="rounded-full p-0.5 hover:bg-success/20 transition-colors shrink-0">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Quick picks from the selected company */}
      {quickPicks.length > 0 && (
        <div>
          <p className="text-faint text-[11px] mb-1.5">Contacts at {companyName}</p>
          <div className="flex flex-wrap gap-1.5">
            {quickPicks.map(c => (
              <button key={c.id} type="button" onClick={() => onAdd(c)}
                className="px-2.5 py-1 rounded-xl text-xs font-medium border bg-canvas text-muted border-line hover:border-success/40 hover:text-success transition-all">
                + {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type-ahead search over all contacts */}
      <div ref={searchRef} className="relative">
        <Search className="w-3.5 h-3.5 text-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search all contacts…"
          autoComplete="off"
          className={`${inputClass} pl-8 h-9 text-sm`}
        />
        {open && q.length >= 2 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface border border-line rounded-xl shadow-xl overflow-hidden">
            {searchMatches.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-faint">No contacts match “{query}”</p>
            ) : (
              searchMatches.map(c => (
                <button key={c.id} type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onAdd(c); setQuery(""); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/[0.03] transition-colors group">
                  <User className="w-3.5 h-3.5 text-faint shrink-0" />
                  <span className="text-ink text-sm group-hover:text-primary transition-colors truncate">{c.name}</span>
                  {c.company_name && (
                    <span className="text-faint text-[10px] bg-canvas px-2 py-0.5 rounded-full ml-auto shrink-0 max-w-[140px] truncate">{c.company_name}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {q.length > 0 && q.length < 2 && (
        <p className="text-faint text-[11px]">Type 2+ letters to search contacts</p>
      )}
    </div>
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
  const [showCampaigns, setShowCampaigns] = useState((interaction?.linked_campaigns?.length || 0) > 0);

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  // Shared contacts cache (same key + queryFn as Todos / Contacts) — 2,000+
  // records fetched once and searched client-side; never rendered in full.
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => listActivePeople("-created_date"),
    staleTime: 10 * 60 * 1000,
  });
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => base44.entities.Campaign.list() });
  const { data: teamMembers = [] } = useQuery({ queryKey: ["team-members"], queryFn: () => base44.entities.TeamMember.filter({ status: "Active" }) });
  const { data: tradeAccounts = [] } = useQuery({ queryKey: ["trade-accounts"], queryFn: () => listActiveTradeAccounts() });
  const { data: otherPartners = [] } = useQuery({ queryKey: ["otherpartners"], queryFn: () => base44.entities.OtherPartner.list() });

  const [companyOpen, setCompanyOpen] = useState(false);
  const companyRef = useRef(null);
  const { user } = useAuth();
  const { data: pipelineLinks = [] } = usePipelineLinks();

  // Pipeline stage changes chosen while logging: { [clientId]: stage }
  const [pipelineUpdates, setPipelineUpdates] = useState(() => {
    const m = {};
    for (const u of interaction?.pipeline_updates || []) m[u.client_id] = u.stage;
    return m;
  });
  // Optional partner-tier change chosen while logging ("" = no change)
  const [pipelineTier, setPipelineTier] = useState("");

  const [form, setForm] = useState({
    title: interaction?.title || "",
    date: interaction?.date || new Date().toISOString().split("T")[0],
    type: interaction?.type || "Meeting (Virtual)",
    company_name: interaction?.company_name || "",
    company_id: interaction?.company_id || "",
    company_type: interaction?.company_type || "",
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
      .map(a => ({ id: a.id, name: a.name, label: a.type || "Company", source: "trade" }));
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
    onSuccess: async (saved, submitted) => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });

      // Apply pipeline stage/tier changes driven by this interaction
      const updates = submitted.pipeline_updates || [];
      const company = tradeAccounts.find((a) => a.id === submitted.company_id);
      if (company && updates.length > 0) {
        const interactionId = saved?.id || interaction?.id || "";
        for (const u of updates) {
          try {
            await applyInteractionToPair({
              links: pipelineLinks,
              client: { id: u.client_id, name: u.client_name },
              company,
              stage: u.stage,
              by: user?.email,
              ownerName: user?.full_name,
              interactionId,
            });
          } catch (err) {
            toast.error(`Pipeline update failed for ${u.client_name}: ${err.message}`);
          }
        }
        queryClient.invalidateQueries({ queryKey: ["client-trade-links"] });
      }
      if (company && pipelineTier && pipelineTier !== company.tier) {
        try {
          await updateCompanyTier(company.id, pipelineTier);
          queryClient.invalidateQueries({ queryKey: ["trade-accounts"] });
        } catch (err) {
          toast.error(`Failed to set ${company.name}'s tier: ${err.message}`);
        }
      }

      toast.success(interaction ? "Interaction updated" : "Interaction logged");
      onSuccess?.();
    },
    onError: () => {
      toast.error("Couldn’t save the interaction — please try again");
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

  const addContact = (contact) => {
    setForm(prev => {
      if (prev.contact_ids.includes(contact.id)) return prev;
      return {
        ...prev,
        contact_ids: [...prev.contact_ids, contact.id],
        contact_names: [...prev.contact_names, contact.name],
      };
    });
  };

  const removeContact = (contactId) => {
    setForm(prev => {
      const idx = prev.contact_ids.indexOf(contactId);
      if (idx === -1) return prev;
      return {
        ...prev,
        contact_ids: prev.contact_ids.filter(id => id !== contactId),
        contact_names: prev.contact_names.filter((_, i) => i !== idx),
      };
    });
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
    const pipeline_updates = Object.entries(pipelineUpdates)
      .filter(([clientId, stage]) => stage && form.linked_clients.includes(clientId))
      .map(([clientId, stage]) => ({
        client_id: clientId,
        client_name: clients.find((c) => c.id === clientId)?.name || "",
        stage,
      }));
    createMutation.mutate({ ...form, pipeline_updates });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up pb-2">

      {/* ① Basics */}
      <Section title="Basics">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted text-xs mb-1.5">Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Next Action Date</Label>
            <Input type="date" value={form.next_action_date} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-muted text-xs mb-1.5 block">Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {types.map(t => (
                <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                    form.type === t
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-canvas text-faint border-line hover:border-line-strong"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-muted text-xs mb-1.5">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} required placeholder="e.g. Kuoni product meeting" />
          </div>
        </div>
      </Section>

      {/* ② Company & contacts */}
      <Section title="Company & Contacts">
        <div ref={companyRef} className="relative">
          <Label className="text-muted text-xs mb-1.5">Company / Organisation</Label>
          <Input
            value={form.company_name}
            onChange={(e) => { setForm({ ...form, company_name: e.target.value, company_id: "", company_type: "" }); setCompanyOpen(true); }}
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
          <Label className="text-muted text-xs mb-1.5 block">Contacts present</Label>
          <ContactPicker
            contacts={contacts}
            companyName={form.company_name}
            companyId={form.company_id}
            contactIds={form.contact_ids}
            contactNames={form.contact_names}
            onAdd={addContact}
            onRemove={removeContact}
          />
        </div>
      </Section>

      {/* ③ WDT clients */}
      <Section title="WDT Clients">
        <div className="flex flex-wrap gap-2">
          {clients.map(c => <ClientChip key={c.id} client={c} selected={form.linked_clients.includes(c.id)} onToggle={toggleClient} />)}
        </div>
      </Section>

      {/* ③b Pipeline — stage/tier updates driven by this conversation */}
      {(() => {
        const pipelineCompany = form.company_type === "TradeAccount"
          ? tradeAccounts.find(a => a.id === form.company_id)
          : null;
        if (!pipelineCompany || !isPipelineEligible(pipelineCompany)) return null;
        return (
          <Section title="Pipeline">
            <p className="text-xs text-faint -mt-1 mb-2 flex items-center gap-1.5">
              <KanbanSquare className="w-3.5 h-3.5" />
              Did this conversation move {pipelineCompany.name} for any client? Leave as “No change” otherwise.
            </p>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm text-ink w-40">Partner tier</span>
              {pipelineCompany.tier && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${TIER_TONES[pipelineCompany.tier] || ""}`}>
                  {pipelineCompany.tier}
                </span>
              )}
              <select
                value={pipelineTier}
                onChange={(e) => setPipelineTier(e.target.value)}
                className="ml-auto h-8 text-xs rounded-lg border border-line bg-surface px-2 text-ink"
              >
                <option value="">No change</option>
                {TIERS.map(t => <option key={t} value={t}>→ {t}</option>)}
              </select>
            </div>
            {form.linked_clients.length === 0 && (
              <p className="text-xs text-faint">Link a WDT client above to tag the pipeline stage for this conversation.</p>
            )}
            <div className="space-y-2">
              {form.linked_clients.map(clientId => {
                const client = clients.find(c => c.id === clientId);
                if (!client || client.is_internal) return null;
                const pair = pipelineLinks.find(l => l.client_id === clientId && l.trade_account_id === pipelineCompany.id);
                const current = pair ? (pair.closed_status ? `Closed: ${pair.closed_status}` : pair.stage) : "Not in pipeline";
                return (
                  <div key={clientId} className="flex items-center gap-3">
                    <span className="text-sm text-ink w-40 truncate">{client.name}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${pair && !pair.closed_status ? STAGE_TONES[pair.stage] || "" : "text-faint border-line"}`}>
                      {current}
                    </span>
                    <select
                      value={pipelineUpdates[clientId] || ""}
                      onChange={(e) => setPipelineUpdates(prev => ({ ...prev, [clientId]: e.target.value }))}
                      className="ml-auto h-8 text-xs rounded-lg border border-line bg-surface px-2 text-ink"
                    >
                      <option value="">No change</option>
                      {STAGES.map(s => <option key={s} value={s}>→ {s}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })()}

      {/* ④ Internal team */}
      <Section title="WDT Team">
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
      </Section>

      {/* ⑤ Campaigns — collapsed behind a subtle affordance when none linked */}
      {campaigns.length > 0 && (
        showCampaigns || form.linked_campaigns.length > 0 ? (
          <Section title="Campaigns">
            <div className="flex flex-wrap gap-2">
              {campaigns.map(c => (
                <button key={c.id} type="button" onClick={() => toggleCampaign(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${form.linked_campaigns.includes(c.id) ? "bg-success/20 text-success border-success/30" : "bg-canvas text-faint border-line hover:border-line-strong"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </Section>
        ) : (
          <button type="button" onClick={() => setShowCampaigns(true)}
            className="flex items-center gap-1.5 px-1 text-xs text-faint hover:text-primary transition-colors">
            <Plus className="w-3.5 h-3.5" /> Link campaign
          </button>
        )
      )}

      {/* ⑥ Notes — transcript + AI */}
      <Section
        title="Notes"
        action={
          <Button type="button" onClick={handleAiRewrite}
            disabled={aiLoading || (!form.raw_transcript)}
            className="bg-primary hover:bg-primary-hover text-white rounded-xl px-4 h-8 text-xs gap-1">
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {aiLoading ? "Processing…" : "AI Parse & Rewrite"}
          </Button>
        }
      >
        <button type="button" onClick={() => setShowTranscript(v => !v)} className="flex items-center gap-2 text-ink font-medium text-sm">
          {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Paste Notes / Transcript
        </button>
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

        <div className="flex items-center justify-between pt-1">
          <h3 className="text-ink font-medium text-sm">Note blocks <span className="text-faint font-normal">({form.notes.length})</span></h3>
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
      </Section>

      {/* Sticky submit bar */}
      <div className="sticky bottom-0 z-20 -mx-1 px-1">
        <div className="bg-surface border-t border-line rounded-t-2xl shadow-card px-5 py-3 flex justify-end">
          <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-8 h-11">
            {createMutation.isPending ? "Saving…" : interaction ? "Save Changes" : "Log Interaction"}
          </Button>
        </div>
      </div>
    </form>
  );
}
