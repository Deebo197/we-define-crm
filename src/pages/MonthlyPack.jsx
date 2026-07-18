/**
 * Monthly Pack — one-click month-end pack per client. Composes the month's
 * trade activity, pipeline coverage & movements and training sessions from
 * live CRM data, then exports either:
 *  - the CLASSIC house-format activity Excel some clients require, or
 *  - the NEW print/PDF pack (activity + pipeline + training in one document).
 */
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Printer, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { useClients, usePipelineLinks, STAGES, STAGE_TONES } from "@/api/pipeline";
import { useTrainings } from "@/api/trainings";
import {
  isCrossroads,
  relevantMonthInteractions,
  mergeActivityLines,
} from "@/components/reports/reportUtils";
import { exportActivityExcel } from "@/components/reports/exportActivityExcel";
import { buildMonthlyPackHtml } from "@/components/reports/packHtml";

const CROSSROADS = "__crossroads__";

function defaultMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1); // month-end packs are usually for last month
  return d.toISOString().slice(0, 7);
}

function monthLabel(monthKey) {
  const d = new Date(`${monthKey}-01`);
  return isNaN(d) ? monthKey : d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export default function MonthlyPack() {
  const { data: clients = [] } = useClients();
  const { data: links = [] } = usePipelineLinks();
  const { data: trainings = [] } = useTrainings();
  const { data: interactions = [] } = useQuery({
    queryKey: ["interactions", "pack"],
    queryFn: () => base44.entities.Interaction.list("-date", 2000),
    staleTime: 60 * 1000,
  });

  const activeClients = useMemo(() => clients.filter((c) => !c.is_internal), [clients]);
  const [clientSel, setClientSel] = useState("");
  const [month, setMonth] = useState(defaultMonth());

  const selection = useMemo(() => {
    if (clientSel === CROSSROADS) {
      const cs = activeClients.filter((c) => isCrossroads(c.name));
      return { clientIds: cs.map((c) => c.id), label: "CROSSROADS (Hard Rock + SAii)", isGrouped: true, clientName: "CROSSROADS" };
    }
    const c = activeClients.find((x) => x.id === clientSel);
    return c
      ? { clientIds: [c.id], label: c.name, isGrouped: false, clientName: c.name }
      : { clientIds: [], label: "", isGrouped: false, clientName: "" };
  }, [clientSel, activeClients]);

  const pack = useMemo(() => {
    if (!selection.clientIds.length || !month) return null;
    const { clientIds } = selection;

    const monthInteractions = relevantMonthInteractions(interactions, clientIds, month);
    const activityLines = mergeActivityLines([], monthInteractions, clientIds);

    const clientLinks = links.filter((l) => clientIds.includes(l.client_id));
    const openLinks = clientLinks.filter((l) => !l.closed_status);
    const stageCounts = STAGES.map((stage) => ({
      stage,
      count: openLinks.filter((l) => l.stage === stage).length,
    }));

    // Stage movements this month, derived from each pair's history trail
    const movements = [];
    for (const l of clientLinks) {
      const history = l.stage_history || [];
      history.forEach((h, idx) => {
        if (!(h.date || "").startsWith(month)) return;
        movements.push({
          date: h.date,
          operator: l.trade_account_name,
          from: idx > 0 ? history[idx - 1].stage : null,
          to: idx === 0 ? `Added to pipeline — ${h.stage}` : h.stage,
        });
      });
    }
    movements.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const monthTrainings = trainings.filter(
      (t) => (t.date || "").startsWith(month) && (t.client_ids || []).some((id) => clientIds.includes(id))
    );

    return {
      activityLines,
      stageCounts,
      movements,
      trainings: monthTrainings,
      stats: {
        interactions: monthInteractions.length,
        trainings: monthTrainings.length,
        attendees: monthTrainings.reduce((s, t) => s + (t.attendee_count || 0), 0),
        pipelineOperators: openLinks.length,
        movements: movements.length,
      },
    };
  }, [selection, month, interactions, links, trainings]);

  const exportClassic = async () => {
    try {
      await exportActivityExcel(
        {
          activity_lines: pack.activityLines,
          client_name: selection.clientName,
          month,
          is_grouped: selection.isGrouped,
        },
        null
      );
    } catch (e) {
      toast.error(e.message || "Excel export failed");
    }
  };

  const printPack = () => {
    const html = buildMonthlyPackHtml({
      clientLabel: selection.label,
      monthLabel: monthLabel(month),
      stats: pack.stats,
      activityLines: pack.activityLines,
      stageCounts: pack.stageCounts,
      movements: pack.movements,
      trainings: pack.trainings,
    });
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Pop-up blocked — allow pop-ups for this site to print the pack");
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Monthly Pack</h1>
        <span className="text-sm text-faint">one-click month-end client pack</span>
      </div>

      <div className="bg-surface rounded-2xl border border-line shadow-card p-5 flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs text-muted mb-1.5">Client</p>
          <Select value={clientSel} onValueChange={setClientSel}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Choose a client…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={CROSSROADS}>CROSSROADS (Hard Rock + SAii)</SelectItem>
              {activeClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-muted mb-1.5">Month</p>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
        </div>
        {pack && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={exportClassic}>
              <FileSpreadsheet className="w-4 h-4" /> Classic Excel (house format)
            </Button>
            <Button className="gap-1.5" onClick={printPack}>
              <Printer className="w-4 h-4" /> Print / PDF pack
            </Button>
          </div>
        )}
      </div>

      {!pack ? (
        <div className="py-16 text-center border border-dashed border-line rounded-2xl">
          <PackageOpen className="w-6 h-6 text-faint mx-auto mb-2" />
          <p className="text-muted text-sm">Pick a client and month to compose the pack</p>
          <p className="text-faint text-xs mt-1">
            Activity, pipeline coverage &amp; movements and training sessions are pulled straight from the CRM
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Interactions", value: pack.stats.interactions },
              { label: "Trainings", value: pack.stats.trainings },
              { label: "Sellers trained", value: pack.stats.attendees },
              { label: "Operators in pipeline", value: pack.stats.pipelineOperators },
              { label: "Movements", value: pack.stats.movements },
            ].map((s) => (
              <div key={s.label} className="bg-surface rounded-2xl border border-line shadow-card p-4 text-center">
                <p className="text-2xl font-semibold text-ink tabular-nums">{s.value}</p>
                <p className="text-xs text-faint mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pipeline coverage + movements */}
          <div className="bg-surface rounded-2xl border border-line shadow-card p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-3">Pipeline coverage</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {pack.stageCounts.map((s) => (
                <span key={s.stage} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STAGE_TONES[s.stage] || ""}`}>
                  {s.stage}: {s.count}
                </span>
              ))}
            </div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-2">Movements in {monthLabel(month)}</h2>
            {pack.movements.length === 0 ? (
              <p className="text-sm text-faint">No stage movements this month</p>
            ) : (
              <div className="space-y-1.5">
                {pack.movements.map((m, i) => (
                  <p key={i} className="text-sm text-ink">
                    <span className="text-faint text-xs mr-2">{new Date(m.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                    <span className="font-medium">{m.operator}</span>
                    <span className="text-muted"> — {m.from ? `${m.from} → ${m.to}` : m.to}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Activity preview */}
          <div className="bg-surface rounded-2xl border border-line shadow-card p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-3">
              Activity log — {pack.activityLines.length} line{pack.activityLines.length !== 1 ? "s" : ""}
            </h2>
            {pack.activityLines.length === 0 ? (
              <p className="text-sm text-faint">No logged interactions for this client in {monthLabel(month)}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-faint uppercase tracking-wider">
                      <th className="py-1.5 pr-3">Date</th>
                      <th className="py-1.5 pr-3">Type</th>
                      <th className="py-1.5 pr-3">Company</th>
                      <th className="py-1.5 pr-3">Contact</th>
                      <th className="py-1.5">Overview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pack.activityLines.map((l, i) => (
                      <tr key={i} className="border-t border-line align-top">
                        <td className="py-2 pr-3 whitespace-nowrap text-muted">{new Date(l.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                        <td className="py-2 pr-3 text-muted">{l.type}</td>
                        <td className="py-2 pr-3 font-medium text-ink">{l.company_name}</td>
                        <td className="py-2 pr-3 text-muted">{l.contact_person}</td>
                        <td className="py-2 text-muted max-w-md">{(l.overview || "").slice(0, 220)}{(l.overview || "").length > 220 ? "…" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trainings */}
          <div className="bg-surface rounded-2xl border border-line shadow-card p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-3">
              Trade training — {pack.trainings.length} session{pack.trainings.length !== 1 ? "s" : ""}
            </h2>
            {pack.trainings.length === 0 ? (
              <p className="text-sm text-faint">No training sessions logged for this client in {monthLabel(month)}</p>
            ) : (
              <div className="space-y-1.5">
                {pack.trainings.map((t) => (
                  <p key={t.id} className="text-sm text-ink">
                    <span className="text-faint text-xs mr-2">{new Date(t.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                    <span className="font-medium">{t.company_name}</span>
                    <span className="text-muted"> — {[t.format, t.attendee_count ? `${t.attendee_count} attendees` : "", t.product_covered].filter(Boolean).join(" · ")}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
