/**
 * My Week — the follow-up discipline engine. One screen per owner showing
 * what needs chasing: overdue interaction follow-ups, follow-ups due this
 * week, and pipeline pairs that have gone quiet, sorted tier-first.
 */
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CalendarClock, Clock, KanbanSquare, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useCompanies } from "@/api/crm";
import { emailsMatch } from "@/components/team/teamUtils";
import {
  STAGE_TONES,
  TIER_TONES,
  usePipelineLinks,
  daysSince,
} from "@/api/pipeline";

const TIER_ORDER = { Platinum: 0, Gold: 1, Silver: 2, Bronze: 3 };
const QUIET_DAYS = 30;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function plusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function FollowUpRow({ interaction }) {
  const overdueDays = daysSince(interaction.next_action_date);
  return (
    <Link
      to={`/interactions/${interaction.id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] transition-colors"
    >
      <MessageSquare className="w-4 h-4 text-faint flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink font-medium truncate">{interaction.title}</p>
        <p className="text-xs text-faint truncate">
          {[interaction.company_name, interaction.linked_client_names?.join(", ")].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className={`text-xs whitespace-nowrap ${interaction.next_action_date < todayStr() ? "text-danger font-medium" : "text-muted"}`}>
        {interaction.next_action_date < todayStr()
          ? `${overdueDays}d overdue`
          : new Date(interaction.next_action_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
      </span>
    </Link>
  );
}

export default function MyWeek() {
  const { user } = useAuth();
  const { data: companies = [] } = useCompanies();
  const { data: links = [] } = usePipelineLinks();
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.filter({ status: "Active" }),
    staleTime: 10 * 60 * 1000,
  });
  const { data: interactions = [] } = useQuery({
    queryKey: ["interactions", "followups"],
    queryFn: () => base44.entities.Interaction.list("-date", 1000),
    staleTime: 60 * 1000,
  });

  const myName = useMemo(
    () => teamMembers.find((m) => emailsMatch(m.email, user?.email))?.full_name || user?.full_name || "",
    [teamMembers, user]
  );
  const [owner, setOwner] = useState("mine"); // "mine" | "all" | a member name

  const companyById = useMemo(() => {
    const m = {};
    for (const c of companies) m[c.id] = c;
    return m;
  }, [companies]);

  const ownerName = owner === "mine" ? myName : owner;

  const interactionIsOwned = (i) =>
    owner === "all" ||
    (ownerName && (i.internal_team || []).includes(ownerName)) ||
    emailsMatch(i.created_by, user?.email) && owner === "mine";

  const withFollowUp = interactions.filter((i) => i.next_action_date && interactionIsOwned(i));
  const overdue = withFollowUp
    .filter((i) => i.next_action_date < todayStr())
    .sort((a, b) => (a.next_action_date || "").localeCompare(b.next_action_date || ""));
  const dueThisWeek = withFollowUp
    .filter((i) => i.next_action_date >= todayStr() && i.next_action_date <= plusDays(7))
    .sort((a, b) => (a.next_action_date || "").localeCompare(b.next_action_date || ""));

  const quietPairs = links
    .filter((l) => !l.closed_status)
    .filter((l) => owner === "all" || l.owner === ownerName)
    .filter((l) => {
      const days = daysSince(l.last_activity_date);
      return days === null || days > QUIET_DAYS;
    })
    .sort((a, b) => {
      const ta = TIER_ORDER[companyById[a.trade_account_id]?.tier] ?? 9;
      const tb = TIER_ORDER[companyById[b.trade_account_id]?.tier] ?? 9;
      if (ta !== tb) return ta - tb;
      return (daysSince(b.last_activity_date) ?? 9999) - (daysSince(a.last_activity_date) ?? 9999);
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">My Week</h1>
        <span className="text-sm text-faint">what needs chasing</span>
        <div className="ml-auto flex gap-1 flex-wrap">
          {[{ v: "mine", label: myName ? `Mine (${myName.split(" ")[0]})` : "Mine" }, { v: "all", label: "Whole team" }]
            .concat(teamMembers.filter((m) => m.full_name !== myName).map((m) => ({ v: m.full_name, label: m.full_name.split(" ")[0] })))
            .map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => setOwner(v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  owner === v ? "bg-primary text-white" : "bg-surface border border-line text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Follow-ups */}
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl border border-line shadow-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <CalendarClock className="w-4 h-4 text-danger" />
              <h2 className="text-sm font-semibold text-ink">Overdue follow-ups</h2>
              <span className="text-xs text-faint ml-auto">{overdue.length}</span>
            </div>
            {overdue.length === 0 ? (
              <p className="px-4 py-6 text-sm text-faint text-center">Nothing overdue — clean sheet</p>
            ) : (
              <div className="divide-y divide-line max-h-[420px] overflow-y-auto">
                {overdue.map((i) => <FollowUpRow key={i.id} interaction={i} />)}
              </div>
            )}
          </div>

          <div className="bg-surface rounded-2xl border border-line shadow-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <CalendarClock className="w-4 h-4 text-info" />
              <h2 className="text-sm font-semibold text-ink">Due in the next 7 days</h2>
              <span className="text-xs text-faint ml-auto">{dueThisWeek.length}</span>
            </div>
            {dueThisWeek.length === 0 ? (
              <p className="px-4 py-6 text-sm text-faint text-center">Nothing scheduled this week</p>
            ) : (
              <div className="divide-y divide-line max-h-[420px] overflow-y-auto">
                {dueThisWeek.map((i) => <FollowUpRow key={i.id} interaction={i} />)}
              </div>
            )}
          </div>
        </div>

        {/* Quiet pipeline */}
        <div className="bg-surface rounded-2xl border border-line shadow-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
            <KanbanSquare className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold text-ink">Pipeline gone quiet ({QUIET_DAYS}+ days)</h2>
            <span className="text-xs text-faint ml-auto">{quietPairs.length}</span>
          </div>
          {quietPairs.length === 0 ? (
            <p className="px-4 py-6 text-sm text-faint text-center">Every pair has recent activity</p>
          ) : (
            <div className="divide-y divide-line max-h-[880px] overflow-y-auto">
              {quietPairs.map((l) => {
                const company = companyById[l.trade_account_id];
                const days = daysSince(l.last_activity_date);
                return (
                  <Link
                    key={l.id}
                    to="/pipeline"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-ink font-medium truncate">{l.trade_account_name}</p>
                        {company?.tier && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${TIER_TONES[company.tier] || ""}`}>
                            {company.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-faint truncate">
                        {l.client_name}{l.owner ? ` · ${l.owner}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${STAGE_TONES[l.stage] || ""}`}>
                      {l.stage}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-danger whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {days === null ? "never" : `${days}d`}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
