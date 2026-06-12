import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActivePeople } from "@/api/people";
import {
  ArrowLeft, Building2, Users, MessageSquare, CheckSquare,
  Megaphone, FileText, Pencil, Calendar, Clock, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isPast } from "date-fns";
import StatusBadge from "@/components/ui/StatusBadge";
import ShimmerCard from "@/components/ui/ShimmerCard";
import ClientForm from "@/components/clients/ClientForm";

const typeIcons = {
  "Meeting (In-Person)": "🤝",
  "Meeting (Virtual)": "💻",
  "Call": "📞",
  "Email": "✉️",
  "Event": "🎉",
  "FAM Feedback": "✈️",
  "Marketing Discussion": "📊",
};

function SectionHeader({ icon: Icon, label, count, to }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-ink font-medium text-sm">{label}</h2>
        {count !== undefined && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/[0.04] text-faint">{count}</span>
        )}
      </div>
      {to && (
        <Link to={to} className="text-primary text-xs hover:underline flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const list = await base44.entities.Client.filter({ id });
      return list[0];
    },
    enabled: !!id,
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => listActivePeople(),
  });

  const { data: allInteractions = [], isLoading: loadingInteractions } = useQuery({
    queryKey: ["interactions"],
    queryFn: () => base44.entities.Interaction.list("-date", 200),
  });

  const { data: allActions = [], isLoading: loadingActions } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.Action.list("-created_date", 200),
  });

  const { data: allCampaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list(),
  });

  const { data: allReports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: () => base44.entities.Report.list("-created_date"),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowEdit(false);
    },
  });

  if (isLoading) return <div className="py-12"><ShimmerCard count={4} /></div>;
  if (!client) return <div className="text-faint py-12 text-center">Client not found</div>;

  // Filter related data
  const contacts = allContacts.filter(c => c.coverage?.some(cv => cv.clients?.includes(id)));
  const interactions = allInteractions.filter(i => i.linked_clients?.includes(id)).slice(0, 8);
  const openActions = allActions.filter(a => a.linked_client === id && a.status !== "Completed" && a.status !== "Cancelled");
  const campaigns = allCampaigns.filter(c => c.linked_clients?.includes(id));
  const reports = allReports.filter(r => r.client_id === id || r.grouped_client_ids?.includes(id)).slice(0, 4);

  if (showEdit) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowEdit(false)} className="text-faint hover:text-ink transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-ink">Edit Client</h1>
        </div>
        <ClientForm
          client={client}
          onSubmit={(data) => updateMutation.mutate(data)}
          onCancel={() => setShowEdit(false)}
          isLoading={updateMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/clients")} className="text-faint hover:text-ink transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-ink truncate">{client.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-faint text-xs">{client.type}</span>
              {client.reporting_group && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20">
                  {client.reporting_group}
                </span>
              )}
            </div>
          </div>
        </div>
        <StatusBadge status={client.status} />
        <Button variant="ghost" size="sm" onClick={() => setShowEdit(true)} className="text-muted hover:text-ink shrink-0">
          <Pencil className="w-4 h-4" />
        </Button>
      </div>

      {/* Team + Notes */}
      {(client.lead_team_member_name || client.notes || client.internal_notes) && (
        <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {client.lead_team_member_name && (
              <div>
                <p className="text-faint text-xs mb-1">Lead</p>
                <p className="text-ink text-sm">{client.lead_team_member_name}</p>
              </div>
            )}
            {client.supporting_team_member_names?.length > 0 && (
              <div>
                <p className="text-faint text-xs mb-1">Supporting</p>
                <p className="text-ink text-sm">{client.supporting_team_member_names.join(", ")}</p>
              </div>
            )}
            {client.notes && (
              <div className="sm:col-span-2">
                <p className="text-faint text-xs mb-1">Notes</p>
                <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
            {client.internal_notes && (
              <div className="sm:col-span-2">
                <p className="text-faint text-xs mb-1">Internal Notes</p>
                <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap">{client.internal_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: interactions + actions */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recent Interactions */}
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
            <SectionHeader icon={MessageSquare} label="Recent Interactions" count={interactions.length} to="/interactions" />
            {loadingInteractions ? <ShimmerCard count={3} /> : interactions.length === 0 ? (
              <p className="text-faint text-sm py-2">No interactions logged yet</p>
            ) : (
              <div className="space-y-2">
                {interactions.map(interaction => (
                  <Link
                    key={interaction.id}
                    to={`/interactions/${interaction.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl bg-canvas border border-line hover:bg-black/[0.03] hover:border-line-strong transition-all group"
                  >
                    <span className="text-base mt-0.5 shrink-0">{typeIcons[interaction.type] || "💬"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-sm group-hover:text-primary transition-colors truncate">{interaction.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-faint text-xs">{interaction.type}</span>
                        {interaction.company_name && <span className="text-faint text-xs">· {interaction.company_name}</span>}
                      </div>
                    </div>
                    <span className="text-faint text-xs shrink-0 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {interaction.date && format(new Date(interaction.date), "MMM d, yyyy")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Open Actions */}
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
            <SectionHeader icon={CheckSquare} label="Open Actions" count={openActions.length} to="/actions" />
            {loadingActions ? <ShimmerCard count={2} /> : openActions.length === 0 ? (
              <p className="text-faint text-sm py-2">No open actions</p>
            ) : (
              <div className="space-y-2">
                {openActions.map(action => (
                  <div key={action.id} className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      action.priority === "Urgent" || action.priority === "High" ? "bg-danger" :
                      action.priority === "Medium" ? "bg-warning" : "bg-neutral"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-sm truncate">{action.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {action.owner && <span className="text-faint text-xs">{action.owner}</span>}
                        {action.due_date && (
                          <span className={`text-xs flex items-center gap-1 ${isPast(new Date(action.due_date)) ? "text-danger" : "text-faint"}`}>
                            <Clock className="w-3 h-3" />
                            {format(new Date(action.due_date), "MMM d")}
                          </span>
                        )}
                        {action.linked_interaction_title && (
                          <span className="text-faint text-xs truncate">· {action.linked_interaction_title}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={action.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: contacts, campaigns, reports */}
        <div className="space-y-6">

          {/* Key Contacts */}
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
            <SectionHeader icon={Users} label="Contacts" count={contacts.length} to="/contacts" />
            {contacts.length === 0 ? (
              <p className="text-faint text-sm py-2">No contacts linked</p>
            ) : (
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-canvas border border-line">
                    <div className="w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                      <span className="text-primary text-xs font-semibold">{c.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-ink text-xs font-medium truncate">{c.name}</p>
                      {c.role && <p className="text-faint text-[10px]">{c.role}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Campaigns */}
          {campaigns.length > 0 && (
            <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
              <SectionHeader icon={Megaphone} label="Campaigns" count={campaigns.length} to="/campaigns" />
              <div className="space-y-2">
                {campaigns.map(c => (
                  <div key={c.id} className="p-3 rounded-xl bg-canvas border border-line">
                    <p className="text-ink text-xs font-medium">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={c.status} />
                      <span className="text-faint text-[10px]">{c.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports */}
          {reports.length > 0 && (
            <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
              <SectionHeader icon={FileText} label="Reports" count={reports.length} to="/reports" />
              <div className="space-y-2">
                {reports.map(r => (
                  <div key={r.id} className="p-3 rounded-xl bg-canvas border border-line">
                    <p className="text-ink text-xs font-medium truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={r.status} />
                      <span className="text-faint text-[10px]">{r.month}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
