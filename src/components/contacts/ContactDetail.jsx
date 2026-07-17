import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft, Mail, Phone, Smartphone, Linkedin, MapPin, Pencil, Trash2,
  Calendar, Users, MessageSquare, CheckSquare, Building2, Globe, ExternalLink,
  MoreHorizontal, Briefcase, AlertTriangle, Crosshair, UserX, ArrowRightLeft, Search,
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ContactForm from "@/components/contacts/ContactForm";
import { externalHref, displayUrl } from "@/lib/externalUrl";
import { useCompanies, useRoleSeats, useAllActions, useAllInteractions, usePeople, OPEN_ACTION } from "@/api/crm";
import { currentSeatFor, syncSeatTitle } from "@/api/seats";
import { effectiveDestinations, hasDestinationOverride, effectiveSector, effectiveSpecialisms } from "@/lib/targeting";
import { MovePersonDialog, MarkVacantDialog } from "@/components/crm/MovePersonDialog";
import ContactPipeline from "@/components/contacts/ContactPipeline";
import LinkedInEnrichDialog from "@/components/contacts/LinkedInEnrichDialog";

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-canvas flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-faint" />
      </div>
      <div>
        <p className="text-faint text-[10px] uppercase tracking-wider font-medium">{label}</p>
        <p className="text-ink text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-black/[0.04] text-muted border-line",
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-success/10 text-[#00804C] border-success/20",
    warning: "bg-warning/[0.18] text-[#B26B00] border-warning/20",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs border ${tones[tone]}`}>{children}</span>
  );
}

export default function ContactDetail({ contact, onBack, onDeleted, onViewContact }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moveDialog, setMoveDialog] = useState(false);
  const [vacantDialog, setVacantDialog] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const queryClient = useQueryClient();

  const { data: allContacts = [] } = usePeople();
  const { data: tradeAccounts = [] } = useCompanies();
  const { data: seats = [] } = useRoleSeats();
  const { data: allInteractions = [] } = useAllInteractions();
  const { data: allActions = [] } = useAllActions();

  const [showAllInteractions, setShowAllInteractions] = useState(false);

  const company = tradeAccounts.find((a) => a.id === contact.company_id) || null;
  const seat = currentSeatFor(contact.id, seats);

  // Colleagues: same company_id (if set), excluding self
  const colleagues = allContacts.filter(
    (c) => c.id !== contact.id && contact.company_id && c.company_id === contact.company_id
  );

  const contactInteractions = useMemo(
    () =>
      allInteractions
        .filter((i) => i.contact_ids?.includes(contact.id))
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [allInteractions, contact.id]
  );
  const visibleInteractions = showAllInteractions ? contactInteractions : contactInteractions.slice(0, 5);

  // ALL their open actions
  const openActions = useMemo(
    () =>
      allActions
        .filter((a) => a.linked_contact_id === contact.id && OPEN_ACTION(a))
        .sort((a, b) => new Date(a.due_date || "9999-12-31") - new Date(b.due_date || "9999-12-31")),
    [allActions, contact.id]
  );

  // Effective targeting
  const dests = effectiveDestinations(contact, company);
  const destOverride = hasDestinationOverride(contact);
  const sector = effectiveSector(contact, company);
  const sectorOverride = !!contact.sector_override;
  const specialisms = effectiveSpecialisms(contact, company);
  const specialismsOverride = !!contact.specialisms_override?.length;
  const inheritsEverything = !destOverride && !sectorOverride && !specialismsOverride;

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, seatTitle }) => {
      await base44.entities.Contact.update(id, data);
      if (seatTitle !== undefined) {
        await syncSeatTitle({ person: { ...contact, ...data, id }, seats, title: seatTitle });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["role-seats"] });
      setEditing(false);
    },
  });

  // Soft-archive the person and their seats — interactions and pipeline
  // contacts keep valid references and the record stays recoverable.
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Contact.update(id, { archived: true });
      const personSeats = await base44.entities.RoleSeat.filter({ person_id: id });
      await Promise.all(
        personSeats.filter(s => !s.archived).map(s => base44.entities.RoleSeat.update(s.id, { archived: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["role-seats"] });
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
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-faint hover:text-ink transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm">People</span>
        </button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setEnriching(true)} className="text-muted hover:text-ink gap-1.5 text-sm h-9">
            <Search className="w-4 h-4" /> Enrich
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(true)} className="text-muted hover:text-ink gap-1.5 text-sm h-9">
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className="text-muted hover:text-ink h-9 px-2">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface-elevated border-line">
              <DropdownMenuItem onClick={() => setMoveDialog(true)} className="gap-2 text-sm">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Move to another company…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVacantDialog(true)} className="gap-2 text-sm">
                <UserX className="w-3.5 h-3.5" /> Mark seat vacant
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="gap-2 text-sm text-danger focus:text-danger">
                <Trash2 className="w-3.5 h-3.5" /> Delete person
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              onSubmit={(data, seatTitle) => updateMutation.mutate({ id: contact.id, data, seatTitle })}
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
          {/* Identity hero */}
          <div className="bg-surface rounded-2xl shadow-card border border-line p-6 mb-5">
            <div className="flex items-center gap-4">
              {contact.photo_url ? (
                <img
                  src={contact.photo_url}
                  alt={contact.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-line shrink-0"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div className="w-16 h-16 rounded-2xl bg-primary-soft items-center justify-center shrink-0" style={{ display: contact.photo_url ? "none" : "flex" }}>
                <span className="text-primary font-bold text-2xl">{contact.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-ink">{contact.name}</h1>
                <p className="text-muted text-sm mt-0.5">
                  {(seat?.title || contact.role) && <span>{seat?.title || contact.role}</span>}
                  {contact.company_id && (
                    <>
                      {(seat?.title || contact.role) && " at "}
                      <Link to={`/trade-accounts/${contact.company_id}`} className="text-primary hover:underline">
                        {contact.company_name}
                      </Link>
                    </>
                  )}
                  {!contact.company_id && !seat?.title && !contact.role && <span className="text-faint">No current company</span>}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {contact.function && <Pill tone="primary">{contact.function}</Pill>}
                  {contact.seniority && <Pill>{contact.seniority}</Pill>}
                  {contact.location_type && <Pill>{contact.location_type}</Pill>}
                </div>
              </div>
            </div>

            {/* Seat info */}
            {seat && (
              <div className="mt-4 pt-4 border-t border-line flex items-center gap-3 flex-wrap">
                <Briefcase className="w-3.5 h-3.5 text-faint" />
                <span className="text-muted text-xs">
                  Seat: <span className="text-ink font-medium">{seat.title || "Untitled"}</span>
                  {seat.start_date && <span className="text-faint"> · since {format(parseISO(seat.start_date), "MMM yyyy")}</span>}
                </span>
                <StatusBadge status={seat.status} />
                {seat.status === "Temp-covered" && seat.covering_person_name && (
                  <span className="text-faint text-xs">Covered by {seat.covering_person_name}</span>
                )}
              </div>
            )}
          </div>

          {/* Effective targeting */}
          <div className="bg-surface rounded-2xl shadow-card border border-primary/20 p-5 mb-5">
            <h2 className="text-primary text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5" /> Targeting
            </h2>
            {company && inheritsEverything && (
              <p className="text-faint text-xs mb-3">Inherits from {company.name} — no personal overrides set.</p>
            )}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-faint text-[10px] uppercase tracking-wider font-medium w-24 shrink-0">Destinations</span>
                {dests.length === 0 ? (
                  <span className="text-faint text-xs">None recorded</span>
                ) : (
                  dests.map((d) => (
                    <Pill key={d.destination} tone={d.strength === "Core" ? "success" : "neutral"}>
                      {d.destination}{d.strength ? ` ${d.strength}` : ""}
                    </Pill>
                  ))
                )}
                {destOverride && <Pill tone="warning">override</Pill>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-faint text-[10px] uppercase tracking-wider font-medium w-24 shrink-0">Sector</span>
                {sector ? <Pill>{sector}</Pill> : <span className="text-faint text-xs">None recorded</span>}
                {sectorOverride && <Pill tone="warning">override</Pill>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-faint text-[10px] uppercase tracking-wider font-medium w-24 shrink-0">Specialisms</span>
                {specialisms.length === 0 ? (
                  <span className="text-faint text-xs">None recorded</span>
                ) : (
                  specialisms.map((s) => <Pill key={s} tone="primary">{s}</Pill>)
                )}
                {specialismsOverride && <Pill tone="warning">override</Pill>}
              </div>
            </div>
          </div>

          {/* Open actions */}
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5 mb-5">
            <h2 className="text-faint text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5" /> Open Actions
              {openActions.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-black/[0.04] text-muted">{openActions.length}</span>
              )}
            </h2>
            {openActions.length === 0 ? (
              <p className="text-faint text-sm">No open actions for {contact.name}.</p>
            ) : (
              <div className="space-y-2">
                {openActions.map((action) => {
                  const isOverdue = action.due_date && isPast(parseISO(action.due_date));
                  return (
                    <div key={action.id} className={`flex items-start gap-3 p-3 rounded-xl border ${isOverdue ? "bg-danger/5 border-danger/20" : "bg-canvas border-line"}`}>
                      {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-ink text-sm">{action.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {action.owner && <span className="text-faint text-xs">{action.owner}</span>}
                          {action.due_date && (
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-danger" : "text-faint"}`}>
                              <Calendar className="w-3 h-3" />
                              {format(parseISO(action.due_date), "d MMM yyyy")}
                              {isOverdue && " · Overdue"}
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={action.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pipeline entries where this person is a contact */}
          <ContactPipeline contactId={contact.id} />

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Contact Info */}
            <div className="bg-surface rounded-2xl shadow-card border border-line p-5 space-y-4">
              <h2 className="text-faint text-xs font-semibold uppercase tracking-wider">Contact Info</h2>
              <InfoRow icon={Mail} label="Email" value={contact.email} />
              <InfoRow icon={Phone} label="Phone" value={contact.phone} />
              <InfoRow icon={Smartphone} label="Mobile" value={contact.mobile} />
              {contact.linkedin && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-canvas flex items-center justify-center shrink-0 mt-0.5">
                    <Linkedin className="w-3.5 h-3.5 text-faint" />
                  </div>
                  <div>
                    <p className="text-faint text-[10px] uppercase tracking-wider font-medium">LinkedIn</p>
                    <a href={externalHref(contact.linkedin)} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-0.5 block truncate max-w-[220px]">{displayUrl(contact.linkedin)}</a>
                  </div>
                </div>
              )}
              {contact.birthday && <InfoRow icon={Calendar} label="Birthday" value={contact.birthday} />}
            </div>

            {/* Work (from Company) */}
            {company && (
              <div className="bg-surface rounded-2xl shadow-card border border-line p-5 space-y-4">
                <h2 className="text-faint text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Work —{" "}
                  <Link to={`/trade-accounts/${company.id}`} className="text-primary hover:underline normal-case">
                    {company.name}
                  </Link>
                </h2>
                {(company.address_line1 || company.city) ? (
                  <InfoRow icon={MapPin} label="Office Address" value={[company.address_line1, company.city, company.county, company.address_postcode, company.address_country].filter(Boolean).join(", ")} />
                ) : null}
                {company.phone && <InfoRow icon={Phone} label="Office Phone" value={company.phone} />}
                {company.website && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-canvas flex items-center justify-center shrink-0 mt-0.5">
                      <Globe className="w-3.5 h-3.5 text-faint" />
                    </div>
                    <div>
                      <p className="text-faint text-[10px] uppercase tracking-wider font-medium">Website</p>
                      <a href={externalHref(company.website)} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-0.5 flex items-center gap-1 break-all">
                        {displayUrl(company.website)} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Home Address */}
            <div className="bg-surface rounded-2xl shadow-card border border-line p-5 space-y-4">
              <h2 className="text-faint text-xs font-semibold uppercase tracking-wider">Home Address</h2>
              {address ? (
                <InfoRow icon={MapPin} label="Address" value={address} />
              ) : (
                <p className="text-faint text-sm">No home address on record</p>
              )}
            </div>

            {/* Tags */}
            {contact.tags?.length > 0 && (
              <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
                <h2 className="text-faint text-xs font-semibold uppercase tracking-wider mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-black/[0.04] text-muted border border-line">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {contact.notes && (
              <div className="bg-surface rounded-2xl shadow-card border border-line p-5 sm:col-span-2">
                <h2 className="text-faint text-xs font-semibold uppercase tracking-wider mb-3">Notes</h2>
                <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Interaction History */}
          <div className="mt-5 bg-surface rounded-2xl shadow-card border border-line p-5">
            <h2 className="text-faint text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Last Interactions
              {contactInteractions.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-black/[0.04] text-muted">{contactInteractions.length}</span>
              )}
            </h2>
            {contactInteractions.length === 0 ? (
              <p className="text-faint text-sm">No interactions recorded with this person yet.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {visibleInteractions.map(interaction => (
                    <Link
                      key={interaction.id}
                      to={`/interactions/${interaction.id}`}
                      className="flex items-start gap-3 p-3 rounded-xl bg-canvas border border-line hover:border-primary/30 hover:bg-primary/5 transition-all group block"
                    >
                      <div className="w-8 h-8 rounded-lg bg-canvas flex items-center justify-center shrink-0 text-sm">
                        {{"Meeting (In-Person)":"🤝","Meeting (Virtual)":"💻","Call":"📞","Email":"✉️","Event":"🎪","FAM Feedback":"📋","Marketing Discussion":"📣"}[interaction.type] || "💬"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink text-sm font-medium group-hover:text-primary transition-colors truncate">{interaction.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-faint text-xs">{interaction.type}</span>
                          {interaction.linked_client_names?.length > 0 && (
                            <span className="text-faint text-xs">· {interaction.linked_client_names.join(", ")}</span>
                          )}
                        </div>
                      </div>
                      {interaction.date && (
                        <span className="text-faint text-xs shrink-0 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(interaction.date), "d MMM yyyy")}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
                {contactInteractions.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllInteractions((s) => !s)}
                    className="text-primary text-xs hover:underline mt-3"
                  >
                    {showAllInteractions ? "Show fewer" : `Show all ${contactInteractions.length}`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Colleagues at same company */}
          {colleagues.length > 0 && (
            <div className="mt-5 bg-surface rounded-2xl shadow-card border border-line p-5">
              <h2 className="text-faint text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Colleagues at {contact.company_name}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {colleagues.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onViewContact && onViewContact(c)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line hover:border-line-strong hover:bg-black/[0.03] transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                      <span className="text-primary font-medium text-sm">{c.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-ink text-sm font-medium group-hover:text-primary transition-colors truncate">{c.name}</p>
                      <p className="text-faint text-xs truncate">{currentSeatFor(c.id, seats)?.title || c.role || "—"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* LinkedIn enrichment */}
      {enriching && <LinkedInEnrichDialog contact={contact} onClose={() => setEnriching(false)} />}

      {/* Person-move dialogs */}
      {moveDialog && <MovePersonDialog person={contact} onClose={() => setMoveDialog(false)} />}
      {vacantDialog && <MarkVacantDialog person={contact} onClose={() => setVacantDialog(false)} />}

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
              className="bg-surface rounded-2xl shadow-card border border-line p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
              <h3 className="text-ink font-medium mb-2">Delete Person</h3>
              <p className="text-muted text-sm mb-5">Are you sure you want to delete <span className="text-ink font-medium">{contact.name}</span>? This cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)} className="text-faint hover:text-ink">Cancel</Button>
                <Button type="button" onClick={() => deleteMutation.mutate(contact.id)} disabled={deleteMutation.isPending} className="bg-danger hover:bg-danger/80 text-white rounded-xl px-5">
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