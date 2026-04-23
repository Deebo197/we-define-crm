import React from "react";
import { ArrowLeft, Pencil, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/ui/StatusBadge";

const SECTIONS = [
  { key: "activity_summary",   label: "Activity Summary"       },
  { key: "key_interactions",   label: "Key Interactions"       },
  { key: "market_insights",    label: "Market Insights"        },
  { key: "client_updates",     label: "Client Updates"         },
  { key: "marketing_activity", label: "Marketing Activity"     },
  { key: "opportunities",      label: "Opportunities"          },
  { key: "challenges",         label: "Challenges"             },
  { key: "actions_next_steps", label: "Actions & Next Steps"   },
];

function buildPdfHtml(report) {
  const sections = SECTIONS.filter(s => report[s.key]);
  const body = sections.map(s => `
    <div class="section">
      <h2>${s.label}</h2>
      <p>${(report[s.key] || "").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${report.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      color: #1a1a2e;
      background: #fff;
      padding: 48px 60px;
      max-width: 860px;
      margin: 0 auto;
    }
    header { margin-bottom: 40px; border-bottom: 2px solid #7F5BFF; padding-bottom: 20px; }
    .brand { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #7F5BFF; margin-bottom: 10px; }
    h1 { font-size: 24px; font-weight: 600; color: #0d0d1a; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #888; }
    .status { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
      background: ${report.status === "Final" ? "#d1fae5" : report.status === "Review" ? "#fef3c7" : "#f1f5f9"};
      color: ${report.status === "Final" ? "#065f46" : report.status === "Review" ? "#92400e" : "#64748b"}; }
    .section { margin-bottom: 32px; }
    h2 { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #7F5BFF; margin-bottom: 10px; }
    p { font-size: 14px; line-height: 1.85; color: #374151; margin-bottom: 10px; }
    footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <header>
    <div class="brand">We Define Travel</div>
    <h1>${report.title}</h1>
    <div class="meta">
      ${report.is_grouped ? "CROSSROADS Report" : report.client_name} · ${report.month}
      <span class="status">${report.status}</span>
    </div>
  </header>
  ${body}
  <footer>
    <span>We Define Travel · Confidential</span>
    <span>Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
  </footer>
</body>
</html>`;
}

export default function ReportView({ report, onBack, onEdit }) {
  const handleExport = () => {
    const w = window.open("", "_blank");
    w.document.write(buildPdfHtml(report));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const visibleSections = SECTIONS.filter(s => report[s.key]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      {/* Header bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={onBack} className="text-[#6C6C80] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-white truncate">{report.title}</h1>
          <p className="text-[#6C6C80] text-sm">
            {report.is_grouped ? <span className="text-[#FFB547]">CROSSROADS</span> : report.client_name}
            {" · "}{report.month}
          </p>
        </div>
        <StatusBadge status={report.status} />
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-[#A1A1B5] hover:text-white">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExport} className="text-[#A1A1B5] hover:text-white gap-1.5">
          <Download className="w-4 h-4" />
          <span className="text-xs">Export PDF</span>
        </Button>
      </div>

      {/* Sections */}
      {visibleSections.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-8 h-8 text-[#6C6C80] mx-auto mb-3" />
          <p className="text-[#6C6C80] text-sm">No content yet — click Edit to generate or write sections.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleSections.map(({ key, label }) => (
            <div key={key} className="bg-surface rounded-2xl border border-white/[0.06] p-6">
              <h3 className="text-[#7F5BFF] text-[10px] font-bold uppercase tracking-widest mb-4">{label}</h3>
              <div className="space-y-3">
                {(report[key] || "").split("\n\n").filter(Boolean).map((para, i) => (
                  <p key={i} className="text-[#C8C8D8] text-sm leading-[1.85]">{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}