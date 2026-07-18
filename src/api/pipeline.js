/**
 * Pipeline — one ClientTradeLink per client × tour-operator pair, tracking
 * the onboarding journey from Targeted through to Trading (or a closed
 * outcome). Stage changes always stamp stage_history and last_activity_date.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "./base44Client";
import { emailsMatch } from "@/components/team/teamUtils";

/**
 * Canonical owner name for a logged-in user: their TeamMember record's
 * full_name (matched by email), so auto-stamped owners always use the same
 * spelling as the Team page rather than the login account's display name.
 */
export function resolveOwnerName(teamMembers, user) {
  const match = (teamMembers || []).find((m) => emailsMatch(m.email, user?.email));
  return match?.full_name || user?.full_name || "";
}

export const STAGES = [
  "Targeted",
  "In Discussion",
  "Featuring Agreed",
  "Rates Agreed",
  "Contracted",
  "Trading",
  "Dormant",
];

export const CLOSED_STATUSES = ["Cancelled", "Not Viable"];

/** Map records created under the original stage set onto the current one. */
function normaliseLink(link) {
  let l = link;
  if (l.stage === "Approached") l = { ...l, stage: "In Discussion" };
  if (l.closed_status === "Declined") {
    l = { ...l, stage: "Dormant", closed_status: null };
  }
  return l;
}

export const TIERS = ["Bronze", "Silver", "Gold", "Platinum"];

export const CONTACT_ROLES = [
  "Product Manager",
  "Commercial Manager",
  "Marketing Manager",
  "Head of Product",
  "Other",
];

// Stage → tone, mapped onto the app's status colour language:
// early = blue (new/waiting), mid = amber (in progress), live = green, dormant = grey.
export const STAGE_TONES = {
  Targeted: "bg-canvas text-muted border-line",
  "In Discussion": "bg-info/10 text-info border-info/20",
  "Featuring Agreed": "bg-warning/10 text-warning border-warning/20",
  "Rates Agreed": "bg-warning/10 text-warning border-warning/20",
  Contracted: "bg-success/10 text-success border-success/20",
  Trading: "bg-success/10 text-success border-success/20",
  Dormant: "bg-canvas text-faint border-line",
};

export const CLOSED_TONE = "bg-danger/10 text-danger border-danger/20";

export const TIER_TONES = {
  Platinum: "bg-primary-soft text-primary border-primary/20",
  Gold: "bg-warning/10 text-warning border-warning/20",
  Silver: "bg-canvas text-muted border-line-strong",
  Bronze: "bg-canvas text-faint border-line",
};

/** Tour operators, plus bonded agencies operating as tour operators. */
export function isPipelineEligible(company) {
  return (company.type || "").trim().toLowerCase() === "tour operator" || !!company.bonded_agency;
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipelineLinks() {
  return useQuery({
    queryKey: ["client-trade-links"],
    queryFn: () => base44.entities.ClientTradeLink.list("-updated_date", 5000),
    staleTime: 60 * 1000,
    select: (links) => links.map(normaliseLink),
  });
}

const today = () => new Date().toISOString().split("T")[0];

function historyEntry(stage, { by, interactionId, note } = {}) {
  return {
    stage,
    date: new Date().toISOString(),
    by: by || "",
    interaction_id: interactionId || "",
    note: note || "",
  };
}

export async function createLink({ client, company, stage = "Targeted", contacts = [], by, owner }) {
  return base44.entities.ClientTradeLink.create({
    client_id: client.id,
    client_name: client.name,
    trade_account_id: company.id,
    trade_account_name: company.name,
    stage,
    owner: owner || "",
    contacts,
    stage_history: [historyEntry(stage, { by })],
    last_activity_date: today(),
  });
}

export async function updateLinkOwner(link, owner) {
  return base44.entities.ClientTradeLink.update(link.id, { owner: owner || "" });
}

/** Partner tier lives on the company — one tier across all clients. */
export async function updateCompanyTier(companyId, tier) {
  return base44.entities.TradeAccount.update(companyId, { tier: tier || null });
}

/** Move an open pair to a new stage (also reopens a closed pair). */
export async function moveStage(link, stage, opts = {}) {
  return base44.entities.ClientTradeLink.update(link.id, {
    stage,
    closed_status: null,
    closed_reason: "",
    closed_from_stage: "",
    stage_history: [...(link.stage_history || []), historyEntry(stage, opts)],
    last_activity_date: today(),
  });
}

/** Close a pair: Declined / Cancelled / Not Viable. */
export async function closeLink(link, { status, reason, by }) {
  return base44.entities.ClientTradeLink.update(link.id, {
    closed_status: status,
    closed_reason: reason || "",
    closed_from_stage: link.stage,
    stage_history: [
      ...(link.stage_history || []),
      historyEntry(`Closed: ${status}`, { by, note: reason }),
    ],
    last_activity_date: today(),
  });
}

export async function updateLinkContacts(link, contacts) {
  return base44.entities.ClientTradeLink.update(link.id, { contacts });
}

/** Booking evidence per period — makes tiers and Trading status evidence-based. */
export async function updateLinkBookings(link, bookings) {
  return base44.entities.ClientTradeLink.update(link.id, { bookings });
}

/** Default booking period label for today, e.g. "2026-Q3". */
export function currentQuarterLabel() {
  const d = new Date();
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

/**
 * Interaction integration: ensure a pair exists for (client, company) and
 * apply a stage change driven by an interaction. Creates missing pairs at
 * the given stage; existing pairs move stage only if one was chosen,
 * otherwise just refresh last_activity_date.
 */
export async function applyInteractionToPair({ links, client, company, stage, by, ownerName, interactionId }) {
  const existing = links.find(
    (l) => l.client_id === client.id && l.trade_account_id === company.id
  );
  if (!existing) {
    return base44.entities.ClientTradeLink.create({
      client_id: client.id,
      client_name: client.name,
      trade_account_id: company.id,
      trade_account_name: company.name,
      stage: stage || "In Discussion",
      owner: ownerName || "",
      contacts: [],
      stage_history: [historyEntry(stage || "In Discussion", { by, interactionId })],
      last_activity_date: today(),
    });
  }
  // The interaction logger becomes owner of previously unowned pairs
  const ownerPatch = !existing.owner && ownerName ? { owner: ownerName } : {};
  if (stage && stage !== existing.stage) {
    const moved = await moveStage(existing, stage, { by, interactionId });
    if (ownerPatch.owner) {
      return base44.entities.ClientTradeLink.update(existing.id, ownerPatch);
    }
    return moved;
  }
  return base44.entities.ClientTradeLink.update(existing.id, {
    last_activity_date: today(),
    ...ownerPatch,
  });
}

export function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}
