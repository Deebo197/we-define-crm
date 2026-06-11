import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { externalHref } from "@/lib/externalUrl";
import {
  ArrowLeft, Pencil, Megaphone, Calendar, Users, Link2,
  TrendingUp, DollarSign, Trash2, Plus, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import StatusBadge from "@/components/ui/StatusBadge";
import ShimmerCard from "@/components/ui/ShimmerCard";

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-faint text-xs mb-0.5">{label}</p>
      <p className="text-ink text-sm">{value}</p>
    </div>
  );
}

export default function CampaignDetail({ campaign, onBack, onEdit }) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: coverageEntries = [], isLoading: loadingCoverage } = useQuery({
    queryKey: ["coverage", campaign.id],
    queryFn: () => base44.entities.CoverageEntry.filter({ campaign_id: campaign.id }),
    enabled: !!campaign.id,
  });

  const deleteCoverageMutation = useMutation({
    mutationFn: (id) => base44.entities.CoverageEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coverage", campaign.id] });
      setConfirmDelete(null);
    },
  });

  // Totals
  const totalReach  = coverageEntries.reduce((sum, e) => sum + (e.estimated_reach || 0), 0);
  const totalValue  = coverageEntries.reduce((sum, e) => sum + (e.estimated_value || 0), 0);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-faint hover:text-ink transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-ink truncate">{campaign.name}</h1>
            <p className="text-faint text-xs">{campaign.type}</p>
          </div>
        </div>
        <StatusBadge status={campaign.status} />
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-muted hover:text-ink shrink-0">
          <Pencil className="w-4 h-4" />
        </Button>
      </div>

      {/* Campaign meta */}
      <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <InfoRow label="Funding Type" value={campaign.funding_type} />
          {campaign.budget && (
            <div>
              <p className="text-faint text-xs mb-0.5">Budget</p>
              <p className="text-ink text-sm">£{campaign.budget.toLocaleString()}</p>
            </div>
          )}
          {(campaign.start_date || campaign.end_date) && (
            <div>
              <p className="text-faint text-xs mb-0.5">Dates</p>
              <p className="text-ink text-sm flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-faint" />
                {campaign.start_date && format(new Date(campaign.start_date), "MMM d, yyyy")}
                {campaign.end_date && ` — ${format(new Date(campaign.end_date), "MMM d, yyyy")}`}
              </p>
            </div>
          )}
        </div>
        {(campaign.linked_client_names?.length > 0 || campaign.linked_partner_names?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-line">
            {campaign.linked_client_names?.map(name => (
              <span key={name} className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">{name}</span>
            ))}
            {campaign.linked_partner_names?.map(name => (
              <span key={name} className="px-2.5 py-1 rounded-full text-xs bg-success/10 text-success border border-success/20">{name}</span>
            ))}
          </div>
        )}
        {campaign.notes && (
          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-faint text-xs mb-1">Notes</p>
            <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap">{campaign.notes}</p>
          </div>
        )}
      </div>

      {/* Coverage summary */}
      {coverageEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-2xl shadow-card border border-line p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-faint text-xs">Total Reach</p>
              <p className="text-ink font-semibold">{totalReach.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-surface rounded-2xl shadow-card border border-line p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-faint text-xs">Est. Value</p>
              <p className="text-ink font-semibold">£{totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Coverage Entries */}
      <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <h2 className="text-ink font-medium text-sm">Coverage</h2>
            {coverageEntries.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/[0.04] text-faint">{coverageEntries.length}</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-primary hover:text-primary text-xs gap-1">
            <Plus className="w-3.5 h-3.5" /> Add coverage
          </Button>
        </div>

        {loadingCoverage ? <ShimmerCard count={2} /> : coverageEntries.length === 0 ? (
          <p className="text-faint text-sm py-2">No coverage entries yet. Edit the campaign to add some.</p>
        ) : (
          <div className="space-y-3">
            {coverageEntries.map((entry) => (
              <div key={entry.id} className="p-4 rounded-xl bg-canvas border border-line group relative">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(entry)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-faint hover:text-danger hover:bg-danger/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-start justify-between gap-3 pr-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-ink text-sm font-medium">{entry.platform_partner}</p>
                      {entry.url && (
                        <a href={externalHref(entry.url)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {entry.summary && <p className="text-muted text-xs mt-1 leading-relaxed">{entry.summary}</p>}
                  </div>
                  <div className="flex gap-4 shrink-0 text-right">
                    {entry.estimated_reach && (
                      <div>
                        <p className="text-faint text-[10px]">Reach</p>
                        <p className="text-ink text-xs font-medium">{Number(entry.estimated_reach).toLocaleString()}</p>
                      </div>
                    )}
                    {entry.estimated_value && (
                      <div>
                        <p className="text-faint text-[10px]">Value</p>
                        <p className="text-ink text-xs font-medium">£{Number(entry.estimated_value).toLocaleString()}</p>
                      </div>
                    )}
                    {entry.date && (
                      <div>
                        <p className="text-faint text-[10px]">Date</p>
                        <p className="text-ink text-xs">{format(new Date(entry.date), "MMM d")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete coverage confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-card border border-line p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-ink font-medium mb-2">Delete Coverage Entry</h3>
            <p className="text-muted text-sm mb-5">Remove <span className="text-ink font-medium">{confirmDelete.platform_partner}</span>? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-faint hover:text-ink transition-colors">Cancel</button>
              <button type="button" onClick={() => deleteCoverageMutation.mutate(confirmDelete.id)} disabled={deleteCoverageMutation.isPending} className="px-5 py-2 text-sm bg-danger hover:bg-danger/80 text-white rounded-xl">
                {deleteCoverageMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
