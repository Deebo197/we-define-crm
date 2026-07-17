import { escapeHtml, textToParagraphHtml } from "../../lib/html.js";

export const REPORT_SECTIONS = [
  { key: "activity_summary", label: "Activity Summary", required: true },
  { key: "key_interactions", label: "Key Interactions", required: true },
  { key: "market_insights", label: "Market Insights", required: true },
  { key: "client_updates", label: "Client Updates", required: true },
  { key: "marketing_activity", label: "Marketing Activity", required: true },
  { key: "opportunities", label: "Opportunities", required: true },
  { key: "challenges", label: "Challenges", required: false },
  { key: "actions_next_steps", label: "Actions & Next Steps", required: true },
];

export function buildReportPrintHtml(report = {}, version = {}) {
  const status = ["Draft", "Review", "Final"].includes(version.status)
    ? version.status
    : "Draft";
  const sections = REPORT_SECTIONS.filter((section) => version[section.key]);
  const body = sections
    .map(
      (section) => `
    <div class="section">
      <h2>${escapeHtml(section.label)}</h2>
      ${textToParagraphHtml(version[section.key])}
    </div>
  `,
    )
    .join("");

  const reportType = report.is_grouped
    ? "CROSSROADS Report"
    : report.client_name || "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title || "Report")}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 48px 60px; max-width: 860px; margin: 0 auto; }
    header { margin-bottom: 40px; border-bottom: 2px solid #5A3DE6; padding-bottom: 20px; }
    .brand { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #5A3DE6; margin-bottom: 10px; }
    h1 { font-size: 24px; font-weight: 600; color: #0d0d1a; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #888; }
    .status { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
      background: ${status === "Final" ? "#d1fae5" : status === "Review" ? "#fef3c7" : "#f1f5f9"};
      color: ${status === "Final" ? "#065f46" : status === "Review" ? "#92400e" : "#64748b"}; }
    .section { margin-bottom: 32px; }
    h2 { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #5A3DE6; margin-bottom: 10px; }
    p { font-size: 14px; line-height: 1.85; color: #374151; margin-bottom: 10px; }
    footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <header>
    <div class="brand">We Define Travel</div>
    <h1>${escapeHtml(report.title || "Report")}</h1>
    <div class="meta">
      ${escapeHtml(reportType)} · ${escapeHtml(report.month || "")} · Internal version
      <span class="status">${escapeHtml(status)}</span>
    </div>
  </header>
  ${body}
  <footer>
    <span>We Define Travel · Confidential</span>
    <span>Generated ${escapeHtml(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}</span>
  </footer>
</body>
</html>`;
}
