import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Search, Mail, Phone } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import ContactForm from "@/components/contacts/ContactForm";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";

export default function Contacts() {
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setEditing(null); setShowForm(false); },
  });

  const handleSubmit = (data) => {
    editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  };

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Contacts" subtitle="People across your network" action={() => { setEditing(null); setShowForm(true); }} actionLabel="Add Contact" />

      {showForm && (
        <ContactForm contact={editing} onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} isLoading={createMutation.isPending || updateMutation.isPending} />
      )}

      <div className="relative mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
        <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10" />
      </div>

      {isLoading ? <ShimmerCard count={4} /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No contacts" description="Start building your contact network" action={() => setShowForm(true)} actionLabel="Add Contact" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((contact, i) => (
            <div key={contact.id} className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => { setEditing(contact); setShowForm(true); }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7F5BFF]/20 to-[#3A1DFF]/10 flex items-center justify-center">
                  <span className="text-[#7F5BFF] font-medium text-sm">{contact.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{contact.name}</h3>
                  <p className="text-[#6C6C80] text-xs">{contact.role}{contact.company_name ? ` · ${contact.company_name}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                {contact.email && <span className="text-[#6C6C80] text-xs flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
              </div>
              {contact.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {contact.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">{tag}</span>
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