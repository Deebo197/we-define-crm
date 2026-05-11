import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Mail, Phone, Smartphone, Linkedin, MapPin, Pencil, Trash2, Calendar, Users, MessageSquare, Clock, CheckSquare } from "lucide-react";
import { format, isPast } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ContactForm from "@/components/contacts/ContactForm";

const DEST_LABELS = [
  { key: "dest_maldives", label: "Maldives" },
  { key: "dest_mauritius", label: "Mauritius" },
  { key: "dest_uae", label: "UAE" },
  { key: "dest_far_east", label: "Far East" },
];

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-[#6C6C80]" />
      </div>
      <div>
        <p className="text-[#6C6C80] text-[10px] uppercase tracking-wider font-medium">{label}</p>
        <p className="text-white text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function ContactDetail({ contact, onBack, onDeleted, onViewContact }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

  const { data: allContacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  // Colleagues: same company_id (if set), excluding self
  const colleagues = allContacts.filter(c =>
    c.id !== contact.id &&
    contact.company_id &&
    c.company_id === contact.company_id
  );

  const { data: allInteractions = [] } = useQuery({
    queryKey: ["interactions"],
    queryFn: () => base44.entities.Interaction.list("-date", 200),
  });

  const { data: allActions = [] } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.Action.list("-created_date", 200),
  });

  // Last interaction for this contact
  const contactInteractions = allInteractions
    .filter(i => i.contact_ids?.includes(contact.id))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastInteraction = contactInteractions[0];

  // Next open action for this contact
  const nextAction = allActions
    .filter(a => a.linked_contact_id === contact.id && a.status !== "Completed" && a.status !== "Cancelled")
    .sort((a, b) => new Date(a.due_date || "9999") - new Date(b.due_date || "9999"))[0];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onDeleted();
    },
  });

  const activeDestinations = DEST_LABELS.filter(d => contact[d.key]);

  const address = [contact.home_address_line1, contact.home_address_line2, contact.home_city, contact.home_county, contact.home_postcode, contact.home_country].filter(Boolean).join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-[#6C6C80] hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm">Contacts</span>
        </button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setEditing(true)} className="text-[#A1A1B5] hover:text-white gap-1.5 text-sm h-9">
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-[#FF5C7A]/60 hover:text-[#FF5C7A] gap-1.5 text-sm h-9">
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Edit form overlay */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <ContactForm
              key={contact.id}
              contact={contact}
              onSubmit={(data) => updateMutation.mutate({ id: contact.id, data })}
              onCancel={() => setEditing(false)}
              isLoading={updateMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!editing && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Profile hero */}
          <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7F5BFF]/30 to-[#3A1DFF]/10 flex items-center justify-center shrink-0">
                <span className="text-[#7F5BFF] font-bold text-2xl">{contact.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-white">{contact.name}</h1>
                {contact.role && <p className="text-[#A1A1B5] text-sm mt-0.5">{contact.role}</p>}
                {contact.company_name && (
                  <p className="text-[#6C6C80] text-sm">{contact.company_name}</p>
                )}
                {contact.client_role && (
                  <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-xs bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">
                    {contact.client_role}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Contact Info */}
            <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-4">
              <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider">Contact Info</h2>
              <InfoRow icon={Mail} label="Email" value={contact.email} />
              <InfoRow icon={Phone} label="Phone" value={contact.phone} />
              <InfoRow icon={Smartphone} label="Mobile" value={contact.mobile} />
              {contact.linkedin && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                    <Linkedin className="w-3.5 h-3.5 text-[#6C6C80]" />
                  </div>
                  <div>
                    <p className="text-[#6C6C80] text-[10px] uppercase tracking-wider font-medium">LinkedIn</p>
                    <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#7F5BFF] text-sm hover:underline mt-0.5 block truncate max-w-[200px]">View Profile</a>
                  </div>
                </div>
              )}
              {contact.birthday && <InfoRow icon={Calendar} label="Birthday" value={contact.birthday} />}
            </div>

            {/* Address */}
            <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-4">
              <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider">Home Address</h2>
              {address ? (
                <InfoRow icon={MapPin} label="Address" value={address} />
              ) : (
                <p className="text-[#6C6C80] text-sm">No address on record</p>
              )}
            </div>

            {/* Destinations */}
            {activeDestinations.length > 0 && (
              <div className="bg-surface rounded-2xl border border-white/[0.06] p-5">
                <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider mb-3">Destination Interest</h2>
                <div className="flex flex-wrap gap-2">
                  {activeDestinations.map(d => (
                    <span key={d.key} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#3DDC97]/10 text-[#3DDC97] border border-[#3DDC97]/20">
                      {d.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Clients */}
            {contact.linked_client_names?.length > 0 && (
              <div className="bg-surface rounded-2xl border border-white/[0.06] p-5">
                <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider mb-3">Linked WDT Clients</h2>
                <div className="flex flex-wrap gap-2">
                  {contact.linked_client_names.map(name => (
                    <span key={name} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {contact.tags?.length > 0 && (
              <div className="bg-surface rounded-2xl border border-white/[0.06] p-5">
                <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-white/[0.06] text-[#A1A1B5] border border-white/[0.08]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {contact.notes && (
              <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 sm:col-span-2">
                <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider mb-3">Notes</h2>
                <p className="text-[#A1A1B5] text-sm leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Last Interaction + Next Action */}
          {(lastInteraction || nextAction) && (
            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              {lastInteraction && (
                <Link to={`/interactions/${lastInteraction.id}`} className="bg-surface rounded-2xl border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all group block">
                  <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Last Interaction
                  </h2>
                  <p className="text-white text-sm font-medium group-hover:text-[#7F5BFF] transition-colors truncate">{lastInteraction.title}</p>
                  <p className="text-[#6C6C80] text-xs mt-1">{lastInteraction.type}</p>
                  {lastInteraction.date && (
                    <p className="text-[#6C6C80] text-xs mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(lastInteraction.date), "MMM d, yyyy")}
                    </p>
                  )}
                </Link>
              )}
              {nextAction && (
                <Link to="/actions" className="bg-surface rounded-2xl border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all group block">
                  <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" /> Next Action
                  </h2>
                  <p className="text-white text-sm font-medium group-hover:text-[#7F5BFF] transition-colors">{nextAction.description}</p>
                  {nextAction.due_date && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${isPast(new Date(nextAction.due_date)) ? "text-[#FF5C7A]" : "text-[#6C6C80]"}`}>
                      <Clock className="w-3 h-3" />
                      Due {format(new Date(nextAction.due_date), "MMM d, yyyy")}
                    </p>
                  )}
                  {nextAction.owner && <p className="text-[#6C6C80] text-xs mt-1">Owner: {nextAction.owner}</p>}
                </Link>
              )}
            </div>
          )}

          {/* Colleagues at same company */}
          {colleagues.length > 0 && (
            <div className="mt-5 bg-surface rounded-2xl border border-white/[0.06] p-5">
              <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Colleagues at {contact.company_name}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {colleagues.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onViewContact && onViewContact(c)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04] transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7F5BFF]/20 to-[#3A1DFF]/10 flex items-center justify-center shrink-0">
                      <span className="text-[#7F5BFF] font-medium text-sm">{c.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium group-hover:text-[#7F5BFF] transition-colors truncate">{c.name}</p>
                      <p className="text-[#6C6C80] text-xs truncate">{c.role || c.client_role || "—"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-2xl border border-white/[0.08] p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
              <h3 className="text-white font-medium mb-2">Delete Contact</h3>
              <p className="text-[#A1A1B5] text-sm mb-5">Are you sure you want to delete <span className="text-white font-medium">{contact.name}</span>? This cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)} className="text-[#6C6C80] hover:text-white">Cancel</Button>
                <Button type="button" onClick={() => deleteMutation.mutate(contact.id)} disabled={deleteMutation.isPending} className="bg-[#FF5C7A] hover:bg-[#FF5C7A]/80 text-white rounded-xl px-5">
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}