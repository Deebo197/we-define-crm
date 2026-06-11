import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Pencil, Trash2, Building2, Calendar, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import StatusBadge from "@/components/ui/StatusBadge";
import ShimmerCard from "@/components/ui/ShimmerCard";
import InteractionFormContent from "@/components/interactions/InteractionFormContent";

const typeIcons = {
  "Meeting (In-Person)": "🤝",
  "Meeting (Virtual)": "💻",
  "Call": "📞",
  "Email": "✉️",
  "Event": "🎉",
  "FAM Feedback": "✈️",
  "Marketing Discussion": "📊",
};

export default function InteractionDetail() {
  const { id, mode } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new";
  const isEdit = mode === "edit";

  const { data: interaction, isLoading } = useQuery({
    queryKey: ["interaction", id],
    queryFn: async () => {
      const list = await base44.entities.Interaction.filter({ id });
      return list[0];
    },
    enabled: !!id && !isNew,
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Interaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
      navigate("/interactions");
    },
  });

  // --- NEW interaction form ---
  if (isNew) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/interactions")} className="text-[#6C6C80] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-white">Log Interaction</h1>
        </div>
        <InteractionFormContent onSuccess={() => navigate("/interactions")} />
      </div>
    );
  }

  if (isLoading) return <div className="py-12"><ShimmerCard count={3} /></div>;
  if (!interaction) return <div className="text-[#6C6C80] py-12 text-center">Interaction not found</div>;

  // --- EDIT interaction form ---
  if (isEdit) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/interactions/${id}`)} className="text-[#6C6C80] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-white">Edit Interaction</h1>
        </div>
        <InteractionFormContent
          interaction={interaction}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["interaction", id] });
            queryClient.invalidateQueries({ queryKey: ["interactions"] });
            navigate(`/interactions/${id}`);
          }}
        />
      </div>
    );
  }

  // --- VIEW detail ---
  const noteTypeColors = {
    general: { label: "Market / General", bg: "bg-white/[0.02]", text: "text-[#A1A1B5]", border: "border-white/[0.06]" },
    client:  { label: "Client Update",    bg: "bg-[#7F5BFF]/5",   text: "text-[#7F5BFF]",  border: "border-[#7F5BFF]/20" },
    action:  { label: "Action Point",     bg: "bg-[#FFB547]/5",   text: "text-[#FFB547]",  border: "border-[#FFB547]/20" },
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/interactions")} className="text-[#6C6C80] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl">{typeIcons[interaction.type] || "💬"}</span>
          <h1 className="text-xl font-semibold text-white truncate">{interaction.title}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/interactions/${id}/edit`)} className="text-[#A1A1B5] hover:text-white shrink-0">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this interaction?")) deleteMutation.mutate(); }} className="text-[#FF5C7A] hover:text-[#FF5C7A] shrink-0">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Meta grid */}
        <div className="bg-surface rounded-2xl border border-white/[0.06] p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[#6C6C80] text-xs mb-1">Type</p>
              <p className="text-white text-sm">{interaction.type}</p>
            </div>
            <div>
              <p className="text-[#6C6C80] text-xs mb-1">Date</p>
              <p className="text-white text-sm flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#6C6C80]" />
                {interaction.date && format(new Date(interaction.date), "MMMM d, yyyy")}
              </p>
            </div>
            {interaction.company_name && (
              <div>
                <p className="text-[#6C6C80] text-xs mb-1">Company</p>
                <p className="text-white text-sm flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#6C6C80]" />
                  {interaction.company_name}
                </p>
              </div>
            )}
            {interaction.linked_client_names?.length > 0 && (
              <div>
                <p className="text-[#6C6C80] text-xs mb-1">Linked Clients</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {interaction.linked_client_names.map(n => (
                    <span key={n} className="px-2 py-0.5 rounded-full text-[10px] bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">{n}</span>
                  ))}
                </div>
              </div>
            )}
            {interaction.contact_names?.length > 0 && (
              <div>
                <p className="text-[#6C6C80] text-xs mb-1">Contacts</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {interaction.contact_names.map(n => (
                    <span key={n} className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-[#A1A1B5] border border-white/[0.06]">{n}</span>
                  ))}
                </div>
              </div>
            )}
            {interaction.internal_team?.length > 0 && (
              <div>
                <p className="text-[#6C6C80] text-xs mb-1">WDT Team</p>
                <p className="text-white text-sm">{interaction.internal_team.join(", ")}</p>
              </div>
            )}
            {interaction.next_action_date && (
              <div>
                <p className="text-[#6C6C80] text-xs mb-1">Next Action Date</p>
                <p className="text-white text-sm flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5 text-[#FFB547]" />
                  {format(new Date(interaction.next_action_date), "MMM d, yyyy")}
                </p>
              </div>
            )}
            {interaction.linked_campaign_names?.length > 0 && (
              <div>
                <p className="text-[#6C6C80] text-xs mb-1">Campaigns</p>
                <p className="text-white text-sm">{interaction.linked_campaign_names.join(", ")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Structured notes (new format) */}
        {interaction.notes?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-white font-medium text-sm px-1">Notes</h3>
            {interaction.notes.map((note, idx) => {
              const style = noteTypeColors[note.type] || noteTypeColors.general;
              return (
                <div key={note.id || idx} className={`rounded-2xl border p-5 ${style.bg} ${style.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.text} ${style.border} bg-white/[0.02]`}>
                      {style.label}
                    </span>
                    {note.crossroads_tag && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/30">
                        {note.crossroads_tag}
                      </span>
                    )}
                    {note.assigned_clients?.length > 0 && (
                      <span className="text-[#6C6C80] text-[10px]">
                        → {note.assigned_clients.length === (interaction.linked_clients?.length) ? "All clients" : `${note.assigned_clients.length} client(s)`}
                      </span>
                    )}
                  </div>
                  <p className="text-[#A1A1B5] text-sm leading-relaxed whitespace-pre-wrap">{note.text}</p>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
