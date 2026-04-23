import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckSquare, Search, Clock, Filter } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import ActionForm from "@/components/actions/ActionForm";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams } from "react-router-dom";
import { format, isPast } from "date-fns";

export default function Actions() {
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const queryClient = useQueryClient();

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.Action.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Action.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["actions"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Action.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["actions"] }); setEditing(null); setShowForm(false); },
  });

  const handleSubmit = (data) => {
    editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  };

  const filtered = actions
    .filter(a => {
      if (statusFilter === "open") return a.status !== "Completed" && a.status !== "Cancelled";
      if (statusFilter === "completed") return a.status === "Completed";
      return true;
    })
    .filter(a =>
      a.description?.toLowerCase().includes(search.toLowerCase()) ||
      a.linked_client_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.owner?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div>
      <PageHeader title="Actions" subtitle="Track tasks and follow-ups" action={() => { setEditing(null); setShowForm(true); }} actionLabel="Add Action" />

      {showForm && (
        <ActionForm action={editing} onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} isLoading={createMutation.isPending || updateMutation.isPending} />
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
          <Input placeholder="Search actions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-surface border-white/[0.06] text-[#A1A1B5] rounded-xl h-10 w-40">
            <Filter className="w-3.5 h-3.5 mr-2" /><SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface-elevated border-white/[0.06]">
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <ShimmerCard count={5} /> : filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No actions" description="Create your first task or follow-up" action={() => setShowForm(true)} actionLabel="Add Action" />
      ) : (
        <div className="space-y-2">
          {filtered.map((action, i) => (
            <div
              key={action.id}
              className="bg-surface rounded-2xl border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all duration-300 cursor-pointer animate-fade-in-up flex items-center gap-3 group"
              style={{ animationDelay: `${i * 0.02}s` }}
              onClick={() => { setEditing(action); setShowForm(true); }}
            >
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                action.priority === "Urgent" ? "bg-[#FF5C7A]" :
                action.priority === "High" ? "bg-[#FF5C7A]/70" :
                action.priority === "Medium" ? "bg-[#FFB547]" : "bg-[#A1A1B5]/50"
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium group-hover:text-[#7F5BFF] transition-colors ${action.status === "Completed" ? "line-through text-[#6C6C80]" : "text-white"}`}>
                  {action.description}
                </p>
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  {action.owner && <span className="text-[#6C6C80] text-xs">{action.owner}</span>}
                  {action.due_date && (
                    <span className={`text-xs flex items-center gap-1 ${isPast(new Date(action.due_date)) && action.status !== "Completed" ? "text-[#FF5C7A]" : "text-[#6C6C80]"}`}>
                      <Clock className="w-3 h-3" />{format(new Date(action.due_date), "MMM d")}
                    </span>
                  )}
                  {action.linked_client_name && (
                    <span className="text-[#6C6C80] text-xs">· {action.linked_client_name}</span>
                  )}
                </div>
              </div>
              <StatusBadge status={action.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}