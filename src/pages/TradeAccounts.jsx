import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActivePeople } from "@/api/people";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { useReferenceList } from "@/api/crm";
import { Handshake, Search, Upload, Download, Trash2, MapPin, Navigation, Map, List, LayoutGrid, SlidersHorizontal, X, Loader2, Building2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import TradeAccountForm from "@/components/trade/TradeAccountForm";
import TradeAccountDetail from "@/components/trade/TradeAccountDetail";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { geocodeAddress, geocodeLocation, distanceMiles } from "@/lib/geocoding";
import { toneHexFor } from "@/lib/statusColors";

const GOOGLE_API_KEY = "AIzaSyAN-qJFLomJZNCpaFjacQk5K2j_wlu8b5U";

const RADIUS_OPTIONS = [5, 10, 20, 50];

const typeStyles = {
  "Tour Operator": "bg-primary/10 text-primary border-primary/20",
  "Travel Agency": "bg-success/10 text-success border-success/20",
  "Parent Company": "bg-warning/10 text-warning border-warning/20",
};

const strengthColour = (strength) => toneHexFor(strength);

// ─── Google Maps hook ───────────────────────────────────────────────────────
function useGoogleMaps() {
  const [loaded, setLoaded] = useState(!!window.google?.maps);
  useEffect(() => {
    if (window.google?.maps) { setLoaded(true); return; }
    const existing = document.getElementById("gmap-script");
    if (existing) { existing.addEventListener("load", () => setLoaded(true)); return; }
    const script = document.createElement("script");
    script.id = "gmap-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}`;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
  return loaded;
}

// ─── Map View component ──────────────────────────────────────────────────────
function MapView({ accounts, visitCenter, visitRadius, onSelectAccount }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const circleRef = useRef(null);
  const mapsLoaded = useGoogleMaps();

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: visitCenter || { lat: 54.0, lng: -2.0 },
        zoom: visitCenter ? 10 : 6,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#F6F7FB" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#676879" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
          { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#E4E7EE" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#D6E4F7" }] },
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
          { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#C4C7D4" }] },
        ],
      });
    }

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Clear old circle
    if (circleRef.current) { circleRef.current.setMap(null); circleRef.current = null; }

    // Draw radius circle
    if (visitCenter && visitRadius) {
      circleRef.current = new window.google.maps.Circle({
        map: mapInstance.current,
        center: visitCenter,
        radius: visitRadius * 1609.34, // miles to metres
        fillColor: "#5A3DE6",
        fillOpacity: 0.08,
        strokeColor: "#5A3DE6",
        strokeOpacity: 0.4,
        strokeWeight: 1.5,
      });
    }

    // Add markers for geocoded accounts
    const geocodedAccounts = accounts.filter(a => a.lat && a.lng);
    geocodedAccounts.forEach(account => {
      const colour = strengthColour(account.relationship_strength);
      const marker = new window.google.maps.Marker({
        position: { lat: account.lat, lng: account.lng },
        map: mapInstance.current,
        title: account.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: colour,
          fillOpacity: 0.9,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="background:#FFFFFF;color:#1F2430;padding:10px 14px;border-radius:10px;min-width:180px;font-family:sans-serif;">
            <p style="font-weight:600;font-size:13px;margin:0 0 4px">${account.name}</p>
            <p style="color:#676879;font-size:11px;margin:0 0 2px">${account.type}</p>
            <p style="color:#676879;font-size:11px;margin:0 0 6px">${[account.city, account.county].filter(Boolean).join(", ")}</p>
            <span style="background:${colour}22;color:${colour};border:1px solid ${colour}44;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600">${account.relationship_strength || "Unknown"}</span>
          </div>`,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstance.current, marker);
        onSelectAccount(account);
      });

      markersRef.current.push(marker);
    });

    // Re-center map
    if (visitCenter) {
      mapInstance.current.setCenter(visitCenter);
      mapInstance.current.setZoom(visitRadius <= 10 ? 11 : visitRadius <= 20 ? 10 : 8);
    } else if (geocodedAccounts.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      geocodedAccounts.forEach(a => bounds.extend({ lat: a.lat, lng: a.lng }));
      mapInstance.current.fitBounds(bounds);
    }
  }, [mapsLoaded, accounts, visitCenter, visitRadius]);

  if (!mapsLoaded) {
    return (
      <div className="w-full h-[480px] rounded-2xl bg-surface border border-line flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-faint text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-line" ref={mapRef} />
  );
}

// ─── Plan a Visit panel ──────────────────────────────────────────────────────
function PlanVisit({ accounts, contacts, onSelectAccount }) {
  const { values: subTypeOptions } = useReferenceList("company_subtype");
  const TYPE_FILTERS = ["All", ...subTypeOptions];
  const [locationQuery, setLocationQuery] = useState("");
  const [radius, setRadius] = useState(20);
  const [typeFilter, setTypeFilter] = useState("All");
  const [searching, setSearching] = useState(false);
  const [visitCenter, setVisitCenter] = useState(null);
  const [visitLabel, setVisitLabel] = useState("");
  const [results, setResults] = useState(null);
  const [view, setView] = useState("list"); // "list" | "map"

  const handleSearch = async () => {
    if (!locationQuery.trim()) return;
    setSearching(true);
    const geo = await geocodeLocation(locationQuery);
    if (!geo) {
      setSearching(false);
      setResults([]);
      setVisitLabel("");
      return;
    }
    setVisitCenter({ lat: geo.lat, lng: geo.lng });
    setVisitLabel(geo.formatted_address);

    // Filter accounts by radius + type
    let matches = accounts
      .filter(a => a.lat && a.lng)
      .map(a => ({ ...a, distance: distanceMiles(geo.lat, geo.lng, a.lat, a.lng) }))
      .filter(a => a.distance <= radius)
      .filter(a => typeFilter === "All" || a.type === typeFilter)
      .sort((a, b) => a.distance - b.distance);

    setResults(matches);
    setSearching(false);
  };

  const accountContacts = (accountId) =>
    contacts.filter(c => c.company_type === "TradeAccount" && c.company_id === accountId);

  return (
    <div className="space-y-5">
      {/* Search controls */}
      <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
        <div className="flex items-center gap-2 mb-4">
          <Navigation className="w-4 h-4 text-primary" />
          <h2 className="text-ink font-medium text-sm">Plan a Visit</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <Input
              placeholder="Enter a city, town or postcode... e.g. Manchester"
              value={locationQuery}
              onChange={e => setLocationQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="pl-10 bg-surface-secondary border-line text-ink placeholder:text-faint rounded-xl h-10"
            />
          </div>

          {/* Radius */}
          <Select value={String(radius)} onValueChange={v => setRadius(Number(v))}>
            <SelectTrigger className="bg-surface-secondary border-line text-muted rounded-xl h-10 w-36 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-elevated border-line">
              {RADIUS_OPTIONS.map(r => <SelectItem key={r} value={String(r)}>{r} miles</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Type */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-surface-secondary border-line text-muted rounded-xl h-10 w-44 text-xs">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-elevated border-line">
              {TYPE_FILTERS.map(t => <SelectItem key={t} value={t}>{t === "All" ? "All types" : t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button
            onClick={handleSearch}
            disabled={searching || !locationQuery.trim()}
            className="bg-primary hover:bg-primary-hover text-white rounded-xl px-5 h-10 shrink-0"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {visitLabel && (
          <p className="text-faint text-xs mt-3 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            Showing results within <span className="text-ink font-medium mx-1">{radius} miles</span> of <span className="text-ink font-medium mx-1">{visitLabel}</span>
            {typeFilter !== "All" && <> · <span className="text-primary font-medium">{typeFilter} only</span></>}
          </p>
        )}
      </div>

      {/* Results */}
      {results !== null && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-faint text-sm">
              {results.length === 0
                ? "No companies found in this area"
                : <><span className="text-ink font-medium">{results.length}</span> compan{results.length !== 1 ? "ies" : "y"} found</>
              }
            </p>
            {results.length > 0 && (
              <div className="flex gap-1 bg-surface border border-line rounded-xl p-1">
                <button
                  onClick={() => setView("list")}
                  className={`p-1.5 rounded-lg transition-all ${view === "list" ? "bg-black/[0.04] text-ink" : "text-faint hover:text-ink"}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("map")}
                  className={`p-1.5 rounded-lg transition-all ${view === "map" ? "bg-black/[0.04] text-ink" : "text-faint hover:text-ink"}`}
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {results.length > 0 && view === "map" && (
            <MapView
              accounts={results}
              visitCenter={visitCenter}
              visitRadius={radius}
              onSelectAccount={onSelectAccount}
            />
          )}

          {results.length > 0 && view === "list" && (
            <div className="space-y-3">
              {results.map((account, i) => {
                const acContacts = accountContacts(account.id);
                return (
                  <div
                    key={account.id}
                    className="bg-surface rounded-2xl shadow-card border border-line p-5 hover:border-line-strong transition-all cursor-pointer group animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.03}s` }}
                    onClick={() => onSelectAccount(account)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Distance badge */}
                      <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-primary font-bold text-sm">{account.distance.toFixed(1)}</p>
                        <p className="text-primary text-[9px] uppercase tracking-wider">miles</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-ink font-medium text-sm group-hover:text-primary transition-colors">{account.name}</h3>
                            <div className="flex items-center flex-wrap gap-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeStyles[account.type] || ""}`}>
                                {account.type}
                              </span>
                              {[account.address_line1, account.city, account.county, account.address_postcode].filter(Boolean).length > 0 && (
                                <span className="text-faint text-xs flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {[account.city, account.county, account.address_postcode].filter(Boolean).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={account.relationship_strength} />
                        </div>
                        {/* Contacts */}
                        {acContacts.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {acContacts.slice(0, 3).map(c => (
                              <span key={c.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-canvas text-muted border border-line">
                                {c.name}{c.role ? ` · ${c.role}` : ""}
                              </span>
                            ))}
                            {acContacts.length > 3 && (
                              <span className="text-faint text-[10px] self-center">+{acContacts.length - 3} more</span>
                            )}
                          </div>
                        )}
                        {account.last_interaction_date && (
                          <p className="text-faint text-xs mt-1.5">Last contact: {format(new Date(account.last_interaction_date), "MMM d, yyyy")}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Prompt when no search yet */}
      {results === null && (
        <div className="bg-surface rounded-2xl shadow-card border border-line p-10 text-center">
          <Navigation className="w-8 h-8 text-primary/40 mx-auto mb-3" />
          <p className="text-faint text-sm">Enter a location above to find nearby companies</p>
          <p className="text-faint text-xs mt-1">Works best when companies have addresses saved</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function TradeAccounts() {
  const { values: subTypeOptions } = useReferenceList("company_subtype");
  const TYPE_FILTERS = ["All", ...subTypeOptions];
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("browse"); // "browse" | "visit" | "map"
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [browseView, setBrowseView] = useState("grid"); // "grid" | "list"
  const [bulkGeocoding, setBulkGeocoding] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, errors: 0 });
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => listActiveTradeAccounts("-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => listActivePeople(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TradeAccount.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trade-accounts"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TradeAccount.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trade-accounts"] }); setEditing(null); setShowForm(false); setViewing(null); },
  });

  // Soft-archive rather than hard delete — pipeline pairs, seats and
  // interactions keep valid references and the record stays recoverable.
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TradeAccount.update(id, { archived: true, archive_reason: "Deleted in app" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trade-accounts"] }); setConfirmDelete(null); setViewing(null); },
  });

  const handleSubmit = (data) => {
    editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  };

  const handleBulkGeocode = async () => {
    const unmapped = accounts.filter(a => !a.lat && (a.address_line1 || a.city || a.address_postcode));
    if (unmapped.length === 0) return;
    setBulkGeocoding(true);
    setBulkProgress({ done: 0, total: unmapped.length, errors: 0 });
    let errors = 0;
    for (let i = 0; i < unmapped.length; i++) {
      const a = unmapped[i];
      try {
        const parts = [a.address_line1, a.city, a.county, a.address_postcode, a.address_country || "UK"].filter(Boolean);
        const result = await geocodeAddress({ address_line1: a.address_line1, city: a.city, county: a.county, address_postcode: a.address_postcode, address_country: a.address_country });
        if (result) {
          await base44.entities.TradeAccount.update(a.id, { lat: result.lat, lng: result.lng, geocoded_at: new Date().toISOString() });
        } else { errors++; }
      } catch { errors++; }
      setBulkProgress({ done: i + 1, total: unmapped.length, errors });
      // Small delay to avoid hammering the API
      await new Promise(r => setTimeout(r, 200));
    }
    queryClient.invalidateQueries({ queryKey: ["trade-accounts"] });
    setBulkGeocoding(false);
  };

  // Extended search: name, type, region, city, county, postcode
  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch =
      a.name?.toLowerCase().includes(q) ||
      a.type?.toLowerCase().includes(q) ||
      a.region?.toLowerCase().includes(q) ||
      a.city?.toLowerCase().includes(q) ||
      a.county?.toLowerCase().includes(q) ||
      a.address_postcode?.toLowerCase().includes(q) ||
      a.parent_company_name?.toLowerCase().includes(q);
    const matchesType = typeFilter === "All" || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const geocodedCount = accounts.filter(a => a.lat && a.lng).length;

  const exportToCSV = () => {
    const headers = [
      "Name", "Type", "Parent Company", "Region", "City", "County", "Postcode", "Country",
      "Address Line 1", "Phone", "Website", "Relationship Strength",
      "Geocoded", "Latitude", "Longitude", "Key Destinations", "Notes", "Last Interaction Date"
    ];
    const rows = accounts.map(a => [
      a.name ?? "",
      a.type ?? "",
      a.parent_company_name ?? "",
      a.region ?? "",
      a.city ?? "",
      a.county ?? "",
      a.address_postcode ?? "",
      a.address_country ?? "",
      a.address_line1 ?? "",
      a.phone ?? "",
      a.website ?? "",
      a.relationship_strength ?? "",
      a.lat && a.lng ? "Yes" : "No",
      a.lat ?? "",
      a.lng ?? "",
      (a.key_destinations ?? []).join("; "),
      (a.notes ?? "").replace(/\n/g, " "),
      a.last_interaction_date ?? "",
      ]);
      const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trade-accounts-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (viewing && !showForm) {
    return (
      <TradeAccountDetail
        account={viewing}
        onBack={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setShowForm(true); }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Tour operators, travel agencies and networks"
        action={() => { setEditing(null); setShowForm(true); }}
        actionLabel="Add Company"
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-card border border-line p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-ink font-medium mb-2">Archive Company</h3>
            <p className="text-muted text-sm mb-5">Archive <span className="text-ink font-medium">{confirmDelete.name}</span>? It disappears from all lists but its history, pipeline pairs and contacts stay intact. An admin can restore or purge it from the Base44 dashboard.</p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-faint hover:text-ink transition-colors">Cancel</button>
              <button type="button" onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="px-5 py-2 text-sm bg-danger hover:bg-danger/80 text-white rounded-xl">
                {deleteMutation.isPending ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import / Export */}
      <div className="flex justify-end gap-2 mb-2 -mt-4">
        <Button type="button" variant="ghost" onClick={exportToCSV} className="text-faint hover:text-ink text-xs gap-1.5 h-8">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
        <Link to="/import-trade-accounts">
          <Button type="button" variant="ghost" className="text-faint hover:text-ink text-xs gap-1.5 h-8">
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </Button>
        </Link>
      </div>

      {showForm && (
        <TradeAccountForm
          account={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Mode tabs */}
      <div className="flex gap-2 flex-wrap mb-5 animate-fade-in-up">
        {[
          { key: "browse", label: "Browse", icon: List },
          { key: "visit",  label: "Plan a Visit", icon: Navigation },
          { key: "map",    label: "Map View", icon: Map },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
              mode === key
                ? "bg-primary hover:bg-primary-hover text-white border-transparent shadow-lg shadow-primary/20"
                : "bg-canvas text-faint border-line hover:border-line-strong hover:text-ink"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {key === "map" && geocodedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-black/[0.06]">{geocodedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── BROWSE MODE ── */}
      {mode === "browse" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
              <Input
                placeholder="Search by name, city, postcode, county, region..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-surface border-line text-ink placeholder:text-faint rounded-xl h-10"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {TYPE_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                    typeFilter === f
                      ? "bg-primary hover:bg-primary-hover text-white border-transparent shadow-lg shadow-primary/20"
                      : "bg-canvas text-faint border-line hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {/* Bulk geocode */}
            {accounts.filter(a => !a.lat && (a.address_line1 || a.city)).length > 0 && !bulkGeocoding && (
              <button
                onClick={handleBulkGeocode}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border border-line bg-canvas text-muted hover:text-ink hover:border-line-strong transition-all whitespace-nowrap"
              >
                <MapPin className="w-3 h-3" />
                Geocode All ({accounts.filter(a => !a.lat && (a.address_line1 || a.city)).length} unmapped)
              </button>
            )}
            {bulkGeocoding && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs border border-primary/30 bg-primary/10 text-primary whitespace-nowrap">
                <Loader2 className="w-3 h-3 animate-spin" />
                Geocoding {bulkProgress.done}/{bulkProgress.total}…
              </div>
            )}
          </div>

          {search && (
            <p className="text-faint text-xs mb-4">{filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"</p>
          )}

          <div className="flex justify-end mb-3">
            <div className="flex gap-1 bg-surface border border-line rounded-xl p-1">
              <button
                onClick={() => setBrowseView("grid")}
                className={`p-1.5 rounded-lg transition-all ${browseView === "grid" ? "bg-black/[0.04] text-ink" : "text-faint hover:text-ink"}`}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setBrowseView("list")}
                className={`p-1.5 rounded-lg transition-all ${browseView === "list" ? "bg-black/[0.04] text-ink" : "text-faint hover:text-ink"}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoading ? <ShimmerCard count={4} /> : filtered.length === 0 ? (
            <EmptyState icon={Handshake} title="No companies" description={search ? "No companies match your search" : "Add your first tour operator or agency"} action={() => setShowForm(true)} actionLabel="Add Company" />
          ) : browseView === "list" ? (
            <div className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-canvas">
                      <th className="text-left text-faint font-medium text-xs uppercase tracking-wider px-4 py-3">Company</th>
                      <th className="text-left text-faint font-medium text-xs uppercase tracking-wider px-4 py-3">Type</th>
                      <th className="text-left text-faint font-medium text-xs uppercase tracking-wider px-4 py-3">Location</th>
                      <th className="text-left text-faint font-medium text-xs uppercase tracking-wider px-4 py-3">Relationship</th>
                      <th className="text-left text-faint font-medium text-xs uppercase tracking-wider px-4 py-3">Last Contact</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((account, i) => (
                      <tr
                        key={account.id}
                        className="border-b border-line last:border-0 hover:bg-canvas cursor-pointer transition-colors animate-fade-in-up group"
                        style={{ animationDelay: `${0.03 + i * 0.02}s` }}
                        onClick={() => setViewing(account)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {account.lat && <MapPin className="w-3 h-3 text-success shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-ink font-medium group-hover:text-primary transition-colors truncate">{account.name}</p>
                              {account.parent_company_name && (
                                <p className="text-faint text-[10px] truncate">↳ {account.parent_company_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {account.type && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeStyles[account.type] || "bg-canvas text-muted border-line"}`}>
                              {account.type}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted text-xs">
                          {[account.city, account.county, account.address_postcode].filter(Boolean).join(", ") || account.region || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={account.relationship_strength} />
                        </td>
                        <td className="px-4 py-3 text-faint text-xs">
                          {account.last_interaction_date ? format(new Date(account.last_interaction_date), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(account); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-faint hover:text-danger hover:bg-danger/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((account, i) => (
                <div
                  key={account.id}
                  className="bg-surface rounded-2xl shadow-card border border-line p-5 hover:border-line-strong hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group relative"
                  style={{ animationDelay: `${0.05 + i * 0.03}s` }}
                  onClick={() => setViewing(account)}
                >
                  <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDelete(account); }} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-faint hover:text-danger hover:bg-danger/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1 pr-8">
                      <h3 className="text-ink font-medium text-sm group-hover:text-primary transition-colors">{account.name}</h3>
                      {/* Show city prominently */}
                      {(account.city || account.county || account.address_postcode) && (
                        <p className="text-faint text-xs mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {[account.city, account.county, account.address_postcode].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {account.region && !account.city && (
                        <p className="text-faint text-xs mt-0.5">{account.region}</p>
                      )}
                      {account.parent_company_name && (
                        <p className="text-faint text-[10px] mt-0.5">↳ {account.parent_company_name}</p>
                      )}
                    </div>
                    <StatusBadge status={account.relationship_strength} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {account.type && (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${typeStyles[account.type] || "bg-canvas text-muted border-line"}`}>
                        {account.type}
                      </span>
                    )}
                    {account.lat && (
                      <span className="text-success text-[10px] flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" /> mapped
                      </span>
                    )}
                  </div>
                  {account.last_interaction_date && (
                    <p className="text-faint text-xs mt-2">Last: {format(new Date(account.last_interaction_date), "MMM d, yyyy")}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── PLAN A VISIT MODE ── */}
      {mode === "visit" && (
        <PlanVisit
          accounts={accounts}
          contacts={contacts}
          onSelectAccount={setViewing}
        />
      )}

      {/* ── MAP MODE ── */}
      {mode === "map" && (
        <div className="space-y-4 animate-fade-in-up">
          {geocodedCount === 0 ? (
            <div className="bg-surface rounded-2xl shadow-card border border-line p-10 text-center">
              <Map className="w-8 h-8 text-primary/40 mx-auto mb-3" />
              <p className="text-faint text-sm">No companies have been mapped yet</p>
              <p className="text-faint text-xs mt-1">Add addresses to your companies and they'll appear here automatically</p>
            </div>
          ) : (
            <>
              <p className="text-faint text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3 text-success" />
                Showing <span className="text-ink font-medium mx-1">{geocodedCount}</span> of <span className="text-ink font-medium mx-1">{accounts.length}</span> companies with mapped locations. Colour = relationship strength.
              </p>
              {/* Type filter for map */}
              <div className="flex gap-2 flex-wrap">
                {TYPE_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setTypeFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      typeFilter === f
                        ? "bg-primary hover:bg-primary-hover text-white border-transparent"
                        : "bg-canvas text-faint border-line hover:text-ink"
                    }`}
                  >
                    {f === "All" ? "All types" : f}
                  </button>
                ))}
              </div>
              <MapView
                accounts={accounts.filter(a => typeFilter === "All" || a.type === typeFilter)}
                visitCenter={null}
                visitRadius={null}
                onSelectAccount={setViewing}
              />
              {/* Legend */}
              <div className="flex flex-wrap gap-3 pt-1">
                {Object.entries(strengthColour).map(([label, colour]) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: colour }} />
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}