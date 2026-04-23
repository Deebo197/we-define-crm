import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, X, ChevronDown, ChevronUp, Plus } from "lucide-react";

const inputClass = "bg-surface-secondary border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-lg focus:border-[#7F5BFF] focus:ring-[#7F5BFF]/20";
const types = ["Meeting (In-Person)", "Meeting (Virtual)", "Call", "Email", "Event", "FAM Feedback", "Marketing Discussion"];

// CROSSROADS client names (case-insensitive check)
const CROSSROADS_NAMES = ["hard rock", "saii lagoon", "saïi lagoon"];
const isCrossroads = (name) => CROSSROADS_NAMES.some(n => name?.toLowerCase().includes(n));
const CROSSROADS_TAGS = ["Hard Rock", "SAii", "Both (CROSSROADS)"];

function Chip({ label, active, onClick, color = "purple" }) {
  const colors = {
    purple: active ? "bg-[#7F5BFF]/20 text-[#7F5BFF] border-[#7F5BFF]/30" : "bg-white/[0.02] text-[#6C6C80] border-white/[0.06] hover:border-white/[0.12]",
    teal:   active ? "bg-[#3DDC97]/20 text-[#3DDC97] border-[#3DDC97]/30" : "bg-white/[0.02] text-[#6C6C80] border-white/[0.06] hover:border-white/[0.12]",
    amber:  active ? "bg-[#FFB547]/20 text-[#FFB547] border-[#FFB547]/30" : "bg-white/[0.02] text-[#6C6C80] border-white/[0.06] hover:border-white/[0.12]",
    rose:   active ? "bg-[#FF5C7A]/20 text-[#FF5C7A] border-[#FF5C7A]/30" : "bg-white/[0.02] text-[#6C6C80] border-white/[0.06] hover:border-white/[0.12]",
  };
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${colors[color]}`}>
      {label}
    </button>
  );
}

export default function InteractionFormContent({ interaction, onSuccess }) {
  const queryClient = useQueryClient();
  const [aiLoading, setAiLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(!interaction);
  const [showClientNotes, setShowClientNotes] = useState(!!interaction?.client_specific_notes?.length);
  const [teamInput, setTeamInput] = useState("");

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => base44.entities.Contact.list() });
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => base44.entities.Campaign.list() });

  const [form, setForm] = useState({
    title: interaction?.title || "",
    date: interaction?.date || new Date().toISOString().split("T")[0],
    type: interaction?.type || "Meeting (Virtual)",
    company_name: interaction?.company_name || "",
    company_type: interaction?.company_type || "",
    company_id: interaction?.company_id || "",
    contact_ids: interaction?.contact_ids || [],
    contact_names: interaction?.contact_names || [],
    internal_team: interaction?.internal_team || [],
    linked_clients: interaction?.linked_clients || [],
    linked_client_names: interaction?.linked_client_names || [],
    linked_campaigns: interaction?.linked_campaigns || [],
    linked_campaign_names: interaction?.linked_campaign_names || [],
    general_notes: interaction?.general_notes || "",
    general_notes_assigned_clients: interaction?.general_notes_assigned_clients || [],
    client_specific_notes: interaction?.client_specific_notes || [],
    next_action_date: interaction?.next_action_date || "",
    raw_transcript: interaction?.raw_transcript || "",
  });

  const [aiActionPoints, setAiActionPoints] = useState([]);

  const saveMutation = useMutation({
    mutationFn: (data) => interaction
      ? base44.entities.Interaction.update(interaction.id, data)
      : base44.entities.Interaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
      onSuccess?.();
    },
  });

  // ── Contacts ──────────────────────────────────────────────────
  const toggleContact = (contact) => {
    const linked = form.contact_ids.includes(contact.id);
    setForm(f => ({
      ...f,
      contact_ids: linked ? f.contact_ids.filter(id => id !== contact.id) : [...f.contact_ids, contact.id],
      contact_names: linked ? f.contact_names.filter(n => n !== contact.name) : [...f.contact_names, contact.name],
    }));
  };

  // ── Clients ───────────────────────────────────────────────────
  const toggleClient = (client) => {
    const linked = form.linked_clients.includes(client.id);
    if (linked) {
      setForm(f => ({
        ...f,
        linked_clients: f.linked_clients.filter(id => id !== client.id),
        linked_client_names: f.linked_client_names.filter(n => n !== client.name),
        client_specific_notes: f.client_specific_notes.filter(n => n.client_id !== client.id),
        general_notes_assigned_clients: f.general_notes_assigned_clients.filter(id => id !== client.id),
      }));
    } else {
      setForm(f => ({
        ...f,
        linked_clients: [...f.linked_clients, client.id],
        linked_client_names: [...f.linked_client_names, client.name],
      }));
    }
  };

  // ── Campaigns ─────────────────────────────────────────────────
  const toggleCampaign = (campaign) => {
    const linked = form.linked_campaigns.includes(campaign.id);
    setForm(f => ({
      ...f,
      linked_campaigns: linked ? f.linked_campaigns.filter(id => id !== campaign.id) : [...f.linked_campaigns, campaign.id],
      linked_campaign_names: linked ? f.linked_campaign_names.filter(n => n !== campaign.name) : [...f.linked_campaign_names, campaign.name],
    }));
  };

  // ── General notes client assignment ───────────────────────────
  const toggleGeneralNoteClient = (clientId) => {
    setForm(f => ({
      ...f,
      general_notes_assigned_clients: f.general_notes_assigned_clients.includes(clientId)
        ? f.general_notes_assigned_clients.filter(id => id !== clientId)
        : [...f.general_notes_assigned_clients, clientId],
    }));
  };

  // ── Client-specific notes ─────────────────────────────────────
  const ensureClientNote = (client) => {
    if (!form.client_specific_notes.find(n => n.client_id === client.id)) {
      setForm(f => ({
        ...f,
        client_specific_notes: [...f.client_specific_notes, {
          client_id: client.id,
          client_name: client.name,
          notes: "",
          tags: [],
          crossroads_tag: isCrossroads(client.name) ? "" : undefined,
        }],
      }));
    }
    setShowClientNotes(true);
  };

  const updateClientNote = (clientId, notes) => {
    setForm(f => ({ ...f, client_specific_notes: f.client_specific_notes.map(n => n.client_id === clientId ? { ...n, notes } : n) }));
  };

  const updateClientNoteTag = (clientId, tag) => {
    setForm(f => ({ ...f, client_specific_notes: f.client_specific_notes.map(n => n.client_id === clientId ? { ...n, crossroads_tag: n.crossroads_tag === tag ? "" : tag } : n) }));
  };

  const removeClientNote = (clientId) => {
    setForm(f => ({ ...f, client_specific_notes: f.client_specific_notes.filter(n => n.client_id !== clientId) }));
  };

  // ── Team ──────────────────────────────────────────────────────
  const addTeamMember = () => {
    if (teamInput.trim()) {
      setForm(f => ({ ...f, internal_team: [...f.internal_team, teamInput.trim()] }));
      setTeamInput("");
    }
  };

  // ── AI Rewrite ────────────────────────────────────────────────
  const handleAiRewrite = async () => {
    const source = form.raw_transcript || form.general_notes;
    if (!source) return;
    setAiLoading(true);
    setAiActionPoints([]);

    const linkedClientsList = form.linked_client_names.length > 0
      ? `Clients in this meeting: ${form.linked_client_names.join(", ")}`
      : "";

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional business writer for We Define Travel, a UK travel representation company.

Rewrite the following meeting notes into clean, professional prose. NO bullet points.

${linkedClientsList}

Notes:
${source}

Instructions:
- general_notes: broad market insights, relationship context, general meeting observations — NOT specific to one client.
- client_updates: array of {client_name, notes} — only include if notes are clearly specific to that client. client_name must match one of the linked clients exactly.
- action_points: concise list of follow-up actions extracted from the notes (strings).`,
      response_json_schema: {
        type: "object",
        properties: {
          general_notes: { type: "string" },
          client_updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                client_name: { type: "string" },
                notes: { type: "string" },
              },
            },
          },
          action_points: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    });

    setForm(prev => {
      const newClientNotes = result.client_updates?.length > 0
        ? result.client_updates.map(u => {
            const client = clients.find(c => c.name.toLowerCase().includes(u.client_name.toLowerCase()) || u.client_name.toLowerCase().includes(c.name.toLowerCase()));
            return {
              client_id: client?.id || "",
              client_name: client?.name || u.client_name,
              notes: u.notes,
              tags: [],
              crossroads_tag: client && isCrossroads(client.name) ? "" : undefined,
            };
          })
        : prev.client_specific_notes;

      return {
        ...prev,
        general_notes: result.general_notes || prev.general_notes,
        client_specific_notes: newClientNotes,
      };
    });

    if (result.action_points?.length > 0) {
      setAiActionPoints(result.action_points);
      setShowClientNotes(true);
    } else {
      setShowClientNotes(true);
    }
    setAiLoading(false);
    setShowTranscript(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const linkedClientObjects = form.linked_clients.map(id => clients.find(c => c.id === id)).filter(Boolean);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up">

      {/* ── Basic Info ── */}
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} required placeholder="e.g. Call with Kuoni re: Maldives Summer" />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Company / Trade Partner</Label>
            <Input value={form.company_name} onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))} className={inputClass} placeholder="e.g. Kuoni UK" />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Next Action Date</Label>
            <Input type="date" value={form.next_action_date} onChange={(e) => setForm(f => ({ ...f, next_action_date: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Linked Clients — prominent */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-2 block">Clients in this Interaction</Label>
          {clients.length === 0
            ? <p className="text-[#6C6C80] text-xs">No clients yet.</p>
            : <div className="flex flex-wrap gap-2">
                {clients.map(c => (
                  <Chip key={c.id} label={c.name} active={form.linked_clients.includes(c.id)} onClick={() => toggleClient(c)} />
                ))}
              </div>
          }
        </div>

        {/* Contacts */}
        {contacts.length > 0 && (
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-2 block">Contacts Present</Label>
            <div className="flex flex-wrap gap-2">
              {contacts.map(c => (
                <Chip key={c.id} label={c.name} active={form.contact_ids.includes(c.id)} onClick={() => toggleContact(c)} color="teal" />
              ))}
            </div>
          </div>
        )}

        {/* Internal Team */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">WDT Team Members</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.internal_team.map((name, idx) => (
              <span key={idx} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">
                {name}
                <button type="button" onClick={() => setForm(f => ({ ...f, internal_team: f.internal_team.filter((_, i) => i !== idx) }))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={teamInput} onChange={(e) => setTeamInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTeamMember(); }}}
              className={`${inputClass} flex-1`} placeholder="Add name & press Enter..." />
            <Button type="button" onClick={addTeamMember} variant="ghost" className="text-[#7F5BFF] text-xs">Add</Button>
          </div>
        </div>

        {/* Campaigns */}
        {campaigns.length > 0 && (
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-2 block">Related Campaigns</Label>
            <div className="flex flex-wrap gap-2">
              {campaigns.map(c => (
                <Chip key={c.id} label={c.name} active={form.linked_campaigns.includes(c.id)} onClick={() => toggleCampaign(c)} color="amber" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Transcript + AI ── */}
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setShowTranscript(v => !v)} className="flex items-center gap-2 text-white font-medium text-sm">
            {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Paste Notes / Transcript
          </button>
          <Button type="button" onClick={handleAiRewrite}
            disabled={aiLoading || (!form.raw_transcript && !form.general_notes)}
            className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-4 h-8 text-xs">
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {aiLoading ? "Processing…" : "AI Rewrite"}
          </Button>
        </div>
        {showTranscript && (
          <Textarea value={form.raw_transcript}
            onChange={(e) => setForm(f => ({ ...f, raw_transcript: e.target.value }))}
            className={`${inputClass} min-h-[140px]`}
            placeholder="Paste raw transcript, voice notes, or bullet-point jottings. AI will identify general insights, client-specific updates, and action points." />
        )}
      </div>

      {/* ── Action Points (from AI) ── */}
      {aiActionPoints.length > 0 && (
        <div className="bg-surface rounded-2xl border border-[#FFB547]/20 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[#FFB547] text-xs font-semibold uppercase tracking-wider">AI-Extracted Action Points</p>
            <button type="button" onClick={() => setAiActionPoints([])} className="text-[#6C6C80] hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <ul className="space-y-1.5">
            {aiActionPoints.map((ap, i) => (
              <li key={i} className="flex items-start gap-2 text-[#A1A1B5] text-sm">
                <span className="text-[#FFB547] mt-0.5">›</span>
                {ap}
              </li>
            ))}
          </ul>
          <p className="text-[#6C6C80] text-xs">These are suggestions — save them as Actions from the Actions page.</p>
        </div>
      )}

      {/* ── General Notes ── */}
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[#A1A1B5] text-xs">General Notes</Label>
          {linkedClientObjects.length > 0 && (
            <span className="text-[#6C6C80] text-xs">Toggle to assign to clients →</span>
          )}
        </div>
        <Textarea value={form.general_notes}
          onChange={(e) => setForm(f => ({ ...f, general_notes: e.target.value }))}
          className={`${inputClass} min-h-[110px]`}
          placeholder="Market insights, general context, meeting atmosphere…" />

        {/* Assign general notes to clients */}
        {linkedClientObjects.length > 0 && (
          <div>
            <p className="text-[#6C6C80] text-xs mb-2">Assign to clients for reporting:</p>
            <div className="flex flex-wrap gap-2">
              {linkedClientObjects.map(client => (
                <button key={client.id} type="button" onClick={() => toggleGeneralNoteClient(client.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                    form.general_notes_assigned_clients.includes(client.id)
                      ? "bg-[#FFB547]/20 text-[#FFB547] border-[#FFB547]/30"
                      : "bg-white/[0.02] text-[#6C6C80] border-white/[0.06] hover:border-white/[0.12]"
                  }`}>
                  {client.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Client-Specific Notes ── */}
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button type="button" onClick={() => setShowClientNotes(v => !v)} className="flex items-center gap-2 text-white font-medium text-sm">
            {showClientNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Client-Specific Notes
            {form.client_specific_notes.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#7F5BFF]/20 text-[#7F5BFF] text-xs">{form.client_specific_notes.length}</span>
            )}
          </button>
          {linkedClientObjects.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {linkedClientObjects.map(client => {
                const has = form.client_specific_notes.find(n => n.client_id === client.id);
                return (
                  <button key={client.id} type="button" onClick={() => ensureClientNote(client)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all border ${
                      has ? "bg-[#3DDC97]/10 text-[#3DDC97] border-[#3DDC97]/20" : "bg-white/[0.02] text-[#6C6C80] border-white/[0.06] hover:border-[#7F5BFF]/30 hover:text-[#7F5BFF]"
                    }`}>
                    <Plus className="w-3 h-3" />{client.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {showClientNotes && form.client_specific_notes.map((csn, idx) => {
          const showCrossroads = isCrossroads(csn.client_name);
          return (
            <div key={csn.client_id || idx} className="bg-surface-secondary rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#7F5BFF] text-sm font-semibold">{csn.client_name}</span>
                <button type="button" onClick={() => removeClientNote(csn.client_id)}>
                  <X className="w-4 h-4 text-[#6C6C80] hover:text-white" />
                </button>
              </div>
              <Textarea value={csn.notes} onChange={(e) => updateClientNote(csn.client_id, e.target.value)}
                className={`${inputClass} min-h-[80px]`}
                placeholder={`Notes specific to ${csn.client_name} only…`} />
              {showCrossroads && (
                <div>
                  <p className="text-[#6C6C80] text-xs mb-1.5">Tag for reporting:</p>
                  <div className="flex gap-2">
                    {CROSSROADS_TAGS.map(tag => (
                      <button key={tag} type="button" onClick={() => updateClientNoteTag(csn.client_id, tag)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition-all border ${
                          csn.crossroads_tag === tag
                            ? "bg-[#7F5BFF]/20 text-[#7F5BFF] border-[#7F5BFF]/30"
                            : "bg-white/[0.02] text-[#6C6C80] border-white/[0.06] hover:border-white/[0.12]"
                        }`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {showClientNotes && form.client_specific_notes.length === 0 && (
          <p className="text-[#6C6C80] text-xs text-center py-2">Select a client above to add specific notes.</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pb-2">
        <Button type="submit" disabled={saveMutation.isPending}
          className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-8 h-11">
          {saveMutation.isPending ? "Saving…" : interaction ? "Update Interaction" : "Save Interaction"}
        </Button>
      </div>
    </form>
  );
}