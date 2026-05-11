import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Search, Calendar, Building2, Filter, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, Link } from "react-router-dom";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";

const typeIcons = {
  "Meeting (In-Person)": "🤝",
  "Meeting (Virtual)": "💻",
  "Call": "📞",
  "Email": "✉️",
  "Event": "🎉",
  "FAM Feedback": "✈️",
  "Marketing Discussion": "📊",
};

const INTERACTION_TYPES = [
  "Meeting (In-Person)",
  "Meeting (Virtual)",
  "Call",
  "Email",
  "Event",
  "FAM Feedback",
  "Marketing Discussion",
];

const DATE_RANGES = [
  { label: "All time",      value: "all" },
  { label: "This month",    value: "this_month" },
  { label: "Last month",    value: "last_month" },
  { label: "Last 3 months", value: "last_3_months" },
];

export default function Interactions() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ["interactions"],
    queryFn: () => base44.entities.Interaction.list("-date", 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const now = new Date();
  const dateRangeMap = {
    this_month:    { start: startOfMonth(now),         end: endOfMonth(now) },
    last_month:    { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
    last_3_months: { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) },
  };

  const filtered = interactions.filter(i => {
    const matchesSearch =
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.type?.toLowerCase().includes(search.toLowerCase()) ||
      i.contact_names?.some(n => n.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === "all" || i.type === typeFilter;

    const matchesClient = clientFilter === "all" || i.linked_clients?.includes(clientFilter);

    const matchesDate = dateFilter === "all" || (() => {
      if (!i.date) return false;
      const range = dateRangeMap[dateFilter];
      return isWithinInterval(new Date(i.date), range);
    })();

    return matchesSearch && matchesType && matchesClient && matchesDate;
  });

  const hasFilters = typeFilter !== "all" || clientFilter !== "all" || dateFilter !== "all";

  const clearFilters = () => {
    setTypeFilter("all");
    setClientFilter("all");
    setDateFilter("all");
  };

  return (
    <div>
      <PageHeader
        title="Interactions"
        subtitle="Track every conversation and touchpoint"
        action={() => navigate("/interactions/new")}
        actionLabel="Log Interaction"
        actionIcon={MessageSquare}
      />

      {/* Search bar */}
      <div className="relative mb-3 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
        <Input
          placeholder="Search interactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-6 animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="bg-surface border-white/[0.06] text-[#A1A1B5] rounded-xl h-9 w-52 text-xs">
            <Filter className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className="bg-surface-elevated border-white/[0.06]">
            <SelectItem value="all">All types</SelectItem>
            {INTERACTION_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Client filter */}
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="bg-surface border-white/[0.06] text-[#A1A1B5] rounded-xl h-9 w-44 text-xs">
            <Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent className="bg-surface-elevated border-white/[0.06]">
            <SelectItem value="all">All clients</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range filter */}
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="bg-surface border-white/[0.06] text-[#A1A1B5] rounded-xl h-9 w-44 text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent className="bg-surface-elevated border-white/[0.06]">
            {DATE_RANGES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs text-[#FF5C7A] border border-[#FF5C7A]/20 bg-[#FF5C7A]/5 hover:bg-[#FF5C7A]/10 transition-all"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}

        {/* Result count */}
        <span className="ml-auto flex items-center text-[#6C6C80] text-xs self-center">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? <ShimmerCard count={5} /> : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No interactions"
          description={hasFilters ? "No interactions match your current filters" : "Start logging meetings, calls, and emails"}
          action={hasFilters ? clearFilters : () => navigate("/interactions/new")}
          actionLabel={hasFilters ? "Clear filters" : "Log Interaction"}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((interaction, i) => (
            <Link
              key={interaction.id}
              to={`/interactions/${interaction.id}`}
              className="block bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.005] transition-all duration-300 animate-fade-in-up group"
              style={{ animationDelay: `${i * 0.02}s` }}
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
