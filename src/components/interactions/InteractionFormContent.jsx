import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Plus, X, ChevronDown, ChevronUp } from "lucide-react";

const inputClass = "bg-surface-secondary border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-lg focus:border-[#7F5BFF] focus:ring-[#7F5BFF]/20";
const types = ["Meeting (In-Person)", "Meeting (Virtual)", "Call", "Email", "Event", "FAM Feedback", "Marketing Discussion"];

export default function InteractionFormContent({ interaction, onSuccess }) {
  const queryClient = useQueryClient();
  const [aiLoading, setAiLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showClientNotes, setShowClientNotes] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const [form, setForm] = useState({
    title: interaction?.title || "",
    date: interaction?.date || new Date().toISOString().split("T")[0],
    type: interaction?.type || "Meeting (Virtual)",
    company_name: interaction?.company_name || "",
    contact_names: interaction?.contact_names || [],
    internal_team: interaction?.internal_team || [],
    linked_client_names: interaction?.linked_client_names || [],
    linked_clients: interaction?.linked_clients || [],
    general_notes: interaction?.general_notes || "",
    client_specific_notes: interaction?.client_specific_notes || [],
    general_notes_assigned_clients: interaction?.general_notes_assigned_clients || [],
    next_action_date: interaction?.next_action_date || "",
    raw_transcript: interaction?.raw_transcript || "",
  });

  const [contactInput, setContactInput] = useState("");
  const [teamInput, setTeamInput] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => interaction
      ? base44.entities.Interaction.update(interaction.id, data)
      : base44.entities.Interaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
      onSuccess?.();
    },
  });

  const addContact = () => {
    if (contactInput.trim()) {
      setForm({ ...form, contact_names: [...form.contact_names, contactInput.trim()] });
      setContactInput("");
    }
  };

  const addTeamMember = () => {
    if (teamInput.trim()) {
      setForm({ ...form, internal_team: [...form.internal_team, teamInput.trim()] });
      setTeamInput("");
    }
  };

  const toggleClient = (client) => {
    const isLinked = form.linked_clients.includes(client.id);
    if (isLinked) {
      setForm({
        ...form,
        linked_clients: form.linked_clients.filter(id => id !== client.id),
        linked_client_names: form.linked_client_names.filter(n => n !== client.name),
        client_specific_notes: form.client_specific_notes.filter(n => n.client_id !== client.id),
      });
    } else {
      setForm({
        ...form,
        linked_clients: [...form.linked_clients, client.id],
        linked_client_names: [...form.linked_client_names, client.name],
      });
    }
  };

  const addClientNote = (client) => {
    if (!form.client_specific_notes.find(n => n.client_id === client.id)) {
      setForm({
        ...form,
        client_specific_notes: [...form.client_specific_notes, { client_id: client.id, client_name: client.name, notes: "", tags: [] }],
      });
    }
    setShowClientNotes(true);
  };

  const updateClientNote = (clientId, notes) => {
    setForm({
      ...form,
      client_specific_notes: form.client_specific_notes.map(n => n.client_id === clientId ? { ...n, notes } : n),
    });
  };

  const handleAiRewrite = async () => {
    const textToRewrite = form.raw_transcript || form.general_notes;
    if (!textToRewrite) return;

    setAiLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional business writer for a UK travel representation company. 
Rewrite the following meeting/interaction notes into clean, professional paragraphs. 
Do NOT use bullet points. Write in a clear, narrative style.

Identify:
1. General market insights
2. Client-specific updates (if any clients are mentioned)
3. Key action points

Notes to rewrite:
${textToRewrite}

${form.linked_client_names.length > 0 ? `Linked clients: ${form.linked_client_names.join(", ")}` : ""}`,
      response_json_schema: {
        type: "object",
        properties: {
          general_notes: { type: "string", description: "Clean paragraph-format general notes and market insights" },
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
          suggested_actions: { type: "array", items: { type: "string" } },
        },
      },
    });

    setForm(prev => ({
      ...prev,
      general_notes: result.general_notes || prev.general_notes,
      client_specific_notes: result.client_updates?.length > 0
        ? result.client_updates.map(u => {
            const client = clients.find(c => c.name.toLowerCase().includes(u.client_name.toLowerCase()));
            return { client_id: client?.id || "", client_name: u.client_name, notes: u.notes, tags: [] };
          })
        : prev.client_specific_notes,
    }));
    setAiLoading(false);
    setShowClientNotes(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up">
      {/* Basic Info */}
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} required placeholder="e.g. Call with Kuoni re: Maldives Summer" />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Company</Label>
            <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Next Action Date</Label>
            <Input type="date" value={form.next_action_date} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} className={inputClass} />
          </div>
        </div>

        {/* Contacts */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Contacts</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.contact_names.map((name, idx) => (
              <span key={idx} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white/[0.04] text-[#A1A1B5] border border-white/[0.06]">
                {name}
                <button type="button" onClick={() => setForm({ ...form, contact_names: form.contact_names.filter((_, i) => i !== idx) })}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={contactInput} onChange={(e) => setContactInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addContact(); }}} className={`${inputClass} flex-1`} placeholder="Add contact name..." />
            <Button type="button" onClick={addContact} variant="ghost" className="text-[#7F5BFF] text-xs">Add</Button>
          </div>
        </div>

        {/* Internal Team */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Internal Team</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.internal_team.map((name, idx) => (
              <span key={idx} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">
                {name}
                <button type="button" onClick={() => setForm({ ...form, internal_team: form.internal_team.filter((_, i) => i !== idx) })}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={teamInput} onChange={(e) => setTeamInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTeamMember(); }}} className={`${inputClass} flex-1`} placeholder="Add team member..." />
            <Button type="button" onClick={addTeamMember} variant="ghost" className="text-[#7F5BFF] text-xs">Add</Button>
          </div>
        </div>

        {/* Linked Clients */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Linked Clients</Label>
          <div className="flex flex-wrap gap-2">
            {clients.map(client => (
              <button
                key={client.id}
                type="button"
                onClick={() => toggleClient(client)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  form.linked_clients.includes(client.id)
                    ? "bg-[#7F5BFF]/20 text-[#7F5BFF] border border-[#7F5BFF]/30"
                    : "bg-white/[0.02] text-[#6C6C80] border border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                {client.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transcript / AI Assist */}
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setShowTranscript(!showTranscript)} className="flex items-center gap-2 text-white font-medium text-sm">
            {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Paste Transcript / Dictation
          </button>
          <Button
            type="button"
            onClick={handleAiRewrite}
            disabled={aiLoading || (!form.raw_transcript && !form.general_notes)}
            className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-4 h-8 text-xs"
          >
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
            AI Rewrite
          </Button>
        </div>
        {showTranscript && (
          <Textarea
            value={form.raw_transcript}
            onChange={(e) => setForm({ ...form, raw_transcript: e.target.value })}
            className={`${inputClass} min-h-[120px]`}
            placeholder="Paste your meeting transcript, voice notes, or raw text here. AI will clean it up..."
          />
        )}
      </div>

      {/* General Notes */}
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5">
        <Label className="text-[#A1A1B5] text-xs mb-2 block">General Notes</Label>
        <Textarea
          value={form.general_notes}
          onChange={(e) => setForm({ ...form, general_notes: e.target.value })}
          className={`${inputClass} min-h-[120px]`}
          placeholder="Meeting notes, market insights, general observations..."
        />
      </div>

      {/* Client-Specific Notes */}
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setShowClientNotes(!showClientNotes)} className="flex items-center gap-2 text-white font-medium text-sm">
            {showClientNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Client-Specific Notes ({form.client_specific_notes.length})
          </button>
          {form.linked_clients.length > 0 && (
            <div className="flex gap-1">
              {form.linked_clients.map(cid => {
                const client = clients.find(c => c.id === cid);
                if (!client) return null;
                return (
                  <Button key={cid} type="button" onClick={() => addClientNote(client)} variant="ghost" className="text-[#7F5BFF] text-xs h-7 px-2">
                    <Plus className="w-3 h-3 mr-1" />{client.name}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
        {showClientNotes && form.client_specific_notes.map((csn, idx) => (
          <div key={idx} className="bg-surface-secondary rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#7F5BFF] text-sm font-medium">{csn.client_name}</span>
              <button type="button" onClick={() => setForm({ ...form, client_specific_notes: form.client_specific_notes.filter((_, i) => i !== idx) })}>
                <X className="w-4 h-4 text-[#6C6C80]" />
              </button>
            </div>
            <Textarea
              value={csn.notes}
              onChange={(e) => updateClientNote(csn.client_id, e.target.value)}
              className={`${inputClass} min-h-[80px]`}
              placeholder={`Notes specific to ${csn.client_name}...`}
            />
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-8 h-11">
          {createMutation.isPending ? "Saving..." : interaction ? "Update Interaction" : "Save Interaction"}
        </Button>
      </div>
    </form>
  );
}