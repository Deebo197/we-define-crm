import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft, Pencil, Users, Building2, MessageSquare, CheckSquare, MapPin,
  Calendar, AlertTriangle, Globe, ChevronDown, ChevronRight, Network, UserX,
  Crosshair, Home, Store, Laptop,
} from "lucide-react";
import { externalHref, displayUrl } from "@/lib/externalUrl";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/ui/StatusBadge";
import { format, isPast, parseISO, formatDistanceToNow, isThisWeek } from "date-fns";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { emailsMatch } from "@/components/team/teamUtils";
import {
  usePeople, useRoleSeats, useGroupLinks, useAllActions, useAllInteractions,
  useCompanies, OPEN_ACTION,
} from "@/api/crm";
import {
  effectiveDestinations, hasDestinationOverride, patchLabel,
  expandThroughGroupLinks, groupRelationsFor,
} from "@/lib/targeting";
import { TempCoverDialog, FillSeatDialog } from "@/components/crm/SeatFillDialog";
import CompanyTimeline from "@/components/trade/CompanyTimeline";
import {
  STAGE_TONES, CLOSED_TONE, isPipelineEligible,
  useClients, usePipelineLinks,
} from "@/api/pipeline";

/** Per-client pipeline stage chips shown in the company header. */
function PipelineChips({ account }) {
  const { data: clients = [] } = useClients();
  const { data: links = [] } = usePipelineLinks();
  if (!isPipelineEligible(account)) return null;
  const activeClients = clients.filter((c) => !c.is_internal);
  if (activeClients.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <span className="text-[10px] uppercase tracking-wider text-faint font-semibold">Pipeline</span>
      {activeClients.map((c) => {
        const link = links.find(
          (l) => l.trade_account_id === account.id && l.client_id === c.id
        );
        const label = link
          ? link.closed_status || link.stage
          : "—";
        const tone = link
          ? link.closed_status
            ? CLOSED_TONE
            : STAGE_TONES[link.stage] || ""
          : "text-faint border-line border-dashed";
        return (
          <Link
            key={c.id}
            to="/pipeline"
            title={`${c.name}: ${link ? label : "not in pipeline"}`}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${tone} hover:ring-1 hover:ring-primary/30`}
          >
            {c.name.split(" ")[0]} · {label}
          </Link>
        );
      })}
    </div>
  );
}

const INTERACTION_ICONS = {
  "Meeting (In-Person)": "🤝",
  "Meeting (Virtual)": "💻",
  "Call": "📞",
  "Email": "✉️",
  "Event": "🎪",
  "FAM Feedback": "📋",
  "Marketing Discussion": "📣",
};

const LOCATION_ICONS = { HQ: Building2, "Retail store": Store, "Home worker": Home };

function SectionHeader({ icon: Icon, label, right }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <p className="text-primary text-[10px] font-bold uppercase tracking-widest">{label}</p>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

function Tag({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-black/[0.04] text-muted border-line",
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-success/10 text-[#00804C] border-success/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${tones[tone]}`}>
      {children}
    </span>
  );
}

function ActionRow({ action }) {
  const isOverdue = action.due_date && isPast(parseISO(action.due_date)) && action.status !== "Completed";
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isOverdue ? "bg-danger/5 border-danger/20" : "bg-canvas border-line"}`}>
      {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <p className="text-ink text-sm">{action.description}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {action.owner && <span className="text-faint text-xs">{action.owner}</span>}
          {action.linked_contact_name && <span className="text-faint text-xs">· {action.linked_contact_name}</span>}
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
}

// One employed person, expandable in place.
function PersonRow({ person, company, openActions, interactions }) {
  const [expanded, setExpanded] = useState(false);
  const [showInteractions, setShowInteractions] = useState(false);

  const dests = effectiveDestinations(person, company);
  const patch = patchLabel(dests);
  const LocIcon = LOCATION_ICONS[person.location_type] || null;

  const personInteractions = useMemo(
    () =>
      interactions
        .filter((i) => i.contact_ids?.includes(person.id))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3),
    [interactions, person.id]
  );

  return (
    <div className="rounded-xl border border-line bg-canvas overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/[0.02] transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-faint shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-faint shrink-0" />}
        <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
          <span className="text-primary text-xs font-bold">{person.name?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-ink text-sm font-medium truncate">{person.name}</p>
          <p className="text-faint text-xs truncate">
            {patch || "No destinations"}
            {hasDestinationOverride(person) && <span className="text-primary"> · override</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {person.location_type && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-black/[0.04] text-muted border border-line">
              {LocIcon ? <LocIcon className="w-2.5 h-2.5" /> : <Laptop className="w-2.5 h-2.5" />}
              {person.location_type}
            </span>
          )}
          {openActions.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning/[0.18] text-[#B26B00]">
              {openActions.length} open
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-line bg-surface px-4 py-3 space-y-3">
          {/* Their open actions */}
          {openActions.length === 0 ? (
            <p className="text-faint text-xs">No open actions for {person.name}.</p>
          ) : (
            <div className="space-y-2">
              {openActions.map((a) => <ActionRow key={a.id} action={a} />)}
            </div>
          )}

          {/* Last interactions — collapsed by default */}
          <div>
            <button
              type="button"
              onClick={() => setShowInteractions((s) => !s)}
              className="flex items-center gap-1.5 text-faint text-xs hover:text-ink transition-colors"
            >
              {showInteractions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Last interactions{personInteractions.length > 0 ? ` (${personInteractions.length})` : ""}
            </button>
            {showInteractions && (
              personInteractions.length === 0 ? (
                <p className="text-faint text-xs mt-2">No interactions involving {person.name} yet.</p>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {personInteractions.map((i) => (
                    <Link
                      key={i.id}
                      to={`/interactions/${i.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg bg-canvas border border-line hover:border-primary/30 transition-all group"
                    >
                      <span className="text-sm">{INTERACTION_ICONS[i.type] || "💬"}</span>
                      <span className="text-ink text-xs font-medium truncate flex-1 group-hover:text-primary transition-colors">{i.title}</span>
                      {i.date && <span className="text-faint text-[10px] shrink-0">{format(parseISO(i.date), "d MMM yyyy")}</span>}
                    </Link>
                  ))}
                </div>
              )
            )}
          </div>

          <Link to={`/contacts/${person.id}`} className="inline-flex items-center gap-1 text-primary text-xs hover:underline">
            Open full profile →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function TradeAccountDetail({ account, onBack, onEdit }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scope, setScope] = useState("team"); // "team" | "me" — whole team is the default
  const [seatDialog, setSeatDialog] = useState(null); // { seat, mode: "cover" | "fill" }

  const { data: companies = [] } = useCompanies();
  const { data: people = [] } = usePeople();
  const { data: seats = [] } = useRoleSeats();
  const { data: groupLinks = [] } = useGroupLinks();
  const { data: actions = [] } = useAllActions();
  const { data: interactions = [] } = useAllInteractions();
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.filter({ status: "Active" }),
  });

  const myName =
    teamMembers.find((m) => emailsMatch(m.email, user?.email))?.full_name ||
    user?.full_name ||
    "";

  // People employed here
  const employees = useMemo(
    () => people.filter((p) => p.company_id === account.id),
    [people, account.id]
  );
  const employeeIds = useMemo(() => new Set(employees.map((p) => p.id)), [employees]);

  // Whole-company outstanding picture: actions linked to the company itself or
  // to anyone employed here, open only.
  const companyOpenActions = useMemo(() => {
    const open = actions.filter(
      (a) =>
        OPEN_ACTION(a) &&
        (a.linked_company_id === account.id || (a.linked_contact_id && employeeIds.has(a.linked_contact_id)))
    );
    const scoped = scope === "me" && myName ? open.filter((a) => a.owner === myName) : open;
    return [...scoped].sort(
      (a, b) => new Date(a.due_date || "9999-12-31") - new Date(b.due_date || "9999-12-31")
    );
  }, [actions, account.id, employeeIds, scope, myName]);

  const actionGroups = useMemo(() => {
    const groups = { Overdue: [], "This week": [], Later: [], "No due date": [] };
    companyOpenActions.forEach((a) => {
      if (!a.due_date) groups["No due date"].push(a);
      else if (isPast(parseISO(a.due_date))) groups.Overdue.push(a);
      else if (isThisWeek(parseISO(a.due_date), { weekStartsOn: 1 })) groups["This week"].push(a);
      else groups.Later.push(a);
    });
    return Object.entries(groups).filter(([, list]) => list.length > 0);
  }, [companyOpenActions]);

  // Vacant / temp-covered seats at this company
  const openSeats = useMemo(
    () => seats.filter((s) => s.company_id === account.id && s.status !== "Occupied"),
    [seats, account.id]
  );

  // Group context
  const { parents, children, siblings } = useMemo(
    () => groupRelationsFor(account.id, groupLinks),
    [account.id, groupLinks]
  );
  const groupCompanyIds = useMemo(
    () => expandThroughGroupLinks([account.id], groupLinks),
    [account.id, groupLinks]
  );
  const peopleAcrossGroup = useMemo(
    () => people.filter((p) => p.company_id && groupCompanyIds.has(p.company_id)).length,
    [people, groupCompanyIds]
  );
  const hasGroup = parents.length > 0 || children.length > 0 || siblings.length > 0;

  const groupContextLine = parents.length
    ? `Part of ${parents.map((l) => l.parent_company_name).filter(Boolean).join(", ")}${parents[0]?.label ? ` — ${parents[0].label.toLowerCase()}` : ""}`
    : children.length
      ? `Group of ${children.length} ${children.length === 1 ? "company" : "companies"}`
      : "";

  // Last-interaction recency
  const lastInteractionDate = useMemo(() => {
    const fromInteractions = interactions
      .filter((i) => i.company_id === account.id || i.contact_ids?.some((id) => employeeIds.has(id)))
      .map((i) => i.date)
      .filter(Boolean)
      .sort()
      .pop();
    return fromInteractions || account.last_interaction_date || null;
  }, [interactions, account.id, account.last_interaction_date, employeeIds]);

  const companyInteractions = useMemo(
    () =>
      interactions
        .filter((i) => i.company_id === account.id || (i.company_type === "TradeAccount" && i.company_name === account.name))
        .slice(0, 5),
    [interactions, account.id, account.name]
  );

  const relatedLinks = useMemo(() => {
    const rows = [];
    parents.forEach((l) =>
      rows.push({ id: l.parent_company_id, name: l.parent_company_name, kind: l.link_kind, label: l.label, relation: "Parent" })
    );
    children.forEach((l) =>
      rows.push({ id: l.child_company_id, name: l.child_company_name, kind: l.link_kind, label: l.label, relation: "Member" })
    );
    siblings.forEach((l) =>
      rows.push({ id: l.child_company_id, name: l.child_company_name, kind: l.link_kind, label: l.label, relation: "Sibling" })
    );
    // Dedupe by company id
    const seen = new Set();
    return rows.filter((r) => r.id && !seen.has(r.id) && seen.add(r.id));
  }, [parents, children, siblings]);

  const goToCompany = (id) => {
    const target = companies.find((c) => c.id === id);
    if (target) navigate(`/trade-accounts/${id}`);
  };

  return (
    <div className="animate-fade-in-up">
      {/* ── Header ── */}
      <div className="flex items-start gap-3 mb-6 flex-wrap">
        <button onClick={onBack} className="text-faint hover:text-ink transition-colors mt-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-ink">{account.name}</h1>
            {account.tier && <Tag tone="primary">{account.tier}</Tag>}
            <StatusBadge status={account.relationship_strength} />
          </div>
          <p className="text-faint text-sm mt-0.5">
            {[account.type, account.region].filter(Boolean).join(" · ")}
          </p>
          {groupContextLine && (
            <p className="text-muted text-xs mt-1 flex items-center gap-1">
              <Network className="w-3 h-3 text-primary" /> {groupContextLine}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {account.bonded_agency && <Tag tone="primary">Bonded Agency</Tag>}
            {account.sector && <Tag>{account.sector}</Tag>}
            {(account.destinations ?? []).map((d) => (
              <Tag key={d.destination} tone={d.strength === "Core" ? "success" : "neutral"}>
                {d.destination}{d.strength ? ` · ${d.strength}` : ""}
              </Tag>
            ))}
            {(account.specialisms ?? []).map((s) => (
              <Tag key={s} tone="primary">{s}</Tag>
            ))}
          </div>
          <PipelineChips account={account} />
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {account.website && (
              <a href={externalHref(account.website)} target="_blank" rel="noopener noreferrer"
                className="text-primary text-sm hover:underline inline-flex items-center gap-1 break-all">
                <Globe className="w-3.5 h-3.5 shrink-0" /> {displayUrl(account.website)}
              </a>
            )}
            {lastInteractionDate && (
              <span className="text-faint text-xs flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Last interaction {formatDistanceToNow(parseISO(lastInteractionDate), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-muted hover:text-ink">
          <Pencil className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* ── Whole-company outstanding picture (FIRST) ── */}
        <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
          <SectionHeader
            icon={CheckSquare}
            label={`Outstanding (${companyOpenActions.length})`}
            right={
              <div className="flex gap-1 bg-canvas border border-line rounded-xl p-0.5">
                {[
                  { key: "me", label: "Me" },
                  { key: "team", label: "Whole team" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setScope(t.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      scope === t.key ? "bg-primary text-white" : "text-faint hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            }
          />
          {companyOpenActions.length === 0 ? (
            <p className="text-faint text-sm">
              {scope === "me" ? "Nothing outstanding for you at this company." : "Nothing outstanding across the team. 🎉"}
            </p>
          ) : (
            <div className="space-y-4">
              {actionGroups.map(([groupLabel, list]) => (
                <div key={groupLabel}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${groupLabel === "Overdue" ? "text-danger" : "text-faint"}`}>
                    {groupLabel}
                  </p>
                  <div className="space-y-2">
                    {list.map((a) => <ActionRow key={a.id} action={a} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── People ── */}
        <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
          <SectionHeader icon={Users} label={`People (${employees.length})`} />
          {employees.length === 0 ? (
            <p className="text-faint text-sm">No people recorded at this company.</p>
          ) : (
            <div className="space-y-2">
              {employees.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  company={account}
                  openActions={actions.filter((a) => OPEN_ACTION(a) && a.linked_contact_id === person.id)}
                  interactions={interactions}
                />
              ))}
            </div>
          )}

          {/* Vacant / temp-covered seats */}
          {openSeats.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-faint text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <UserX className="w-3 h-3" /> Open seats ({openSeats.length})
              </p>
              <div className="space-y-2">
                {openSeats.map((seat) => (
                  <div key={seat.id} className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-dashed border-line">
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-sm font-medium truncate">{seat.title || "Untitled seat"}</p>
                      <p className="text-faint text-xs">
                        {seat.status === "Temp-covered" && seat.covering_person_name
                          ? `Temp-covered by ${seat.covering_person_name}`
                          : "Vacant"}
                        {seat.end_date ? ` · since ${format(parseISO(seat.end_date), "d MMM yyyy")}` : ""}
                      </p>
                      {seat.notes && <p className="text-faint text-[10px] mt-0.5 truncate">{seat.notes.split("\n").pop()}</p>}
                    </div>
                    {seat.status !== "Temp-covered" && (
                      <Button
                        type="button" variant="ghost" size="sm"
                        onClick={() => setSeatDialog({ seat, mode: "cover" })}
                        className="text-muted hover:text-ink text-xs h-8"
                      >
                        Temp-cover
                      </Button>
                    )}
                    <Button
                      type="button" size="sm"
                      onClick={() => setSeatDialog({ seat, mode: "fill" })}
                      className="bg-primary hover:bg-primary-hover text-white text-xs rounded-lg h-8"
                    >
                      Fill seat
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Group panel ── */}
        {hasGroup && (
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
            <SectionHeader
              icon={Network}
              label="Group"
              right={
                <Link
                  to={`/targeting?group=${account.id}`}
                  className="inline-flex items-center gap-1.5 text-primary text-xs hover:underline"
                >
                  <Crosshair className="w-3 h-3" /> People across group: {peopleAcrossGroup}
                </Link>
              }
            />
            <div className="space-y-2">
              {relatedLinks.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => goToCompany(row.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-ink text-sm font-medium flex-1 truncate group-hover:text-primary transition-colors">{row.name}</span>
                  <Tag tone={row.kind === "Ownership" ? "primary" : "neutral"}>{row.kind}</Tag>
                  {row.label && <Tag>{row.label}</Tag>}
                  <span className="text-faint text-[10px]">{row.relation}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        {account.notes && (
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
            <SectionHeader icon={MapPin} label="Notes" />
            <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap">{account.notes}</p>
          </div>
        )}

        {/* ── Activity timeline: interactions + pipeline moves + training + events ── */}
        <CompanyTimeline account={account} />
      </div>

      {/* Seat dialogs */}
      {seatDialog?.mode === "cover" && (
        <TempCoverDialog seat={seatDialog.seat} onClose={() => setSeatDialog(null)} />
      )}
      {seatDialog?.mode === "fill" && (
        <FillSeatDialog seat={seatDialog.seat} onClose={() => setSeatDialog(null)} />
      )}
    </div>
  );
}
