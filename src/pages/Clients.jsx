import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Building2, Search, Filter } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import ClientForm from "@/components/clients/ClientForm";
import { Input } from "@/components/ui/input";
import { useSearchParams, Link } from "react-router-dom";

export default function Clients() {
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [editingClient, setEditingClient] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditingClient(null);
      setShowForm(false);
    },
  });

  const handleSubmit = (data) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.type?.toLowerCase().includes(search.toLowerCase()) ||
    c.reporting_group?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Hotels and DMC partners"
        action={() => { setEditingClient(null); setShowForm(true); }}
        actionLabel="Add Client"
      />

      {showForm && (
        <ClientForm
          client={editingClient}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingClient(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Search */}
      <div className="relative mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10"
        />
      </div>

      {isLoading ? <ShimmerCard count={4} /> : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clients yet"
          description="Add your first hotel or DMC client to get started"
          action={() => setShowForm(true)}
          actionLabel="Add Client"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client, i) => (
            <div
              key={client.id}
              className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group"
              style={{ animationDelay: `${0.05 + i * 0.03}s` }}
              onClick={() => { setEditingClient(client); setShowForm(true); }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7F5BFF]/20 to-[#3A1DFF]/10 flex items-center justify-center">
                    <Building2 className="w-4.5 h-4.5 text-[#7F5BFF]" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{client.name}</h3>
                    <p className="text-[#6C6C80] text-xs">{client.type}</p>
                  </div>
                </div>
                <StatusBadge status={client.status} />
              </div>
              {client.reporting_group && (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">
                  {client.reporting_group}
                </span>
              )}
              {client.retainer && (
                <p className="text-[#6C6C80] text-xs mt-2 truncate">{client.retainer}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}