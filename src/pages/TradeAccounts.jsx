import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Handshake, Search, Upload } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import TradeAccountForm from "@/components/trade/TradeAccountForm";
import TradeAccountDetail from "@/components/trade/TradeAccountDetail";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchParams, Link } from "react-router-dom";
import { format } from "date-fns";

export default function TradeAccounts() {
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => base44.entities.TradeAccount.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TradeAccount.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trade-accounts"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TradeAccount.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trade-accounts"] }); setEditing(null); setShowForm(false); setViewing(null); },
  });

  const handleSubmit = (data) => {
    editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  };

  const TYPE_FILTERS = ["All", "Tour Operator", "Travel Agent", "Parent Company"];

  const typeStyles = {
    "Tour Operator": "bg-[#7F5BFF]/10 text-[#7F5BFF] border-[#7F5BFF]/20",
    "Travel Agent": "bg-[#3DDC97]/10 text-[#3DDC97] border-[#3DDC97]/20",
    "Parent Company": "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20",
  };

  const filtered = accounts.filter(a => {
    const matchesSearch =
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.type?.toLowerCase().includes(search.toLowerCase()) ||
      a.region?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "All" || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (viewing && !showForm) {
    return (
      <TradeAccountDetail
        account={viewing}
        onBack={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setShowForm(true); }}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Trade Accounts" subtitle="Tour operators and travel agents" action={() => { setEditing(null); setShowForm(true); }} actionLabel="Add Account" />
      <div className="flex justify-end mb-2 -mt-4">
        <Link to="/import-trade-accounts">
          <Button type="button" variant="ghost" className="text-[#6C6C80] hover:text-white text-xs gap-1.5 h-8">
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </Button>
        </Link>
      </div>

      {showForm && (
        <TradeAccountForm account={editing} onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} isLoading={createMutation.isPending || updateMutation.isPending} />
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
          <Input placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${typeFilter === f ? "bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white border-transparent shadow-lg shadow-[#7F5BFF]/20" : "bg-white/[0.03] text-[#6C6C80] border-white/[0.08] hover:border-white/[0.16] hover:text-white"}`}>
              {f === "All" ? "All" : f + "s"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <ShimmerCard count={4} /> : filtered.length === 0 ? (
        <EmptyState icon={Handshake} title="No trade accounts" description="Add your first tour operator or agent" action={() => setShowForm(true)} actionLabel="Add Account" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((account, i) => (
            <div key={account.id} className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group" style={{ animationDelay: `${0.05 + i * 0.03}s` }} onClick={() => setViewing(account)}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1 pr-2">
                  <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{account.name}</h3>
                  {account.region && <p className="text-[#6C6C80] text-xs mt-0.5">{account.region}</p>}
                </div>
                <StatusBadge status={account.relationship_strength} />
              </div>
              {account.type && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${typeStyles[account.type] || "bg-white/5 text-[#A1A1B5] border-white/10"}`}>
                  {account.type}
                </span>
              )}
              {account.last_interaction_date && (
                <p className="text-[#6C6C80] text-xs mt-2">Last: {format(new Date(account.last_interaction_date), "MMM d, yyyy")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}