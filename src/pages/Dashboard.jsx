import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { Link } from "react-router-dom";
import {
  Building2, Handshake, MessageSquare, CheckSquare, Megaphone,
  ArrowRight, Clock, FileText
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import ShimmerCard from "@/components/ui/ShimmerCard";
import DotField from "@/components/ui/DotField";
import { format, isBefore, addDays } from "date-fns";
import { toneFor } from "@/lib/statusColors";

function StatCard({ icon: Icon, label, value, gradient }) {
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-card p-5 hover:border-line-strong transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${gradient}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-faint text-sm">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-canvas border border-line hover:bg-black/[0.03] hover:border-line-strong transition-all duration-200 group"
    >
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-sm text-muted group-hover:text-ink transition-colors">{label}</span>
      <ArrowRight className="w-3.5 h-3.5 text-faint ml-auto group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

export default function Dashboard() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: actions = [], isLoading: loadingActions } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.Action.list("-created_date", 50),
  });

  const { data: interactions = [], isLoading: loadingInteractions } = useQuery({
    queryKey: ["interactions-recent"],
    queryFn: () => base44.entities.Interaction.list("-date", 5),
  });

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["campaigns-active"],
    queryFn: () => base44.entities.Campaign.filter({ status: "Active" }),
  });

  const { data: tradeAccounts = [] } = useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => listActiveTradeAccounts(),
  });

  const openActions = actions.filter(a => a.status !== "Completed" && a.status !== "Cancelled");
  const urgentActions = openActions.filter(a => {
    if (!a.due_date) return false;
    return isBefore(new Date(a.due_date), addDays(new Date(), 3));
  });

  const isLoading = loadingClients || loadingActions || loadingInteractions;

  return (
    <div className="space-y-8">
      {/* Header — dot-field band (interactive dots are desktop-only) */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface animate-fade-in-up">
        <div className="absolute inset-0 hidden lg:block" aria-hidden="true">
          <DotField />
        </div>
        <div className="relative px-6 py-8 pointer-events-none">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Dashboard</h1>
          <p className="text-muted text-sm mt-1">Welcome back to We Define Travel</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <StatCard icon={Building2} label="Active Clients" value={clients.filter(c => c.status === "Active").length} gradient="bg-primary" />
        <StatCard icon={Handshake} label="Companies" value={tradeAccounts.length} gradient="bg-success" />
        <StatCard icon={CheckSquare} label="Open Actions" value={openActions.length} gradient="bg-warning" />
        <StatCard icon={Megaphone} label="Active Campaigns" value={campaigns.length} gradient="bg-danger" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Actions Due */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-ink font-medium">Upcoming Actions</h2>
              <Link to="/actions" className="text-primary text-xs hover:underline">View all</Link>
            </div>
            {loadingActions ? <ShimmerCard count={3} /> : openActions.length === 0 ? (
              <p className="text-faint text-sm py-4">No open actions</p>
            ) : (
              <div className="space-y-2">
                {openActions.slice(0, 5).map((action) => (
                  <div key={action.id} className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line hover:bg-black/[0.03] transition-all">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${toneFor(action.priority).dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-sm truncate">{action.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {action.due_date && (
                          <span className="text-faint text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(action.due_date), "MMM d")}
                          </span>
                        )}
                        {action.linked_client_name && (
                          <span className="text-faint text-xs">· {action.linked_client_name}</span>
                        )}
                        {action.linked_interaction_title && (
                          <span className="text-faint text-xs truncate">· {action.linked_interaction_title}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={action.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Interactions */}
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-ink font-medium">Recent Interactions</h2>
              <Link to="/interactions" className="text-primary text-xs hover:underline">View all</Link>
            </div>
            {loadingInteractions ? <ShimmerCard count={3} /> : interactions.length === 0 ? (
              <p className="text-faint text-sm py-4">No interactions yet</p>
            ) : (
              <div className="space-y-2">
                {interactions.map((interaction) => (
                  <Link key={interaction.id} to={`/interactions/${interaction.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line hover:bg-black/[0.03] transition-all group">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-sm truncate group-hover:text-primary transition-colors">{interaction.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-faint text-xs">{interaction.type}</span>
                        {interaction.company_name && <span className="text-faint text-xs">· {interaction.company_name}</span>}
                      </div>
                    </div>
                    <span className="text-faint text-xs">{interaction.date && format(new Date(interaction.date), "MMM d")}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-ink font-medium mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <QuickAction icon={MessageSquare} label="Log Interaction" to="/interactions?new=true" />
              <QuickAction icon={CheckSquare} label="Add Action" to="/actions?new=true" />
              <QuickAction icon={Building2} label="Add Client" to="/clients?new=true" />
              <QuickAction icon={FileText} label="Generate Report" to="/reports?new=true" />
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-ink font-medium">Active Campaigns</h2>
              <Link to="/campaigns" className="text-primary text-xs hover:underline">View all</Link>
            </div>
            {loadingCampaigns ? <ShimmerCard count={2} /> : campaigns.length === 0 ? (
              <p className="text-faint text-sm py-2">No active campaigns</p>
            ) : (
              <div className="space-y-2">
                {campaigns.slice(0, 4).map((campaign) => (
                  <div key={campaign.id} className="p-3 rounded-xl bg-canvas border border-line">
                    <p className="text-ink text-sm font-medium">{campaign.name}</p>
                    <p className="text-faint text-xs mt-0.5">{campaign.type}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}