import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { ArrowLeft, Mail, Phone, Smartphone, Linkedin, MapPin, Pencil, Trash2, Calendar, Users, MessageSquare, Clock, CheckSquare, Building2, Globe, ExternalLink } from "lucide-react";
import { format, isPast } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ContactForm from "@/components/contacts/ContactForm";

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

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
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

  // All interactions for this contact, newest first
  const contactInteractions = allInteractions
    .filter(i => i.contact_ids?.includes(contact.id))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastInteraction = contactInteractions[0];

  // Fetch the linked Trade Account for work address
  const { data: tradeAccounts = [] } = useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => listActiveTradeAccounts(),
    enabled: !!contact.company_id,
  });
  const tradeAccount = tradeAccounts.find(a => a.id === contact.company_id) || null;

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
                {(contact.function || contact.seniority) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {contact.function && (
                      <span className="px-2.5 py-1 rounded-full text-xs bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">
                        {contact.function}
                      </span>
                    )}
                    {contact.seniority && (
                      <span className="px-2.5 py-1 rounded-full text-xs bg-white/[0.06] text-[#A1A1B5] border border-white/[0.08]">
                        {contact.seniority}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coverage — shown prominently */}
          <div className="bg-surface rounded-2xl border border-[#7F5BFF]/20 p-5 mb-5">
            <h2 className="text-[#7F5BFF] text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> Coverage
            </h2>
            {contact.coverage?.length > 0 ? (
              <div className="space-y-3">
                {contact.coverage.map(entry => {
                  const names = (entry.clients ?? [])
                    .map(cid => clients.find(c => c.id === cid)?.name)
                    .filter(Boolean);
                  return (
                    <div key={entry.destination} className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#3DDC97]/10 text-[#3DDC97] border border-[#3DDC97]/20">
                        {entry.destination}
                      </span>
                      {names.length > 0 ? names.map(name => (
                        <span key={name} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#7F5BFF] text-white shadow-lg shadow-[#7F5BFF]/20">
                          {name}
                        </span>
                      )) : (
                        <span className="text-[#6C6C80] text-xs">No clients assigned</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#6C6C80] text-sm">No coverage recorded for this contact</p>
            )}
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

            {/* Work Address (from Trade Account) */}
            {tradeAccount && (
              <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-4">
                <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#7F5BFF]" /> Work — {tradeAccount.name}
                </h2>
                {(tradeAccount.address_line1 || tradeAccount.city) ? (
                  <InfoRow icon={MapPin} label="Office Address" value={[tradeAccount.address_line1, tradeAccount.city, tradeAccount.county, tradeAccount.address_postcode, tradeAccount.address_country].filter(Boolean).join(", ")} />
                ) : null}
                {tradeAccount.phone && <InfoRow icon={Phone} label="Office Phone" value={tradeAccount.phone} />}
                {tradeAccount.website && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                      <Globe className="w-3.5 h-3.5 text-[#6C6C80]" />
                    </div>
                    <div>
                      <p className="text-[#6C6C80] text-[10px] uppercase tracking-wider font-medium">Website</p>
                      <a href={tradeAccount.website} target="_blank" rel="noopener noreferrer" className="text-[#7F5BFF] text-sm hover:underline mt-0.5 flex items-center gap-1">
                        Visit site <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Home Address */}
            <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 space-y-4">
              <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider">Home Address</h2>
              {address ? (
                <InfoRow icon={MapPin} label="Address" value={address} />
              ) : (
                <p className="text-[#6C6C80] text-sm">No home address on record</p>
              )}
            </div>

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

          {/* Next Action */}
          {nextAction && (
            <div className="mt-5">
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
            </div>
          )}

          {/* Full Interaction History */}
          <div className="mt-5 bg-surface rounded-2xl border border-white/[0.06] p-5">
            <h2 className="text-[#6C6C80] text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Interaction History
              {contactInteractions.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-white/[0.06] text-[#A1A1B5]">{contactInteractions.length}</span>
              )}
            </h2>
            {contactInteractions.length === 0 ? (
              <p className="text-[#6C6C80] text-sm">No interactions recorded with this contact yet.</p>
            ) : (
              <div className="space-y-2">
                {contactInteractions.map(interaction => (
                  <Link
                    key={interaction.id}
                    to={`/interactions/${interaction.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-[#7F5BFF]/30 hover:bg-[#7F5BFF]/5 transition-all group block"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 text-sm">
                      {{"Meeting (In-Person)":"🤝","Meeting (Virtual)":"💻","Call":"📞","Email":"✉️","Event":"🎪","FAM Feedback":"📋","Marketing Discussion":"📣"}[interaction.type] || "💬"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium group-hover:text-[#7F5BFF] transition-colors truncate">{interaction.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[#6C6C80] text-xs">{interaction.type}</span>
                        {interaction.linked_client_names?.length > 0 && (
                          <span className="text-[#6C6C80] text-xs">· {interaction.linked_client_names.join(", ")}</span>
                        )}
                      </div>
                    </div>
                    {interaction.date && (
                      <span className="text-[#6C6C80] text-xs shrink-0 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(interaction.date), "d MMM yyyy")}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

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
                      <p className="text-[#6C6C80] text-xs truncate">{c.role || "—"}</p>
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