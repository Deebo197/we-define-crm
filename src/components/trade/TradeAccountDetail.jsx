import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Pencil, Users, Building2, MessageSquare, CheckSquare, MapPin, Calendar, AlertTriangle, Globe } from "lucide-react";
import { externalHref, displayUrl } from "@/lib/externalUrl";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/ui/StatusBadge";
import { format, isPast, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

const INTERACTION_ICONS = {
  "Meeting (In-Person)": "🤝",
  "Meeting (Virtual)": "💻",
  "Call": "📞",
  "Email": "✉️",
  "Event": "🎪",
  "FAM Feedback": "📋",
  "Marketing Discussion": "📣",
};

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <p className="text-primary text-[10px] font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}

export default function TradeAccountDetail({ account, onBack, onEdit, onViewContact }) {
  const navigate = useNavigate();

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["interactions"],
    queryFn: () => base44.entities.Interaction.list("-date", 100),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.Action.list("-created_date", 100),
  });

  // Filter to this account
  const accountContacts = contacts.filter(
    c => c.company_type === "TradeAccount" && c.company_id === account.id
  );
  const linkedClients = clients.filter(
    c => account.linked_clients?.includes(c.id)
  );
  const accountInteractions = interactions
    .filter(i => i.company_id === account.id || i.company_type === "TradeAccount" && i.company_name === account.name)
    .slice(0, 10);
  const openActions = actions.filter(
    a => a.linked_company_id === account.id && !["Completed", "Cancelled"].includes(a.status)
  );

  return (
    <div className="animate-fade-in-up">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={onBack} className="text-faint hover:text-ink transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-ink truncate">{account.name}</h1>
          <p className="text-faint text-sm">
            {account.type}{account.region ? ` · ${account.region}` : ""}
          </p>
          {account.website && (
            <a href={externalHref(account.website)} target="_blank" rel="noopener noreferrer"
              className="text-primary text-sm hover:underline inline-flex items-center gap-1 mt-0.5 break-all">
              <Globe className="w-3.5 h-3.5 shrink-0" /> {displayUrl(account.website)}
            </a>
          )}
        </div>
        <StatusBadge status={account.relationship_strength} />
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-muted hover:text-ink">
          <Pencil className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Overview */}
        {account.notes && (
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
            <SectionHeader icon={MapPin} label="Notes" />
            <p className="text-muted text-sm leading-relaxed">{account.notes}</p>
          </div>
        )}

        {/* Key Contacts */}
        <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
          <SectionHeader icon={Users} label="Key Contacts" />
          {accountContacts.length === 0 ? (
            <p className="text-faint text-sm">No contacts linked to this account.</p>
          ) : (
            <div className="space-y-2">
              {accountContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => onViewContact && onViewContact(contact)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                    <span className="text-primary text-xs font-bold">{contact.name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-sm font-medium truncate group-hover:text-primary transition-colors">{contact.name}</p>
                    <p className="text-faint text-xs truncate">{contact.role || "—"}</p>
                    {/* Coverage clients */}
                    {contact.coverage?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {[...new Set(contact.coverage.flatMap(cv => cv.clients ?? []))]
                          .map(cid => clients.find(cl => cl.id === cid)?.name)
                          .filter(Boolean)
                          .map(name => (
                            <span key={name} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-white">{name}</span>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        onClick={e => e.stopPropagation()}
                        className="text-faint text-xs hover:text-primary transition-colors truncate max-w-[120px]"
                      >
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="text-faint text-xs hover:text-success transition-colors"
                      >
                        {contact.phone}
                      </a>
                    )}
                    <span className="text-faint text-xs opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linked Clients */}
        <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
          <SectionHeader icon={Building2} label="Linked Clients" />
          {linkedClients.length === 0 ? (
            <p className="text-faint text-sm">No clients linked to this account.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {linkedClients.map(client => (
                <div key={client.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-canvas border border-line hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-ink text-xs font-medium">{client.name}</span>
                  {client.reporting_group && (
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">{client.reporting_group}</span>
                  )}
                  <StatusBadge status={client.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Interactions */}
        <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
          <SectionHeader icon={MessageSquare} label="Recent Interactions" />
          {accountInteractions.length === 0 ? (
            <p className="text-faint text-sm">No interactions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {accountInteractions.map(interaction => (
                <div
                  key={interaction.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-canvas border border-line hover:border-line-strong transition-all cursor-pointer group"
                  onClick={() => navigate(`/interactions/${interaction.id}`)}
                >
                  <span className="text-base mt-0.5">{INTERACTION_ICONS[interaction.type] || "💬"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-sm font-medium truncate group-hover:text-primary transition-colors">{interaction.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-faint text-xs">{interaction.type}</span>
                      {interaction.linked_client_names?.length > 0 && (
                        <span className="text-faint text-xs">· {interaction.linked_client_names.join(", ")}</span>
                      )}
                    </div>
                  </div>
                  {interaction.date && (
                    <span className="text-faint text-xs shrink-0">
                      {format(parseISO(interaction.date), "d MMM yyyy")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Actions */}
        <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
          <SectionHeader icon={CheckSquare} label="Open Actions" />
          {openActions.length === 0 ? (
            <p className="text-faint text-sm">No open actions.</p>
          ) : (
            <div className="space-y-2">
              {openActions.map(action => {
                const isOverdue = action.due_date && isPast(parseISO(action.due_date)) && action.status !== "Completed";
                return (
                  <div key={action.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isOverdue ? "bg-danger/5 border-danger/20" : "bg-canvas border-line"}`}>
                    {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-sm truncate">{action.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {action.owner && <span className="text-faint text-xs">{action.owner}</span>}
                        {action.due_date && (
                          <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-danger" : "text-faint"}`}>
                            <Calendar className="w-3 h-3" />
                            {format(parseISO(action.due_date), "d MMM")}
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
      </div>
    </div>
  );
}