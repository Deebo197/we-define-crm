import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Sparkles } from "lucide-react";
import { suggestInvite } from "./eventUtils";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A5 print export of just the invite. Client-facing, so the masthead is a
// "We Define Travel" wordmark in text plus the event's client names — never
// the Repevo brand.
export function buildInviteHtml(event) {
  const invite = event.invite || {};
  const clients = event.client_names?.length ? event.client_names.join(" · ") : "";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(invite.headline || "Invitation")}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    @page { size: A5; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; background: #fff; }
    .card { width: 148mm; min-height: 210mm; margin: 0 auto; padding: 22mm 18mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .masthead { font-size: 12px; font-weight: 600; letter-spacing: 0.32em; text-transform: uppercase; color: #0d0d1a; }
    .clients { font-size: 9.5px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: #5A3DE6; margin-top: 7mm; }
    .rule { width: 28mm; height: 1.5px; background: #5A3DE6; margin: 9mm auto; }
    .rule.thin { height: 1px; opacity: 0.45; }
    h1 { font-size: 23px; font-weight: 300; letter-spacing: 0.04em; color: #0d0d1a; line-height: 1.35; }
    .intro { font-size: 12px; font-weight: 400; line-height: 1.9; color: #4b5563; max-width: 100mm; margin-top: 8mm; }
    .venue { font-size: 13px; font-weight: 600; color: #0d0d1a; margin-top: 10mm; line-height: 1.7; }
    .date { font-size: 12px; font-weight: 500; color: #5A3DE6; margin-top: 3mm; letter-spacing: 0.06em; }
    .dress { font-size: 10.5px; color: #6b7280; margin-top: 8mm; letter-spacing: 0.08em; }
    .rsvp { font-size: 10.5px; color: #6b7280; margin-top: 2.5mm; letter-spacing: 0.04em; }
    footer { margin-top: auto; padding-top: 10mm; font-size: 8.5px; letter-spacing: 0.24em; text-transform: uppercase; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="masthead">We Define Travel</div>
    ${clients ? `<div class="clients">${esc(clients)}</div>` : ""}
    <div class="rule"></div>
    <h1>${esc(invite.headline || "An Invitation")}</h1>
    ${invite.intro ? `<p class="intro">${esc(invite.intro)}</p>` : ""}
    ${invite.venue_line ? `<p class="venue">${esc(invite.venue_line)}</p>` : ""}
    ${invite.date_line ? `<p class="date">${esc(invite.date_line)}</p>` : ""}
    <div class="rule thin"></div>
    ${invite.dress_code ? `<p class="dress">Dress code · ${esc(invite.dress_code)}</p>` : ""}
    ${invite.rsvp_line ? `<p class="rsvp">${esc(invite.rsvp_line)}</p>` : ""}
    <footer>We Define Travel</footer>
  </div>
</body>
</html>`;
}

const FIELDS = [
  { key: "headline", label: "Headline", placeholder: "An Invitation to Dinner" },
  { key: "intro", label: "Intro", placeholder: "We Define Travel, together with…", textarea: true },
  { key: "venue_line", label: "Venue line", placeholder: "The Ivy, 1-5 West Street, London, WC2H 9NQ" },
  { key: "date_line", label: "Date line", placeholder: "Thursday 17 September 2026 · from 19:00" },
  { key: "dress_code", label: "Dress code", placeholder: "Smart casual" },
  { key: "rsvp_line", label: "RSVP line", placeholder: "Kindly RSVP to…" },
];

export default function InviteEditor({ event, onChange }) {
  const invite = event.invite || {};

  const set = (key, value) => onChange({ ...invite, [key]: value });

  const handleSuggest = () => {
    const suggested = suggestInvite(event);
    // Only fill fields the user hasn't written yet
    const merged = { ...suggested };
    FIELDS.forEach(({ key }) => { if (invite[key]?.trim()) merged[key] = invite[key]; });
    onChange(merged);
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    w.document.write(buildInviteHtml(event));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 animate-fade-in-up">
      {/* Fields */}
      <section className="bg-surface rounded-2xl shadow-card border border-line p-5 space-y-4 self-start">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Invite wording</h2>
          <button type="button" onClick={handleSuggest}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl border border-line bg-canvas text-primary hover:border-primary/40 text-xs font-medium transition-all">
            <Sparkles className="w-3.5 h-3.5" /> Suggest from event
          </button>
        </div>
        {FIELDS.map(({ key, label, placeholder, textarea }) => (
          <div key={key}>
            <Label className="text-muted text-xs mb-1.5">{label}</Label>
            {textarea ? (
              <Textarea value={invite[key] || ""} onChange={(e) => set(key, e.target.value)} className={`${inputClass} min-h-[72px] text-sm`} placeholder={placeholder} />
            ) : (
              <Input value={invite[key] || ""} onChange={(e) => set(key, e.target.value)} className={inputClass} placeholder={placeholder} />
            )}
          </div>
        ))}
        <p className="text-faint text-[11px]">Suggestions are derived from the first dinner or evening item on the itinerary.</p>
      </section>

      {/* A5-style preview */}
      <div className="self-start">
        <div className="flex items-center justify-end mb-3">
          <Button type="button" onClick={handlePrint} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-4 h-9 text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Print / PDF (A5)
          </Button>
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-line px-8 py-12 text-center mx-auto max-w-md" style={{ aspectRatio: "148 / 210" }}>
          <div className="h-full flex flex-col items-center">
            <p className="text-ink text-xs font-semibold uppercase tracking-[0.32em]">We Define Travel</p>
            {event.client_names?.length > 0 && (
              <p className="text-primary text-[10px] font-medium uppercase tracking-[0.18em] mt-5">{event.client_names.join(" · ")}</p>
            )}
            <div className="w-16 h-[1.5px] bg-primary mx-auto my-7" />
            <h3 className="text-xl font-light text-ink leading-snug tracking-wide">{invite.headline || "An Invitation"}</h3>
            {invite.intro && <p className="text-xs text-muted leading-relaxed mt-5 max-w-xs">{invite.intro}</p>}
            {invite.venue_line && <p className="text-sm font-semibold text-ink mt-7 leading-relaxed">{invite.venue_line}</p>}
            {invite.date_line && <p className="text-xs font-medium text-primary tracking-wide mt-2">{invite.date_line}</p>}
            <div className="w-16 h-px bg-primary/45 mx-auto my-6" />
            {invite.dress_code && <p className="text-[11px] text-faint tracking-wide">Dress code · {invite.dress_code}</p>}
            {invite.rsvp_line && <p className="text-[11px] text-faint tracking-wide mt-1.5">{invite.rsvp_line}</p>}
            <p className="text-[9px] text-faint/80 uppercase tracking-[0.24em] mt-auto pt-6">We Define Travel</p>
          </div>
        </div>
      </div>
    </div>
  );
}
