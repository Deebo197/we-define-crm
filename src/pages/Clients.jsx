import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Building2, Search, Mail, Phone, Users, ChevronRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import ClientForm from "@/components/clients/ClientForm";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";

function ClientCard({ client, contacts, onClick }) {
  const clientContacts = contacts.filter(c => c.linked_clients?.includes(client.id));

  return (
    <div
      className="bg-surface rounded-2xl border border-white/[0.06] hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer group overflow-hidden"
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7F5BFF]/20 to-[#3A1DFF]/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#7F5BFF]" />
            </div>
            <div>
              <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{client.name}</h3>
              <p className="text-[#6C6C80] text-xs">{client.type}</p>
            </div>
          </div>
          <StatusBadge status={client.status} />
        </div>

        <div className="flex flex-wrap gap-2">
          {client.reporting_group && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">
              {client.reporting_group}
            </span>
          )}
          {client.lead_team_member_name && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-[#3DDC97]/10 text-[#3DDC97] border border-[#3DDC97]/20">
              Lead: {client.lead_team_member_name}
            </span>
          )}
        </div>
      </div>

      {/* Key Contacts */}
      {clientContacts.length > 0 && (
        <div className="border-t border-white/[0.04] px-5 py-3">
          <p className="text-[#6C6C80] text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Key Contacts
          </p>
          <div className="space-y-1.5">
            {clientContacts.slice(0, 3).map(contact => (
              <div key={contact.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#7F5BFF]/10 flex items-center justify-center">
                    <span className="text-[#7F5BFF] text-[9px] font-bold">{contact.name?.charAt(0)}</span>
                  </div>
                  <span className="text-[#C8C8D8] text-xs">{contact.name}</span>
                </div>
                {contact.client_role && (
                  <span className="text-[#6C6C80] text-[10px]">{contact.client_role}</span>
                )}
              </div>
            ))}
            {clientContacts.length > 3 && (
              <p className="text-[#6C6C80] text-[10px]">+{clientContacts.length - 3} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Clients() {
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [editingClient, setEditingClient] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); setEditingClient(null); setShowForm(false); },
  });

  const handleSubmit = (data) => {
    editingClient ? updateMutation.mutate({ id: editingClient.id, data }) : createMutation.mutate(data);
  };

  const filtered = clients.filter(c => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.type?.toLowerCase().includes(search.toLowerCase()) ||
      c.reporting_group?.toLowerCase().includes(search.toLowerCase());
    const matchesType =
      typeFilter === "All" ||
      (typeFilter === "Hotels" && c.type === "Hotel") ||
      (typeFilter === "DMC" && c.type === "DMC");
    return matchesSearch && matchesType;
  });

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

      <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10"
          />
        </div>
        <div className="flex gap-2">
          {["All", "Hotels", "DMC"].map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                typeFilter === f
                  ? "bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white border-transparent shadow-lg shadow-[#7F5BFF]/20"
                  : "bg-white/[0.03] text-[#6C6C80] border-white/[0.08] hover:border-white/[0.16] hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <ShimmerCard count={4} /> : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No clients yet" description="Add your first hotel or DMC client to get started" action={() => setShowForm(true)} actionLabel="Add Client" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client, i) => (
            <div key={client.id} className="animate-fade-in-up" style={{ animationDelay: `${0.05 + i * 0.03}s` }}>
              <ClientCard
                client={client}
                contacts={contacts}
                onClick={() => { setEditingClient(client); setShowForm(true); }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}