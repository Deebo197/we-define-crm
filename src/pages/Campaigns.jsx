import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Megaphone, Search, Calendar, Trash2 } from "lucide-react";
import CampaignDetail from "@/components/campaigns/CampaignDetail";
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
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: async ({ campaignData, coverageEntries }) => {
      const campaign = await base44.entities.Campaign.create(campaignData);
      // Save coverage entries linked to this campaign
      for (const entry of coverageEntries) {
        if (entry.platform_partner) {
          await base44.entities.CoverageEntry.create({
            ...entry,
            campaign_id: campaign.id,
            estimated_reach: entry.estimated_reach ? Number(entry.estimated_reach) : undefined,
            estimated_value: entry.estimated_value ? Number(entry.estimated_value) : undefined,
          });
        }
      }
      return campaign;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, campaignData, coverageEntries }) => {
      await base44.entities.Campaign.update(id, campaignData);
      // Save new coverage entries (existing ones are managed separately)
      for (const entry of coverageEntries) {
        if (entry.platform_partner && !entry.id) {
          await base44.entities.CoverageEntry.create({
            ...entry,
            campaign_id: id,
            estimated_reach: entry.estimated_reach ? Number(entry.estimated_reach) : undefined,
            estimated_value: entry.estimated_value ? Number(entry.estimated_value) : undefined,
          });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); setEditing(null); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); setConfirmDelete(null); },
  });

  const handleSubmit = (campaignData, coverageEntries = []) => {
    editing
      ? updateMutation.mutate({ id: editing.id, campaignData, coverageEntries })
      : createMutation.mutate({ campaignData, coverageEntries });
  };

  const filtered = campaigns.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.type?.toLowerCase().includes(search.toLowerCase())
  );

  if (viewing && !showForm) {
    return (
      <CampaignDetail
        campaign={viewing}
        onBack={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setShowForm(true); setViewing(null); }}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Marketing activity and campaigns" action={() => { setEditing(null); setShowForm(true); }} actionLabel="New Campaign" />

      {showForm && (
        <CampaignForm campaign={editing} onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} isLoading={createMutation.isPending || updateMutation.isPending} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-white/[0.08] p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white font-medium mb-2">Delete Campaign</h3>
            <p className="text-[#A1A1B5] text-sm mb-5">Are you sure you want to delete <span className="text-white font-medium">{confirmDelete.name}</span>? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-[#6C6C80] hover:text-white transition-colors">Cancel</button>
              <button type="button" onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="px-5 py-2 text-sm bg-[#FF5C7A] hover:bg-[#FF5C7A]/80 text-white rounded-xl">
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
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
            <div key={campaign.id} className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group relative" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => setViewing(campaign)}>
              <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDelete(campaign); }} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#6C6C80] hover:text-[#FF5C7A] hover:bg-[#FF5C7A]/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-start justify-between mb-2 pr-6">
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
              {(campaign.linked_client_names?.length > 0 || campaign.linked_partner_names?.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {campaign.linked_client_names?.map(name => (
                    <span key={name} className="px-2 py-0.5 rounded-full text-[10px] bg-[#7F5BFF]/10 text-[#7F5BFF]">{name}</span>
                  ))}
                  {campaign.linked_partner_names?.map(name => (
                    <span key={name} className="px-2 py-0.5 rounded-full text-[10px] bg-[#3DDC97]/10 text-[#3DDC97]">{name}</span>
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