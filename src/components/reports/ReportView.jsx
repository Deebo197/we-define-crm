import React, { useRef } from "react";
import { ArrowLeft, Pencil, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/ui/StatusBadge";

const sections = [
  { key: "activity_summary", label: "Activity Summary" },
  { key: "key_interactions", label: "Key Interactions" },
  { key: "market_insights", label: "Market Insights" },
  { key: "client_updates", label: "Client-Specific Updates" },
  { key: "marketing_activity", label: "Marketing Activity" },
  { key: "opportunities", label: "Opportunities" },
  { key: "challenges", label: "Challenges" },
  { key: "actions_next_steps", label: "Actions & Next Steps" },
];

export default function ReportView({ report, onBack, onEdit }) {
  const printRef = useRef(null);

  const handleExport = () => {
    const printWindow = window.open("", "_blank");
    const content = sections
      .filter(s => report[s.key])
      .map(s => `<h2 style="color:#333;margin-top:24px;font-size:16px;">${s.label}</h2><p style="color:#555;line-height:1.8;font-size:14px;">${report[s.key]}</p>`)
      .join("");

    printWindow.document.write(`
      <html>
      <head>
        <title>${report.title}</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .meta { color: #888; font-size: 13px; margin-bottom: 32px; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <div class="meta">${report.client_name} · ${report.month} · ${report.status}</div>
        ${content}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-[#6C6C80] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">{report.title}</h1>
          <p className="text-[#6C6C80] text-sm">{report.client_name} · {report.month}</p>
        </div>
        <StatusBadge status={report.status} />
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-[#A1A1B5] hover:text-white">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExport} className="text-[#A1A1B5] hover:text-white">
          <Download className="w-4 h-4" />
        </Button>
      </div>

      <div ref={printRef} className="space-y-4">
        {sections.map(({ key, label }) => {
          if (!report[key]) return null;
          return (
            <div key={key} className="bg-surface rounded-2xl border border-white/[0.06] p-5">
              <h3 className="text-[#7F5BFF] text-xs font-semibold uppercase tracking-wider mb-3">{label}</h3>
              <p className="text-[#A1A1B5] text-sm leading-relaxed whitespace-pre-wrap">{report[key]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}