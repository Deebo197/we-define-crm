import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { usePipelineLinks, STAGE_TONES, CLOSED_TONE, CLOSED_STATUSES, daysSince } from "@/api/pipeline";

/**
 * Shows every pipeline entry (ClientTradeLink) where this person is listed
 * as a contact on the pair — i.e. which clients they're driving for their
 * employer, and what stage each journey is at.
 */
export default function ContactPipeline({ contactId }) {
  const { data: links = [], isLoading } = usePipelineLinks();

  const personLinks = useMemo(
    () =>
      links
        .filter((l) => l.contacts?.some((c) => c.person_id === contactId))
        .sort((a, b) => {
          // Open pairs first, then by last_activity_date desc
          const aClosed = !!a.closed_status;
          const bClosed = !!b.closed_status;
          if (aClosed !== bClosed) return aClosed ? 1 : -1;
          return new Date(b.last_activity_date || 0) - new Date(a.last_activity_date || 0);
        }),
    [links, contactId]
  );

  if (isLoading) return null;
  if (personLinks.length === 0) return null;

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-5 mb-5">
      <h2 className="text-faint text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5" /> Pipeline
        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-black/[0.04] text-muted">
          {personLinks.length}
        </span>
      </h2>
      <div className="space-y-2">
        {personLinks.map((link) => {
          const isClosed = !!link.closed_status;
          const tone = isClosed ? CLOSED_TONE : (STAGE_TONES[link.stage] || "bg-canvas text-muted border-line");
          const staleDays = daysSince(link.last_activity_date);
          const personEntry = link.contacts?.find((c) => c.person_id === contactId);
          return (
            <Link
              key={link.id}
              to={`/pipeline`}
              className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line hover:border-primary/30 hover:bg-primary/5 transition-all group block"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-ink text-sm font-medium group-hover:text-primary transition-colors">
                    {link.client_name}
                  </span>
                  <ArrowRight className="w-3 h-3 text-faint shrink-0" />
                  <span className="text-muted text-xs">{link.trade_account_name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {personEntry?.role && (
                    <span className="text-faint text-[10px]">{personEntry.role}</span>
                  )}
                  {link.owner && (
                    <span className="text-faint text-[10px]">· Owner: {link.owner}</span>
                  )}
                  {link.tier_for_client && (
                    <span className="text-faint text-[10px]">· {link.tier_for_client} tier</span>
                  )}
                  {link.last_activity_date && (
                    <span className="text-faint text-[10px]">
                      · Active {format(parseISO(link.last_activity_date), "d MMM yyyy")}
                      {staleDays != null && staleDays > 0 && ` (${staleDays}d ago)`}
                    </span>
                  )}
                </div>
              </div>
              <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border ${tone}`}>
                {isClosed ? link.closed_status : link.stage}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}