import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Megaphone, Search, Calendar } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import CampaignForm from "@/components/campaigns/CampaignForm";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function Campaigns() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Campaign.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); setEditing(null); setShowForm(false); },
  });

  const handleSubmit = (data) => {
    editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  };

  const filtered = campaigns.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Marketing activity and campaigns" action={() => { setEditing(null); setShowForm(true); }} actionLabel="New Campaign" />

      {showForm && (
        <CampaignForm campaign={editing} onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} isLoading={createMutation.isPending || updateMutation.isPending} />
      )}

      <div className="relative mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
        <Input placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10" />
      </div>

      {isLoading ? <ShimmerCard count={4} /> : filtered.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns" description="Create your first marketing campaign" action={() => setShowForm(true)} actionLabel="New Campaign" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((campaign, i) => (
            <div key={campaign.id} className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => { setEditing(campaign); setShowForm(true); }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{campaign.name}</h3>
                  <p className="text-[#6C6C80] text-xs mt-0.5">{campaign.type}</p>
                </div>
                <StatusBadge status={campaign.status} />
              </div>
              <div className="flex items-center flex-wrap gap-3 mt-3">
                {campaign.funding_type && (
                  <span className="text-[#A1A1B5] text-xs">{campaign.funding_type}</span>
                )}
                {campaign.budget && (
                  <span className="text-[#A1A1B5] text-xs">£{campaign.budget.toLocaleString()}</span>
                )}
                {campaign.start_date && (
                  <span className="text-[#6C6C80] text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(campaign.start_date), "MMM d")}
                    {campaign.end_date && ` — ${format(new Date(campaign.end_date), "MMM d")}`}
                  </span>
                )}
              </div>
              {campaign.linked_client_names?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {campaign.linked_client_names.map(name => (
                    <span key={name} className="px-2 py-0.5 rounded-full text-[10px] bg-[#7F5BFF]/10 text-[#7F5BFF]">{name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}