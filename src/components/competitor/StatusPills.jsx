import React from "react";
import { TONES } from "@/lib/statusColors";

// Scenario status: draft / in_progress / complete
const SCENARIO_TONES = {
  draft: "neutral",
  in_progress: "warning",
  complete: "success",
};

// Price entry status: pending / entered / verified
const ENTRY_TONES = {
  pending: "neutral",
  entered: "info",
  verified: "success",
};

const PILL_BASE =
  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap capitalize";

export function ScenarioStatusPill({ status }) {
  const tone = TONES[SCENARIO_TONES[status]] || TONES.neutral;
  return (
    <span className={`${PILL_BASE} ${tone.pill}`}>
      {(status || "draft").replace("_", " ")}
    </span>
  );
}

export function EntryStatusPill({ status }) {
  const tone = TONES[ENTRY_TONES[status]] || TONES.neutral;
  return <span className={`${PILL_BASE} ${tone.pill}`}>{status || "pending"}</span>;
}
