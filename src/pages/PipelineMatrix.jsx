/**
 * Gap Matrix — eligible operators (rows) × clients (columns), each cell
 * coloured by pipeline stage. Doubles as the bulk tagger: pick a stage in
 * paint mode and click cells to apply it; row headers edit partner tier.
 */
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanSquare, Paintbrush, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useCompanies } from "@/api/crm";
import {
  STAGES,
  STAGE_TONES,
  CLOSED_TONE,
  TIERS,
  TIER_TONES,
  isPipelineEligible,
  useClients,
  usePipelineLinks,
  createLink,
  moveStage,
} from "@/api/pipeline";

const TIER_ORDER = { Platinum: 0, Gold: 1, Silver: 2, Bronze: 3 };

const STAGE_ABBREV = {
  Targeted: "Targeted",
  "In Discussion": "Discussing",
  "Featuring Agreed": "Featuring",
  "Rates Agreed": "Rates",
  Contracted: "Contracted",
  Trading: "Trading",
  Dormant: "Dormant",
};

function StageCell({ link, onClick, painting }) {
  const base = "w-full h-8 rounded-lg text-[11px] font-medium border transition-all";
  const clickable = painting ? "cursor-crosshair hover:ring-2 hover:ring-primary/40" : "cursor-pointer hover:border-line-strong";
  if (!link) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${clickable} border-dashed border-line text-faint bg-surface`}>
        —
      </button>
    );
  }
  if (link.closed_status) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${clickable} ${CLOSED_TONE}`}>
        {link.closed_status}
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} ${clickable} ${STAGE_TONES[link.stage] || ""}`}>
      {STAGE_ABBREV[link.stage] || link.stage}
    </button>
  );
}

export default function PipelineMatrix() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clients = [] } = useClients();
  const { data: companies = [] } = useCompanies();
  const { data: links = [] } = usePipelineLinks();

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [destFilter, setDestFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [paintStage, setPaintStage] = useState(null);

  const activeClients = useMemo(() => clients.filter((c) => !c.is_internal), [clients]);

  const linkByPair = useMemo(() => {
    const m = {};
    for (const l of links) m[`${l.trade_account_id}|${l.client_id}`] = l;
    return m;
  }, [links]);

  const destinations = useMemo(() => {
    const s = new Set();
    for (const c of companies) for (const d of c.destinations || []) s.add(d.destination);
    return [...s].sort();
  }, [companies]);

  const rows = useMemo(() => {
    let list = companies.filter(isPipelineEligible);
    if (search) list = list.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()));
    if (tierFilter !== "all") list = list.filter((c) => c.tier === tierFilter);
    if (destFilter !== "all") {
      list = list.filter((c) => (c.destinations || []).some((d) => d.destination === destFilter));
    }
    if (activityFilter === "with") {
      list = list.filter((c) => activeClients.some((cl) => linkByPair[`${c.id}|${cl.id}`]));
    } else if (activityFilter === "gaps") {
      // At least one client trading/contracted AND at least one client untouched
      list = list.filter((c) => {
        const states = activeClients.map((cl) => linkByPair[`${c.id}|${cl.id}`]);
        const hasLive = states.some((l) => l && !l.closed_status && ["Contracted", "Trading"].includes(l.stage));
        const hasGap = states.some((l) => !l);
        return hasLive && hasGap;
      });
    }
    return list.sort((a, b) => {
      const t = (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9);
      return t !== 0 ? t : (a.name || "").localeCompare(b.name || "");
    });
  }, [companies, search, tierFilter, destFilter, activityFilter, activeClients, linkByPair]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["client-trade-links"] });

  const cellMutation = useMutation({
    mutationFn: async ({ company, client, stage }) => {
      const existing = linkByPair[`${company.id}|${client.id}`];
      if (existing) return moveStage(existing, stage, { by: user?.email });
      return createLink({ client, company, stage, by: user?.email });
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message || "Failed to update"),
  });

  const tierMutation = useMutation({
    mutationFn: ({ company, tier }) => base44.entities.TradeAccount.update(company.id, { tier }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trade-accounts"] }),
    onError: (e) => toast.error(e.message || "Failed to set tier"),
  });

  const [quickCell, setQuickCell] = useState(null); // { company, client }

  const onCellClick = (company, client) => {
    if (paintStage) {
      cellMutation.mutate({ company, client, stage: paintStage });
    } else {
      setQuickCell({ company, client });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Gap Matrix</h1>
        <span className="text-sm text-faint">{rows.length} operators</span>
        <Button variant="outline" size="sm" asChild className="ml-auto">
          <Link to="/pipeline" className="gap-1.5">
            <KanbanSquare className="w-4 h-4" /> Pipeline board
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search operators…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={destFilter} onValueChange={setDestFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All destinations</SelectItem>
            {destinations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={activityFilter} onValueChange={setActivityFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All operators</SelectItem>
            <SelectItem value="with">With pipeline activity</SelectItem>
            <SelectItem value="gaps">Cross-sell gaps</SelectItem>
          </SelectContent>
        </Select>

        {/* Paint mode: pick a stage, then click cells to apply it */}
        <div className="flex items-center gap-1.5 ml-auto">
          <Paintbrush className="w-4 h-4 text-faint" />
          <Select value={paintStage || "off"} onValueChange={(v) => setPaintStage(v === "off" ? null : v)}>
            <SelectTrigger className={`w-44 ${paintStage ? "border-primary text-primary" : ""}`}>
              <SelectValue placeholder="Bulk tag: off" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Bulk tag: off</SelectItem>
              {STAGES.map((s) => <SelectItem key={s} value={s}>Paint “{s}”</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {paintStage && (
        <p className="text-xs text-primary bg-primary-soft rounded-lg px-3 py-2">
          Bulk tagging on — every cell you click is set to “{paintStage}”. Switch back to “Bulk tag: off” when done.
        </p>
      )}

      <div className="bg-surface rounded-2xl border border-line overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/5">
              <th className="text-left px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider sticky left-0 bg-surface min-w-[220px]">
                Operator
              </th>
              {activeClients.map((c) => (
                <th key={c.id} className="px-2 py-2 font-semibold text-muted text-xs whitespace-nowrap min-w-[110px]">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((company) => (
              <tr key={company.id} className="border-t border-line">
                <td className="px-3 py-1.5 sticky left-0 bg-surface">
                  <div className="flex items-center gap-2">
                    <Link to={`/trade-accounts/${company.id}`} className="text-ink font-medium truncate hover:text-primary max-w-[140px]">
                      {company.name}
                    </Link>
                    <Select
                      value={company.tier || "none"}
                      onValueChange={(t) => tierMutation.mutate({ company, tier: t === "none" ? null : t })}
                    >
                      <SelectTrigger className={`h-6 w-[86px] text-[10px] px-1.5 rounded-full border ${company.tier ? TIER_TONES[company.tier] : "text-faint border-dashed"}`}>
                        <SelectValue placeholder="tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No tier</SelectItem>
                        {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </td>
                {activeClients.map((client) => (
                  <td key={client.id} className="px-1.5 py-1.5">
                    <StageCell
                      link={linkByPair[`${company.id}|${client.id}`]}
                      painting={!!paintStage}
                      onClick={() => onCellClick(company, client)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="py-12 text-center text-muted text-sm">
            No eligible operators — tour operators and bonded agencies appear here
          </div>
        )}
      </div>

      {/* Quick stage picker for a single cell */}
      {quickCell && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center px-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setQuickCell(null); }}
        >
          <div className="bg-surface rounded-2xl border border-line shadow-2xl p-4 w-full max-w-xs space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">
                {quickCell.company.name} × {quickCell.client.name}
              </p>
              <button type="button" onClick={() => setQuickCell(null)} className="text-faint hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`h-9 rounded-lg text-xs font-medium border ${STAGE_TONES[s]} hover:ring-2 hover:ring-primary/30`}
                  onClick={() => {
                    cellMutation.mutate({ company: quickCell.company, client: quickCell.client, stage: s });
                    setQuickCell(null);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
