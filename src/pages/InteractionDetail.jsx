import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Pencil, Trash2, Calendar, Building2, Users, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import StatusBadge from "@/components/ui/StatusBadge";
import ShimmerCard from "@/components/ui/ShimmerCard";

export default function InteractionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: interaction, isLoading } = useQuery({
    queryKey: ["interaction", id],
    queryFn: async () => {
      const list = await base44.entities.Interaction.filter({ id });
      return list[0];
    },
    enabled: !!id && id !== "new",
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Interaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
      navigate("/interactions");
    },
  });

  if (id === "new") {
    return <InteractionForm />;
  }

  if (isLoading) return <div className="py-12"><ShimmerCard count={3} /></div>;
  if (!interaction) return <div className="text-[#6C6C80] py-12 text-center">Interaction not found</div>;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/interactions")} className="text-[#6C6C80] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-white flex-1">{interaction.title}</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/interactions/${id}/edit`)} className="text-[#A1A1B5] hover:text-white">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this interaction?")) deleteMutation.mutate(); }} className="text-[#FF5C7A] hover:text-[#FF5C7A]">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Meta */}
        <div className="bg-surface rounded-2xl border border-white/[0.06] p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[#6C6C80] text-xs mb-1">Type</p>
              <p className="text-white text-sm">{interaction.type}</p>
            </div>
            <div>
              <p className="text-[#6C6C80] text-xs mb-1">Date</p>
              <p className="text-white text-sm">{interaction.date && format(new Date(interaction.date), "MMMM d, yyyy")}</p>
            </div>
            {interaction.company_name && (
              <div>
                <p className="text-[#6C6C80] text-xs mb-1">Company</p>
                <p className="text-white text-sm">{interaction.company_name}</p>
              </div>
            )}
            {interaction.contact_names?.length > 0 && (
              <div>
                <p className="text-[#6C6C80] text-xs mb-1">Contacts</p>
                <p className="text-white text-sm">{interaction.contact_names.join(", ")}</p>
              </div>
            )}
            {interaction.linked_client_names?.length > 0 && (
              <div>
                <p className="text-[#6C6C80] text-xs mb-1">Linked Clients</p>
                <p className="text-white text-sm">{interaction.linked_client_names.join(", ")}</p>
              </div>
            )}
            {interaction.next_action_date && (
              <div>
                <p className="text-[#6C6C80] text-xs mb-1">Next Action</p>
                <p className="text-white text-sm">{format(new Date(interaction.next_action_date), "MMM d, yyyy")}</p>
              </div>
            )}
          </div>
        </div>

        {/* General Notes */}
        {interaction.general_notes && (
          <div className="bg-surface rounded-2xl border border-white/[0.06] p-5">
            <h3 className="text-white font-medium text-sm mb-3">General Notes</h3>
            <p className="text-[#A1A1B5] text-sm leading-relaxed whitespace-pre-wrap">{interaction.general_notes}</p>
          </div>
        )}

        {/* Client-Specific Notes */}
        {interaction.client_specific_notes?.length > 0 && (
          <div className="space-y-3">
            {interaction.client_specific_notes.map((csn, idx) => (
              <div key={idx} className="bg-surface rounded-2xl border border-white/[0.06] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-[#7F5BFF]" />
                  <h3 className="text-white font-medium text-sm">{csn.client_name}</h3>
                  {csn.tags?.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-[#7F5BFF]/10 text-[#7F5BFF]">{tag}</span>
                  ))}
                </div>
                <p className="text-[#A1A1B5] text-sm leading-relaxed whitespace-pre-wrap">{csn.notes}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InteractionForm() {
  return <InteractionFormPage />;
}

function InteractionFormPage() {
  const navigate = useNavigate();
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/interactions")} className="text-[#6C6C80] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-white">New Interaction</h1>
      </div>
      <InteractionFormContent onSuccess={() => navigate("/interactions")} />
    </div>
  );
}

import InteractionFormContent from "@/components/interactions/InteractionFormContent";