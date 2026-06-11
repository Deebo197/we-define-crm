// ─── Repevo status colour system — single source of truth ───────────────────
// Every status / priority / relationship-strength / report-status colour in the
// app comes from this map. Pill treatment: soft tint background (status colour
// at ~14% opacity) with a darkened full-strength text colour for contrast.

// Full-strength hex values (mirror tailwind.config.js tokens)
export const STATUS_HEX = {
  success: "#00C875",
  warning: "#FDAB3D",
  info: "#579BFC",
  danger: "#E2445C",
  growing: "#9CD326",
  neutral: "#C4C7D4",
  primary: "#5A3DE6",
};

// Tone → utility classes. `pill` = chip treatment, `dot` = solid indicator,
// `text` = plain coloured text/icon.
export const TONES = {
  success: { pill: "bg-success/[0.14] text-[#00804C]", dot: "bg-success", text: "text-success" },
  warning: { pill: "bg-warning/[0.18] text-[#B26B00]", dot: "bg-warning", text: "text-warning" },
  info: { pill: "bg-info/[0.14] text-[#2070E0]", dot: "bg-info", text: "text-info" },
  danger: { pill: "bg-danger/[0.14] text-[#C22E47]", dot: "bg-danger", text: "text-danger" },
  growing: { pill: "bg-growing/[0.18] text-[#5F840D]", dot: "bg-growing", text: "text-growing" },
  neutral: { pill: "bg-neutral/[0.28] text-[#5C6070]", dot: "bg-neutral", text: "text-faint" },
  primary: { pill: "bg-primary-soft text-primary", dot: "bg-primary", text: "text-primary" },
};

// Label → tone key
export const STATUS_TONE = {
  // Action status
  "To Do": "neutral",
  "In Progress": "warning",
  Completed: "success",
  Waiting: "info",
  "Waiting on Partner": "info",
  "Waiting on Client": "info",
  Cancelled: "danger",
  // Priority
  Low: "info",
  Medium: "warning",
  High: "warning",
  Urgent: "danger",
  // Relationship strength
  Strong: "success",
  Growing: "growing",
  New: "info",
  "At Risk": "warning",
  Dormant: "neutral",
  // Report / version status
  Draft: "neutral",
  Review: "warning",
  Final: "success",
  // Client / campaign lifecycle
  Active: "success",
  Onboarding: "warning",
  Paused: "neutral",
  Ended: "danger",
  Planning: "warning",
};

export function toneFor(status) {
  return TONES[STATUS_TONE[status]] || TONES.neutral;
}

export function toneHexFor(status) {
  return STATUS_HEX[STATUS_TONE[status]] || STATUS_HEX.neutral;
}

export function statusPillClasses(status) {
  return `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${toneFor(status).pill}`;
}
