import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Search, Mail, Upload, LayoutGrid, List, Trash2, Phone } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import ContactForm from "@/components/contacts/ContactForm";
import ContactDetail from "@/components/contacts/ContactDetail";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchParams, Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

export default function Contacts() {
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid"); // "grid" | "list"
  const [confirmDelete, setConfirmDelete] = useState(null);
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setConfirmDelete(null); },
  });

  const handleSubmit = (data) => {
    editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  };

  const openEdit = (contact) => {
    navigateToContact(contact);
  };

  const handleDelete = (e, contact) => {
    e.stopPropagation();
    setConfirmDelete(contact);
  };

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.role?.toLowerCase().includes(search.toLowerCase())
  );

  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const navigateToContact = (c) => {
    scrollToTop();
    setViewing(c);
  };

  if (viewing) {
    return (
      <AnimatePresence mode="wait">
        <ContactDetail
          key={viewing.id}
          contact={viewing}
          onBack={() => { setViewing(null); setTimeout(scrollToTop, 0); }}
          onDeleted={() => setViewing(null)}
          onViewContact={navigateToContact}
        />
      </AnimatePresence>
    );
  }

  return (
    <div>
      <PageHeader title="Contacts" subtitle="People across your network" action={() => { setEditing(null); setShowForm(true); }} actionLabel="Add Contact" />
      <div className="flex justify-end mb-2 -mt-4">
        <Link to="/import-contacts">
          <Button type="button" variant="ghost" className="text-[#6C6C80] hover:text-white text-xs gap-1.5 h-8">
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </Button>
        </Link>
      </div>

      {showForm && (
        <ContactForm key={editing?.id || "new"} contact={editing} onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} isLoading={createMutation.isPending || updateMutation.isPending} />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-white/[0.08] p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white font-medium mb-2">Delete Contact</h3>
            <p className="text-[#A1A1B5] text-sm mb-5">Are you sure you want to delete <span className="text-white font-medium">{confirmDelete.name}</span>? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(null)} className="text-[#6C6C80] hover:text-white">Cancel</Button>
              <Button type="button" onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="bg-[#FF5C7A] hover:bg-[#FF5C7A]/80 text-white rounded-xl px-5">
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search + View Toggle */}
      <div className="flex gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
          <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10" />
        </div>
        <div className="flex gap-1 bg-surface border border-white/[0.06] rounded-xl p-1">
          <button type="button" onClick={() => setView("grid")} className={`p-2 rounded-lg transition-all ${view === "grid" ? "bg-white/[0.08] text-white" : "text-[#6C6C80] hover:text-white"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setView("list")} className={`p-2 rounded-lg transition-all ${view === "list" ? "bg-white/[0.08] text-white" : "text-[#6C6C80] hover:text-white"}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? <ShimmerCard count={4} /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No contacts" description="Start building your contact network" action={() => setShowForm(true)} actionLabel="Add Contact" />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((contact, i) => (
            <div key={contact.id} className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group relative" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => openEdit(contact)}>
              <button type="button" onClick={(e) => handleDelete(e, contact)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#6C6C80] hover:text-[#FF5C7A] hover:bg-[#FF5C7A]/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7F5BFF]/20 to-[#3A1DFF]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#7F5BFF] font-medium text-sm">{contact.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors truncate">{contact.name}</h3>
                  <p className="text-[#6C6C80] text-xs truncate">{contact.role}{contact.company_name ? ` · ${contact.company_name}` : ""}</p>
                </div>
              </div>
              <div className="space-y-1 mt-3">
                {contact.email && <span className="text-[#6C6C80] text-xs flex items-center gap-1.5"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{contact.email}</span></span>}
                {contact.phone && <span className="text-[#6C6C80] text-xs flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" />{contact.phone}</span>}
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
      ) : (
        /* List view */
        <div className="bg-surface rounded-2xl border border-white/[0.06] overflow-hidden">
          {filtered.map((contact, i) => (
            <div key={contact.id} onClick={() => openEdit(contact)} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] cursor-pointer group transition-all ${i !== filtered.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7F5BFF]/20 to-[#3A1DFF]/10 flex items-center justify-center shrink-0">
                <span className="text-[#7F5BFF] font-medium text-xs">{contact.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                <span className="text-white text-sm font-medium group-hover:text-[#7F5BFF] transition-colors truncate">{contact.name}</span>
                <span className="text-[#6C6C80] text-xs truncate">{contact.role || "—"}</span>
                <span className="text-[#6C6C80] text-xs truncate hidden sm:block">{contact.company_name || "—"}</span>
                <span className="text-[#6C6C80] text-xs truncate hidden sm:block">{contact.email || "—"}</span>
              </div>
              <button type="button" onClick={(e) => handleDelete(e, contact)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#6C6C80] hover:text-[#FF5C7A] hover:bg-[#FF5C7A]/10 transition-all shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}