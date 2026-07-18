import { escapeHtml } from "../../lib/html.js";

// Client-facing monthly pack — always "We Define Travel" branding on
// client-facing documents, never the Repevo wordmark.

function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date) ? "" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function buildMonthlyPackHtml({
  clientLabel,
  monthLabel,
  stats,
  activityLines,
  stageCounts,
  movements,
  trainings,
}) {
  const statCards = [
    { label: "Trade interactions", value: stats.interactions },
    { label: "Training sessions", value: stats.trainings },
    { label: "Sellers trained", value: stats.attendees },
    { label: "Operators in pipeline", value: stats.pipelineOperators },
    { label: "Pipeline movements", value: stats.movements },
  ]
    .map(
      (s) => `
      <div class="stat">
        <div class="stat-value">${escapeHtml(String(s.value ?? 0))}</div>
        <div class="stat-label">${escapeHtml(s.label)}</div>
      </div>`
    )
    .join("");

  const stageRow = stageCounts
    .map(
      (s) => `
      <div class="stage">
        <div class="stage-count">${s.count}</div>
        <div class="stage-label">${escapeHtml(s.stage)}</div>
      </div>`
    )
    .join("");

  const movementRows = movements
    .map(
      (m) => `
      <tr>
        <td class="nowrap">${escapeHtml(fmtDate(m.date))}</td>
        <td><strong>${escapeHtml(m.operator)}</strong></td>
        <td>${m.from ? `${escapeHtml(m.from)} <span class="arrow">&rarr;</span> ` : ""}${escapeHtml(m.to)}</td>
      </tr>`
    )
    .join("");

  const trainingRows = trainings
    .map(
      (t) => `
      <tr>
        <td class="nowrap">${escapeHtml(fmtDate(t.date))}</td>
        <td><strong>${escapeHtml(t.company_name || "")}</strong></td>
        <td>${escapeHtml(t.format || "")}</td>
        <td class="num">${t.attendee_count || ""}</td>
        <td>${escapeHtml(t.product_covered || "")}</td>
      </tr>`
    )
    .join("");

  const activityRows = activityLines
    .map(
      (l, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="nowrap">${escapeHtml(fmtDate(l.date))}</td>
        <td>${escapeHtml(l.type || "")}</td>
        <td><strong>${escapeHtml(l.company_name || "")}</strong></td>
        <td>${escapeHtml(l.contact_person || "")}</td>
        <td class="overview">${escapeHtml(l.overview || "").replace(/\n/g, "<br/>")}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>We Define Travel — ${escapeHtml(clientLabel)} — ${escapeHtml(monthLabel)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 44px 52px; max-width: 940px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1F4E79; padding-bottom: 18px; margin-bottom: 28px; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; color: #1F4E79; }
    .brand small { display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #94a3b8; margin-top: 2px; }
    .title { text-align: right; }
    .title h1 { font-size: 17px; font-weight: 600; color: #0d0d1a; }
    .title .meta { font-size: 12px; color: #64748b; margin-top: 2px; }
    .stats { display: flex; gap: 10px; margin-bottom: 30px; }
    .stat { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 10px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #1F4E79; }
    .stat-label { font-size: 10px; color: #64748b; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.06em; }
    h2 { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #1F4E79; margin: 28px 0 10px; }
    .stages { display: flex; gap: 8px; margin-bottom: 6px; }
    .stage { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 6px; text-align: center; }
    .stage-count { font-size: 17px; font-weight: 700; color: #0f172a; }
    .stage-label { font-size: 9px; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    th { background: #1F4E79; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; color: #334155; }
    tr:nth-child(even) td { background: #f8fafc; }
    .num { text-align: right; white-space: nowrap; }
    .nowrap { white-space: nowrap; }
    .overview { line-height: 1.5; }
    .arrow { color: #94a3b8; }
    .empty { font-size: 12px; color: #94a3b8; font-style: italic; padding: 8px 0; }
    footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 10.5px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 24px 28px; }
      .stats, .stages { break-inside: avoid; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">We Define Travel<small>UK &amp; Ireland Representation</small></div>
    <div class="title">
      <h1>${escapeHtml(clientLabel)} — Monthly Activity Pack</h1>
      <div class="meta">${escapeHtml(monthLabel)}</div>
    </div>
  </header>

  <div class="stats">${statCards}</div>

  <h2>Tour Operator Pipeline — Coverage</h2>
  <div class="stages">${stageRow}</div>

  <h2>Pipeline Movements This Month</h2>
  ${
    movements.length
      ? `<table><thead><tr><th>Date</th><th>Operator</th><th>Movement</th></tr></thead><tbody>${movementRows}</tbody></table>`
      : `<p class="empty">No stage movements recorded this month.</p>`
  }

  <h2>Trade Training Delivered</h2>
  ${
    trainings.length
      ? `<table><thead><tr><th>Date</th><th>Company</th><th>Format</th><th>Attendees</th><th>Focus</th></tr></thead><tbody>${trainingRows}</tbody></table>`
      : `<p class="empty">No training sessions this month.</p>`
  }

  <h2>Activity Log</h2>
  ${
    activityLines.length
      ? `<table><thead><tr><th>#</th><th>Date</th><th>Type</th><th>Company / Agency</th><th>Contact</th><th>Overview</th></tr></thead><tbody>${activityRows}</tbody></table>`
      : `<p class="empty">No logged activity this month.</p>`
  }

  <footer>
    <span>We Define Travel · Prepared for ${escapeHtml(clientLabel)}</span>
    <span>Generated ${escapeHtml(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}</span>
  </footer>
</body>
</html>`;
}
