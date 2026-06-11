// Shared helpers for the Report backbone + version model.

export const CROSSROADS_NAMES = ["hard rock", "saii lagoon", "saii"];

export function isCrossroads(name) {
  const n = (name || "").toLowerCase();
  return CROSSROADS_NAMES.some(k => n.includes(k));
}

// Interaction type → activity-log "Type of Call" mapping
export function mapInteractionType(type) {
  switch (type) {
    case "Call": return "Telephone";
    case "Meeting (In-Person)":
    case "Meeting (Virtual)": return "Meeting";
    case "Email": return "Email";
    case "Event": return "Event";
    default: return type || "";
  }
}

// An interaction is relevant to the report if it's linked to one of the
// report's clients, or has a note block explicitly assigned to one of them.
export function isInteractionRelevant(interaction, clientIds) {
  return clientIds.some(cid =>
    interaction.linked_clients?.includes(cid) ||
    interaction.notes?.some(n => n.assigned_clients?.includes(cid))
  );
}

// Text for the Overview column: note blocks that are unassigned (general)
// or assigned to one of the report's clients, joined with blank lines.
export function interactionOverviewText(interaction, clientIds) {
  return (interaction.notes || [])
    .filter(n => !n.assigned_clients?.length || n.assigned_clients.some(cid => clientIds.includes(cid)))
    .map(n => n.text)
    .filter(Boolean)
    .join("\n\n");
}

// Interactions in the report month that are relevant to the report clients
export function relevantMonthInteractions(interactions, clientIds, month) {
  return interactions.filter(i =>
    (i.date || "").startsWith(month) && isInteractionRelevant(i, clientIds)
  );
}

// Build activity lines from interactions, preserving existing (possibly
// hand-edited) lines — only adds lines for interactions not already present.
export function mergeActivityLines(existingLines, monthInteractions, clientIds) {
  const existing = existingLines || [];
  const existingIds = new Set(existing.map(l => l.interaction_id).filter(Boolean));
  const added = monthInteractions
    .filter(i => !existingIds.has(i.id))
    .map(i => ({
      interaction_id: i.id,
      date: i.date || "",
      type: mapInteractionType(i.type),
      company_name: i.company_name || "",
      contact_person: i.contact_names?.join(", ") || "",
      overview: interactionOverviewText(i, clientIds),
      follow_update: "",
    }));
  return [...existing, ...added].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

// Does a campaign count as "active" for the report month?
function campaignActiveInMonth(campaign, month) {
  if (campaign.status === "Active") return true;
  if (campaign.status === "Cancelled") return false;
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;
  if (campaign.start_date) {
    return campaign.start_date <= monthEnd && (!campaign.end_date || campaign.end_date >= monthStart);
  }
  return false;
}

// Compute the 8-metric backbone for the report month. Defensive: missing data → 0.
export function computeMetrics({ monthInteractions, actions, campaigns, coverageEntries, clientIds, month }) {
  const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

  const clientActions = (actions || []).filter(a => a.linked_client && clientIds.includes(a.linked_client));
  const actionsRaised = clientActions.filter(a => (a.created_date || "").startsWith(month)).length;
  const actionsClosed = clientActions.filter(a =>
    a.status === "Completed" && (a.updated_date || "").startsWith(month)
  ).length;

  const clientCampaigns = (campaigns || []).filter(c =>
    clientIds.some(cid => c.linked_clients?.includes(cid))
  );
  const activeCampaigns = clientCampaigns.filter(c => campaignActiveInMonth(c, month));
  const campaignSpend = activeCampaigns.reduce((sum, c) => sum + num(c.budget), 0);

  const campaignIds = new Set(clientCampaigns.map(c => c.id));
  const monthCoverage = (coverageEntries || []).filter(e =>
    campaignIds.has(e.campaign_id) && (e.date || "").startsWith(month)
  );

  return {
    interaction_count: (monthInteractions || []).length,
    actions_raised: actionsRaised,
    actions_closed: actionsClosed,
    campaigns_active: activeCampaigns.length,
    campaign_spend: campaignSpend,
    coverage_entries: monthCoverage.length,
    coverage_value: monthCoverage.reduce((sum, e) => sum + num(e.estimated_value), 0),
    coverage_reach: monthCoverage.reduce((sum, e) => sum + num(e.estimated_reach), 0),
  };
}

// Gather an interaction's note texts by type, for blocks unassigned or
// assigned to one of the given clients (used for LLM narrative drafting).
export function extractClientNotes(interaction, clientIds) {
  const out = { general: [], client: [], action: [] };
  (interaction.notes || []).forEach(n => {
    if (!n.assigned_clients?.length || n.assigned_clients.some(cid => clientIds.includes(cid))) {
      out[n.type]?.push(n.text);
    }
  });
  return out;
}

export const DESTINATIONS = ["Maldives", "Mauritius", "UAE", "Qatar", "Seychelles", "Sri Lanka", "Thailand"];

// Infer the obvious destination(s) for a report's client(s) from their names.
export function inferDestinations(clientNames) {
  const text = (clientNames || []).filter(Boolean).join(" ").toLowerCase();
  const hits = [];
  if (text.includes("maldives") || text.includes("hard rock") || text.includes("saii") || text.includes("so/")) hits.push("Maldives");
  if (text.includes("mauritius") || text.includes("sands")) hits.push("Mauritius");
  if (text.includes("uae") || text.includes("dubai") || text.includes("abu dhabi")) hits.push("UAE");
  if (text.includes("qatar") || text.includes("doha")) hits.push("Qatar");
  if (text.includes("seychelles")) hits.push("Seychelles");
  if (text.includes("sri lanka")) hits.push("Sri Lanka");
  if (text.includes("thailand") || text.includes("phuket") || text.includes("samui")) hits.push("Thailand");
  return hits.length ? hits : ["Maldives"];
}
