import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Copy, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import {
  eventDays, itemsForDay, timeRange, formatDay, formatDateRange,
  itemAddressLine, buildItineraryText,
} from "./eventUtils";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const paras = (s) =>
  esc(s).trim().split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");

// Client-facing print document — WDT house style, mirrors ReportEditor's
// window.open + print() export. Excludes costs and all internal notes.
export function buildItineraryHtml(event) {
  const days = eventDays(event);
  const body = days.map((date, i) => {
    const items = itemsForDay(event.items, date);
    const rows = items.length === 0
      ? `<div class="item"><div class="time"></div><div class="what"><p class="muted">Free time</p></div></div>`
      : items.map(it => {
          const where = it.company_name || it.venue_name || "";
          const addr = itemAddressLine(it);
          return `
          <div class="item">
            <div class="time">${esc(timeRange(it))}</div>
            <div class="what">
              <div class="kind">${esc(it.kind || "")}</div>
              <h3>${esc(it.title || where || "Untitled")}</h3>
              ${where && it.title ? `<p class="where">${esc(where)}</p>` : ""}
              ${addr ? `<p class="addr">${esc(addr)}</p>` : ""}
              ${it.contact_names?.length ? `<p class="with">With ${esc(it.contact_names.join(", "))}</p>` : ""}
              ${it.notes?.trim() ? `<p class="note">${esc(it.notes.trim())}</p>` : ""}
            </div>
          </div>`;
        }).join("");
    return `
    <section class="day">
      <h2><span class="daynum">Day ${i + 1}</span> ${esc(formatDay(date, "EEEE d MMMM"))}</h2>
      ${rows}
    </section>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(event.title || "Itinerary")}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 48px 60px; max-width: 860px; margin: 0 auto; }
    header { margin-bottom: 36px; border-bottom: 2px solid #5A3DE6; padding-bottom: 22px; }
    .brand { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #5A3DE6; margin-bottom: 12px; }
    h1 { font-size: 26px; font-weight: 600; color: #0d0d1a; margin-bottom: 6px; }
    .meta { font-size: 13px; color: #6b7280; }
    .clients { font-size: 12px; color: #5A3DE6; font-weight: 600; margin-top: 6px; }
    .overview { margin: 28px 0 8px; }
    .overview p { font-size: 14px; line-height: 1.8; color: #374151; margin-bottom: 10px; }
    .day { margin-top: 30px; page-break-inside: avoid; }
    .day h2 { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0d0d1a; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 14px; }
    .daynum { color: #5A3DE6; margin-right: 8px; }
    .item { display: flex; gap: 20px; padding: 10px 0 14px; page-break-inside: avoid; }
    .time { width: 110px; flex-shrink: 0; font-size: 12px; font-weight: 600; color: #5A3DE6; padding-top: 3px; }
    .what { flex: 1; border-left: 2px solid #ece9fb; padding-left: 18px; }
    .kind { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #9ca3af; margin-bottom: 2px; }
    .what h3 { font-size: 15px; font-weight: 600; color: #111827; }
    .where { font-size: 13px; color: #374151; margin-top: 2px; }
    .addr { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .with { font-size: 12px; color: #374151; margin-top: 6px; }
    .note { font-size: 12px; color: #6b7280; margin-top: 6px; line-height: 1.6; }
    .muted { font-size: 13px; color: #9ca3af; font-style: italic; }
    footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print { body { padding: 24px 32px; } }
  </style>
</head>
<body>
  <header>
    <div class="brand">We Define Travel</div>
    <h1>${esc(event.title || "Itinerary")}</h1>
    <div class="meta">${esc(formatDateRange(event.start_date, event.end_date))}</div>
    ${event.client_names?.length ? `<div class="clients">${esc(event.client_names.join(" · "))}</div>` : ""}
  </header>
  ${event.description?.trim() ? `<div class="overview">${paras(event.description)}</div>` : ""}
  ${body}
  <footer>
    <span>We Define Travel</span>
    <span>${esc(event.title || "")}</span>
  </footer>
</body>
</html>`;
}

export default function ItineraryPreview({ event }) {
  const days = eventDays(event);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    w.document.write(buildItineraryHtml(event));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildItineraryText(event));
      toast.success("Itinerary copied as plain text");
    } catch {
      toast.error("Couldn’t copy to clipboard");
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-faint text-xs">Client-facing — costs and internal notes are never included.</p>
        <div className="flex gap-2">
          <button type="button" onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl border border-line bg-surface text-muted hover:text-ink hover:border-line-strong text-xs font-medium transition-all">
            <Copy className="w-3.5 h-3.5" /> Copy as text
          </button>
          <Button type="button" onClick={handlePrint} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-4 h-9 text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* On-screen preview mirrors the printed document */}
      <div className="bg-white rounded-2xl shadow-card border border-line p-6 sm:p-10 max-w-3xl mx-auto">
        <div className="border-b-2 border-primary pb-5 mb-7">
          <p className="text-primary text-[11px] font-bold uppercase tracking-[0.18em] mb-2.5">We Define Travel</p>
          <h2 className="text-2xl font-semibold text-ink">{event.title || "Untitled event"}</h2>
          {event.start_date && <p className="text-muted text-sm mt-1">{formatDateRange(event.start_date, event.end_date)}</p>}
          {event.client_names?.length > 0 && (
            <p className="text-primary text-xs font-semibold mt-1.5">{event.client_names.join(" · ")}</p>
          )}
        </div>

        {event.description?.trim() && (
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line mb-6">{event.description.trim()}</p>
        )}

        {days.length === 0 && (
          <p className="text-faint text-sm italic">Add dates and itinerary items to build the document.</p>
        )}

        {days.map((date, i) => {
          const items = itemsForDay(event.items, date);
          return (
            <section key={date} className="mt-7 first:mt-0">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-ink border-b border-line pb-2 mb-3.5">
                <span className="text-primary mr-2">Day {i + 1}</span>{formatDay(date, "EEEE d MMMM")}
              </h3>
              {items.length === 0 ? (
                <p className="text-faint text-sm italic">Free time</p>
              ) : items.map(it => {
                const where = it.company_name || it.venue_name || "";
                const addr = itemAddressLine(it);
                return (
                  <div key={it.id} className="flex gap-4 sm:gap-5 py-2.5">
                    <div className="w-[92px] shrink-0 text-xs font-semibold text-primary pt-0.5">{timeRange(it)}</div>
                    <div className="flex-1 border-l-2 border-primary/15 pl-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-faint">{it.kind}</p>
                      <p className="text-[15px] font-semibold text-ink">{it.title || where || "Untitled"}</p>
                      {where && it.title && <p className="text-sm text-muted mt-0.5">{where}</p>}
                      {addr && (
                        <p className="text-xs text-faint mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />{addr}
                        </p>
                      )}
                      {it.contact_names?.length > 0 && (
                        <p className="text-xs text-muted mt-1.5 flex items-center gap-1">
                          <Users className="w-3 h-3 shrink-0" />With {it.contact_names.join(", ")}
                        </p>
                      )}
                      {it.notes?.trim() && <p className="text-xs text-faint mt-1.5 leading-relaxed whitespace-pre-line">{it.notes.trim()}</p>}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
