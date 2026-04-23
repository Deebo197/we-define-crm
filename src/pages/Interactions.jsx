import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Search, Calendar, Building2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import { Input } from "@/components/ui/input";
import { useSearchParams, Link } from "react-router-dom";
import { format } from "date-fns";

const typeIcons = {
  "Meeting (In-Person)": "🤝",
  "Meeting (Virtual)": "💻",
  "Call": "📞",
  "Email": "✉️",
  "Event": "🎉",
  "FAM Feedback": "✈️",
  "Marketing Discussion": "📊",
};

export default function Interactions() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ["interactions"],
    queryFn: () => base44.entities.Interaction.list("-date", 100),
  });

  const filtered = interactions.filter(i =>
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Interactions"
        subtitle="Track every conversation and touchpoint"
        action={() => window.location.href = "/interactions/new"}
        actionLabel="Log Interaction"
        actionIcon={MessageSquare}
      />

      <div className="relative mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
        <Input placeholder="Search interactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10" />
      </div>

      {isLoading ? <ShimmerCard count={5} /> : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No interactions" description="Start logging meetings, calls, and emails" action={() => window.location.href = "/interactions/new"} actionLabel="Log Interaction" />
      ) : (
        <div className="space-y-3">
          {filtered.map((interaction, i) => (
            <Link
              key={interaction.id}
              to={`/interactions/${interaction.id}`}
              className="block bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.005] transition-all duration-300 animate-fade-in-up group"
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#7F5BFF]/10 flex items-center justify-center flex-shrink-0 text-lg">
                  {typeIcons[interaction.type] || "💬"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{interaction.title}</h3>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-[#A1A1B5] text-xs">{interaction.type}</span>
                        {interaction.company_name && (
                          <span className="text-[#6C6C80] text-xs flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{interaction.company_name}
                          </span>
                        )}
                        {interaction.linked_client_names?.length > 0 && (
                          <span className="text-[#6C6C80] text-xs">
                            {interaction.linked_client_names.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[#6C6C80] text-xs flex items-center gap-1 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {interaction.date && format(new Date(interaction.date), "MMM d, yyyy")}
                    </span>
                  </div>
                  {interaction.general_notes && (
                    <p className="text-[#6C6C80] text-xs mt-2 line-clamp-2">{interaction.general_notes}</p>
                  )}
                  {interaction.contact_names?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {interaction.contact_names.map(name => (
                        <span key={name} className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-[#A1A1B5] border border-white/[0.06]">{name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}