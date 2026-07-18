/**
 * Company activity timeline — one merged, chronological view of everything
 * that happened with this company: interactions, pipeline stage movements,
 * training sessions and events. The five minutes before a call, one screen.
 */
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { History, KanbanSquare, GraduationCap, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAllInteractions } from "@/api/crm";
import { usePipelineLinks, STAGE_TONES } from "@/api/pipeline";
import { useTrainings } from "@/api/trainings";

const INTERACTION_ICONS = {
  "Meeting (In-Person)": "🤝",
  "Meeting (Virtual)": "💻",
  "Call": "📞",
  "Email": "✉️",
  "Event": "🎉",
  "FAM Feedback": "✈️",
  "Marketing Discussion": "📊",
};

const SHOW_STEP = 15;

export default function CompanyTimeline({ account }) {
  const { data: interactions = [] } = useAllInteractions();
  const { data: links = [] } = usePipelineLinks();
  const { data: trainings = [] } = useTrainings();
  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-start_date", 200),
    staleTime: 5 * 60 * 1000,
  });
  const [showCount, setShowCount] = useState(SHOW_STEP);

  const entries = useMemo(() => {
    const out = [];

    interactions
      .filter((i) => i.company_id === account.id || (i.company_type === "TradeAccount" && i.company_name === account.name))
      .forEach((i) => {
        out.push({
          kind: "interaction",
          date: i.date,
          key: `i-${i.id}`,
          emoji: INTERACTION_ICONS[i.type] || "💬",
          title: i.title,
          detail: [i.type, i.contact_names?.join(", ")].filter(Boolean).join(" · "),
          to: `/interactions/${i.id}`,
        });
      });

    links
      .filter((l) => l.trade_account_id === account.id)
      .forEach((l) => {
        (l.stage_history || []).forEach((h, idx) => {
          out.push({
            kind: "pipeline",
            date: (h.date || "").slice(0, 10),
            key: `p-${l.id}-${idx}`,
            title: idx === 0 ? `Added to ${l.client_name}'s pipeline` : `${l.client_name}: moved to ${h.stage}`,
            stage: h.stage,
            detail: h.note || "",
            to: h.interaction_id ? `/interactions/${h.interaction_id}` : "/pipeline",
          });
        });
      });

    trainings
      .filter((t) => t.company_id === account.id || t.company_name === account.name)
      .forEach((t) => {
        out.push({
          kind: "training",
          date: t.date,
          key: `t-${t.id}`,
          title: `Training — ${[t.product_covered, t.client_names?.join(", ")].filter(Boolean).join(" · ") || t.format}`,
          detail: [t.format, t.attendee_count ? `${t.attendee_count} attendees` : "", t.delivered_by ? `by ${t.delivered_by}` : ""].filter(Boolean).join(" · "),
          to: "/trainings",
        });
      });

    events
      .filter((e) => e.company_id === account.id)
      .forEach((e) => {
        out.push({
          kind: "event",
          date: e.start_date,
          key: `e-${e.id}`,
          title: e.title || "Event",
          detail: e.end_date && e.end_date !== e.start_date ? `until ${format(parseISO(e.end_date), "d MMM")}` : "",
          to: `/events/${e.id}`,
        });
      });

    return out
      .filter((e) => e.date)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [interactions, links, trainings, events, account.id, account.name]);

  if (entries.length === 0) return null;

  const iconFor = (e) => {
    if (e.kind === "interaction") return <span className="text-base">{e.emoji}</span>;
    if (e.kind === "pipeline") return <KanbanSquare className="w-4 h-4 text-primary" />;
    if (e.kind === "training") return <GraduationCap className="w-4 h-4 text-success" />;
    return <CalendarDays className="w-4 h-4 text-warning" />;
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-faint" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
          Activity Timeline ({entries.length})
        </h2>
      </div>
      <div className="space-y-1.5">
        {entries.slice(0, showCount).map((e) => (
          <Link
            key={e.key}
            to={e.to}
            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-canvas border border-transparent hover:border-line transition-all group"
          >
            <span className="w-5 flex justify-center mt-0.5 flex-shrink-0">{iconFor(e)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-ink font-medium truncate group-hover:text-primary transition-colors">{e.title}</p>
                {e.kind === "pipeline" && e.stage && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${STAGE_TONES[e.stage] || ""}`}>
                    {e.stage}
                  </span>
                )}
              </div>
              {e.detail && <p className="text-xs text-faint truncate mt-0.5">{e.detail}</p>}
            </div>
            <span className="text-faint text-xs shrink-0 mt-0.5">
              {format(parseISO(e.date), "d MMM yyyy")}
            </span>
          </Link>
        ))}
      </div>
      {entries.length > showCount && (
        <button
          type="button"
          onClick={() => setShowCount((c) => c + SHOW_STEP)}
          className="mt-3 text-xs text-primary hover:underline"
        >
          Show {Math.min(SHOW_STEP, entries.length - showCount)} more
        </button>
      )}
    </div>
  );
}
