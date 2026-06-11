import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { Link } from "react-router-dom";
import {
  Building2, Handshake, MessageSquare, CheckSquare, Megaphone,
  ArrowRight, Calendar, Clock, User, FileText
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import ShimmerCard from "@/components/ui/ShimmerCard";
import { format, isAfter, isBefore, addDays } from "date-fns";

function StatCard({ icon: Icon, label, value, gradient }) {
  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${gradient}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-[#6C6C80] text-sm">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-200 group"
    >
      <Icon className="w-4 h-4 text-[#7F5BFF]" />
      <span className="text-sm text-[#A1A1B5] group-hover:text-white transition-colors">{label}</span>
      <ArrowRight className="w-3.5 h-3.5 text-[#6C6C80] ml-auto group-hover:translate-x-0.5 transition-transform" />
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
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
        <p className="text-[#A1A1B5] text-sm mt-1">Welcome back to We Define Travel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <StatCard icon={Building2} label="Active Clients" value={clients.filter(c => c.status === "Active").length} gradient="bg-gradient-to-br from-[#7F5BFF] to-[#3A1DFF]" />
        <StatCard icon={Handshake} label="Trade Accounts" value={tradeAccounts.length} gradient="bg-gradient-to-br from-[#3DDC97] to-[#2ab87d]" />
        <StatCard icon={CheckSquare} label="Open Actions" value={openActions.length} gradient="bg-gradient-to-br from-[#FFB547] to-[#e69a30]" />
        <StatCard icon={Megaphone} label="Active Campaigns" value={campaigns.length} gradient="bg-gradient-to-br from-[#FF5C7A] to-[#e04060]" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Actions Due */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Upcoming Actions</h2>
              <Link to="/actions" className="text-[#7F5BFF] text-xs hover:underline">View all</Link>
            </div>
            {loadingActions ? <ShimmerCard count={3} /> : openActions.length === 0 ? (
              <p className="text-[#6C6C80] text-sm py-4">No open actions</p>
            ) : (
              <div className="space-y-2">
                {openActions.slice(0, 5).map((action) => (
                  <div key={action.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      action.priority === "Urgent" || action.priority === "High" ? "bg-[#FF5C7A]" :
                      action.priority === "Medium" ? "bg-[#FFB547]" : "bg-[#A1A1B5]"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{action.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {action.due_date && (
                          <span className="text-[#6C6C80] text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(action.due_date), "MMM d")}
                          </span>
                        )}
                        {action.linked_client_name && (
                          <span className="text-[#6C6C80] text-xs">· {action.linked_client_name}</span>
                        )}
                        {action.linked_interaction_title && (
                          <span className="text-[#6C6C80] text-xs truncate">· {action.linked_interaction_title}</span>
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
          <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Recent Interactions</h2>
              <Link to="/interactions" className="text-[#7F5BFF] text-xs hover:underline">View all</Link>
            </div>
            {loadingInteractions ? <ShimmerCard count={3} /> : interactions.length === 0 ? (
              <p className="text-[#6C6C80] text-sm py-4">No interactions yet</p>
            ) : (
              <div className="space-y-2">
                {interactions.map((interaction) => (
                  <Link key={interaction.id} to={`/interactions/${interaction.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all group">
                    <div className="w-9 h-9 rounded-xl bg-[#7F5BFF]/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-[#7F5BFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate group-hover:text-[#7F5BFF] transition-colors">{interaction.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[#6C6C80] text-xs">{interaction.type}</span>
                        {interaction.company_name && <span className="text-[#6C6C80] text-xs">· {interaction.company_name}</span>}
                      </div>
                    </div>
                    <span className="text-[#6C6C80] text-xs">{interaction.date && format(new Date(interaction.date), "MMM d")}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-white font-medium mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <QuickAction icon={MessageSquare} label="Log Interaction" to="/interactions?new=true" />
              <QuickAction icon={CheckSquare} label="Add Action" to="/actions?new=true" />
              <QuickAction icon={Building2} label="Add Client" to="/clients?new=true" />
              <QuickAction icon={FileText} label="Generate Report" to="/reports?new=true" />
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Active Campaigns</h2>
              <Link to="/campaigns" className="text-[#7F5BFF] text-xs hover:underline">View all</Link>
            </div>
            {loadingCampaigns ? <ShimmerCard count={2} /> : campaigns.length === 0 ? (
              <p className="text-[#6C6C80] text-sm py-2">No active campaigns</p>
            ) : (
              <div className="space-y-2">
                {campaigns.slice(0, 4).map((campaign) => (
                  <div key={campaign.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-white text-sm font-medium">{campaign.name}</p>
                    <p className="text-[#6C6C80] text-xs mt-0.5">{campaign.type}</p>
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