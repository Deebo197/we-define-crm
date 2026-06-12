import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Crosshair, Copy, Download, X, Network } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useCompanies, usePeople, useRoleSeats, useGroupLinks, useReferenceList,
} from "@/api/crm";
import {
  effectiveDestinations, effectiveSector, effectiveSpecialisms, patchLabel,
  expandThroughGroupLinks,
} from "@/lib/targeting";
import { currentSeatFor } from "@/api/seats";

function ChipGroup({ label, options, selected, onToggle, extra }) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-1.5">
        <p className="text-faint text-[10px] font-bold uppercase tracking-widest">{label}</p>
        {extra}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selected.includes(opt)
                ? "bg-primary text-white border-transparent shadow-lg shadow-primary/20"
                : "bg-canvas text-faint border-line hover:border-line-strong hover:text-ink"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

const toggleIn = (list, value) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export default function Targeting() {
  const [searchParams, setSearchParams] = useSearchParams();
  const groupCompanyId = searchParams.get("group") || "";

  const { data: companies = [], isLoading: loadingCompanies } = useCompanies();
  const { data: people = [], isLoading: loadingPeople } = usePeople();
  const { data: seats = [] } = useRoleSeats();
  const { data: groupLinks = [] } = useGroupLinks();
  const { values: destinationOptions } = useReferenceList("destination");
  const { values: sectorOptions } = useReferenceList("sector");
  const { values: specialismOptions } = useReferenceList("specialism");
  const { values: subTypeOptions } = useReferenceList("company_subtype");

  const [destinations, setDestinations] = useState([]);
  const [coreOnly, setCoreOnly] = useState(false);
  const [sectors, setSectors] = useState([]);
  const [specialisms, setSpecialisms] = useState([]);
  const [subTypes, setSubTypes] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [includeGroup, setIncludeGroup] = useState(true);

  const tierOptions = useMemo(
    () => [...new Set(companies.map((c) => c.tier).filter(Boolean))].sort(),
    [companies]
  );

  const companiesById = useMemo(
    () => new Map(companies.map((c) => [c.id, c])),
    [companies]
  );

  const hasCompanyFilters = subTypes.length > 0 || tiers.length > 0 || !!groupCompanyId;
  const isLoading = loadingCompanies || loadingPeople;

  // Companies matching the company-level filters, optionally expanded through
  // Ownership links in both directions (multi-level).
  const matchedCompanyIds = useMemo(() => {
    let ids = companies
      .filter(
        (c) =>
          (subTypes.length === 0 || subTypes.includes(c.type)) &&
          (tiers.length === 0 || tiers.includes(c.tier))
      )
      .map((c) => c.id);
    let idSet = new Set(ids);
    if (includeGroup && (subTypes.length > 0 || tiers.length > 0)) {
      idSet = expandThroughGroupLinks(idSet, groupLinks, { kinds: ["Ownership"] });
    }
    // Pre-filter to a specific group (from a company-home "People across group" link)
    if (groupCompanyId) {
      const groupSet = expandThroughGroupLinks([groupCompanyId], groupLinks);
      idSet = new Set([...idSet].filter((id) => groupSet.has(id)));
    }
    return idSet;
  }, [companies, subTypes, tiers, includeGroup, groupLinks, groupCompanyId]);

  // THE PEOPLE: everyone whose effective values match.
  const results = useMemo(() => {
    return people
      .filter((p) => {
        // Company scope: only applied when a company-level filter is active —
        // otherwise people without a company can still match via overrides.
        if (hasCompanyFilters && !(p.company_id && matchedCompanyIds.has(p.company_id))) return false;

        const company = companiesById.get(p.company_id) || null;

        if (destinations.length > 0) {
          const dests = effectiveDestinations(p, company);
          const hit = dests.some(
            (d) =>
              destinations.includes(d.destination) &&
              (!coreOnly || d.strength === "Core")
          );
          if (!hit) return false;
        }
        if (sectors.length > 0 && !sectors.includes(effectiveSector(p, company))) return false;
        if (specialisms.length > 0) {
          const specs = effectiveSpecialisms(p, company);
          if (!specs.some((s) => specialisms.includes(s))) return false;
        }
        return true;
      })
      .map((p) => {
        const company = companiesById.get(p.company_id) || null;
        return {
          person: p,
          company,
          seatTitle: currentSeatFor(p.id, seats)?.title || p.role || "",
          patch: patchLabel(effectiveDestinations(p, company)),
        };
      })
      .sort((a, b) => (a.person.name || "").localeCompare(b.person.name || ""));
  }, [people, hasCompanyFilters, matchedCompanyIds, companiesById, destinations, coreOnly, sectors, specialisms, seats]);

  const groupCompany = groupCompanyId ? companiesById.get(groupCompanyId) : null;
  const filtersActive =
    destinations.length || sectors.length || specialisms.length || subTypes.length || tiers.length || groupCompanyId;

  const copyEmails = async () => {
    const emails = [...new Set(results.map((r) => r.person.email).filter(Boolean))];
    if (emails.length === 0) {
      toast.error("No email addresses in the current results");
      return;
    }
    try {
      await navigator.clipboard.writeText(emails.join("; "));
      toast.success(`${emails.length} email${emails.length === 1 ? "" : "s"} copied`);
    } catch {
      toast.error("Couldn’t copy to clipboard");
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Company", "Seat Title", "Patch", "Location Type", "Email", "Phone", "Mobile"];
    const rows = results.map((r) => [
      r.person.name ?? "",
      r.company?.name ?? r.person.company_name ?? "",
      r.seatTitle,
      r.patch,
      r.person.location_type ?? "",
      r.person.email ?? "",
      r.person.phone ?? "",
      r.person.mobile ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `targeting-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Targeting" subtitle="Find the right people by destination, sector, specialism and more" />

      {/* Group pre-filter banner */}
      {groupCompany && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in-up">
          <Network className="w-4 h-4 text-primary shrink-0" />
          <p className="text-ink text-sm flex-1">
            Showing the <span className="font-medium">{groupCompany.name}</span> group only
          </p>
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="text-faint hover:text-ink"
            title="Clear group filter"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface rounded-2xl shadow-card border border-line p-5 mb-5 space-y-4 animate-fade-in-up">
        <ChipGroup
          label="Destination"
          options={destinationOptions}
          selected={destinations}
          onToggle={(v) => setDestinations((s) => toggleIn(s, v))}
          extra={
            <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
              <Switch checked={coreOnly} onCheckedChange={setCoreOnly} className="scale-75" />
              Core only
            </label>
          }
        />
        <ChipGroup label="Sector" options={sectorOptions} selected={sectors} onToggle={(v) => setSectors((s) => toggleIn(s, v))} />
        <ChipGroup label="Specialism" options={specialismOptions} selected={specialisms} onToggle={(v) => setSpecialisms((s) => toggleIn(s, v))} />
        <ChipGroup label="Company sub-type" options={subTypeOptions} selected={subTypes} onToggle={(v) => setSubTypes((s) => toggleIn(s, v))} />
        <ChipGroup label="Tier" options={tierOptions} selected={tiers} onToggle={(v) => setTiers((s) => toggleIn(s, v))} />

        <div className="flex items-center justify-between border-t border-line pt-4 flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
            <Switch checked={includeGroup} onCheckedChange={setIncludeGroup} />
            Include group members
            <span className="text-faint text-xs hidden sm:inline">(expands matched companies through ownership links)</span>
          </label>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => {
                setDestinations([]); setCoreOnly(false); setSectors([]);
                setSpecialisms([]); setSubTypes([]); setTiers([]);
                if (groupCompanyId) setSearchParams({});
              }}
              className="text-faint text-xs hover:text-ink flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear all filters
            </button>
          ) : null}
        </div>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-ink text-sm font-medium">
          {results.length} {results.length === 1 ? "person" : "people"}
          {filtersActive ? " match" : ""}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={copyEmails} disabled={results.length === 0} className="text-faint hover:text-ink text-xs gap-1.5 h-8">
            <Copy className="w-3.5 h-3.5" /> Copy emails
          </Button>
          <Button type="button" variant="ghost" onClick={exportCSV} disabled={results.length === 0} className="text-faint hover:text-ink text-xs gap-1.5 h-8">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ShimmerCard count={4} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Crosshair}
          title="No people match"
          description="Try removing a filter, or widen the destination strength."
        />
      ) : (
        <div className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden animate-fade-in-up">
          {results.map(({ person, company, seatTitle, patch }, i) => (
            <div
              key={person.id}
              className={`flex items-center gap-3 px-4 sm:px-5 py-3 ${i !== results.length - 1 ? "border-b border-line" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                <span className="text-primary font-medium text-xs">{person.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0 grid sm:grid-cols-[1.2fr_1fr_1fr_0.7fr] gap-x-3 gap-y-0.5 items-center">
                <div className="min-w-0">
                  <Link to={`/contacts/${person.id}`} className="text-ink text-sm font-medium hover:text-primary transition-colors truncate block">
                    {person.name}
                  </Link>
                  <p className="text-faint text-xs truncate sm:hidden">
                    {[seatTitle, person.company_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="min-w-0 hidden sm:block">
                  {company ? (
                    <Link to={`/trade-accounts/${company.id}`} className="text-muted text-xs hover:text-primary transition-colors truncate block">
                      {company.name}
                    </Link>
                  ) : (
                    <span className="text-faint text-xs">{person.company_name || "—"}</span>
                  )}
                  <p className="text-faint text-[10px] truncate">{seatTitle || "—"}</p>
                </div>
                <span className="text-faint text-xs truncate hidden sm:block">{patch || "—"}</span>
                <span className="hidden sm:block">
                  {person.location_type && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/[0.04] text-muted border border-line whitespace-nowrap">
                      {person.location_type}
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
