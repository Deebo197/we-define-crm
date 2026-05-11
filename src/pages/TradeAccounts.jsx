import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Handshake, Search, Upload, Trash2, MapPin, Navigation, Map, List, SlidersHorizontal, X, Loader2, Building2 } from "lucide-react";
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

const GOOGLE_API_KEY = "AIzaSyAN-qJFLomJZNCpaFjacQk5K2j_wlu8b5U";

const TYPE_FILTERS = ["All", "Tour Operator", "Travel Agent", "Parent Company"];
const RADIUS_OPTIONS = [5, 10, 20, 50];

const typeStyles = {
  "Tour Operator": "bg-[#7F5BFF]/10 text-[#7F5BFF] border-[#7F5BFF]/20",
  "Travel Agent": "bg-[#3DDC97]/10 text-[#3DDC97] border-[#3DDC97]/20",
  "Parent Company": "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20",
};

const strengthColour = {
  "Strong":  "#3DDC97",
  "Growing": "#7F5BFF",
  "New":     "#A1A1B5",
  "At Risk": "#FFB547",
  "Dormant": "#FF5C7A",
};

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
          { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#A1A1B5" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#0d0d1a" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d4a" }] },
          { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1b2e" }] },
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
          { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#3a3a5c" }] },
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
        fillColor: "#7F5BFF",
        fillOpacity: 0.08,
        strokeColor: "#7F5BFF",
        strokeOpacity: 0.4,
        strokeWeight: 1.5,
      });
    }

    // Add markers for geocoded accounts
    const geocodedAccounts = accounts.filter(a => a.lat && a.lng);
    geocodedAccounts.forEach(account => {
      const colour = strengthColour[account.relationship_strength] || "#A1A1B5";
      const marker = new window.google.maps.Marker({
        position: { lat: account.lat, lng: account.lng },
        map: mapInstance.current,
        title: account.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: colour,
          fillOpacity: 0.9,
          strokeColor: "#0d0d1a",
          strokeWeight: 2,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="background:#1a1a2e;color:#fff;padding:10px 14px;border-radius:10px;min-width:180px;font-family:sans-serif;">
            <p style="font-weight:600;font-size:13px;margin:0 0 4px">${account.name}</p>
            <p style="color:#A1A1B5;font-size:11px;margin:0 0 2px">${account.type}</p>
            <p style="color:#A1A1B5;font-size:11px;margin:0 0 6px">${[account.city, account.county].filter(Boolean).join(", ")}</p>
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
      <div className="w-full h-[480px] rounded-2xl bg-surface border border-white/[0.06] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#7F5BFF] animate-spin" />
          <p className="text-[#6C6C80] text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-white/[0.06]" ref={mapRef} />
  );
}

// ─── Plan a Visit panel ──────────────────────────────────────────────────────
function PlanVisit({ accounts, contacts, onSelectAccount }) {
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
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Navigation className="w-4 h-4 text-[#7F5BFF]" />
          <h2 className="text-white font-medium text-sm">Plan a Visit</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
            <Input
              placeholder="Enter a city, town or postcode... e.g. Manchester"
              value={locationQuery}
              onChange={e => setLocationQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="pl-10 bg-surface-secondary border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10"
            />
          </div>

          {/* Radius */}
          <Select value={String(radius)} onValueChange={v => setRadius(Number(v))}>
            <SelectTrigger className="bg-surface-secondary border-white/[0.06] text-[#A1A1B5] rounded-xl h-10 w-36 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-elevated border-white/[0.06]">
              {RADIUS_OPTIONS.map(r => <SelectItem key={r} value={String(r)}>{r} miles</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Type */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-surface-secondary border-white/[0.06] text-[#A1A1B5] rounded-xl h-10 w-44 text-xs">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-elevated border-white/[0.06]">
              {TYPE_FILTERS.map(t => <SelectItem key={t} value={t}>{t === "All" ? "All types" : t + "s"}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button
            onClick={handleSearch}
            disabled={searching || !locationQuery.trim()}
            className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-5 h-10 shrink-0"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {visitLabel && (
          <p className="text-[#6C6C80] text-xs mt-3 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#7F5BFF]" />
            Showing results within <span className="text-white font-medium mx-1">{radius} miles</span> of <span className="text-white font-medium mx-1">{visitLabel}</span>
            {typeFilter !== "All" && <> · <span className="text-[#7F5BFF] font-medium">{typeFilter}s only</span></>}
          </p>
        )}
      </div>

      {/* Results */}
      {results !== null && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#6C6C80] text-sm">
              {results.length === 0
                ? "No accounts found in this area"
                : <><span className="text-white font-medium">{results.length}</span> account{results.length !== 1 ? "s" : ""} found</>
              }
            </p>
            {results.length > 0 && (
              <div className="flex gap-1 bg-surface border border-white/[0.06] rounded-xl p-1">
                <button
                  onClick={() => setView("list")}
                  className={`p-1.5 rounded-lg transition-all ${view === "list" ? "bg-white/[0.08] text-white" : "text-[#6C6C80] hover:text-white"}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("map")}
                  className={`p-1.5 rounded-lg transition-all ${view === "map" ? "bg-white/[0.08] text-white" : "text-[#6C6C80] hover:text-white"}`}
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
                    className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] transition-all cursor-pointer group animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.03}s` }}
                    onClick={() => onSelectAccount(account)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Distance badge */}
                      <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-[#7F5BFF]/10 border border-[#7F5BFF]/20">
                        <p className="text-[#7F5BFF] font-bold text-sm">{account.distance.toFixed(1)}</p>
                        <p className="text-[#7F5BFF] text-[9px] uppercase tracking-wider">miles</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{account.name}</h3>
                            <div className="flex items-center flex-wrap gap-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeStyles[account.type] || ""}`}>
                                {account.type}
                              </span>
                              {[account.address_line1, account.city, account.county, account.address_postcode].filter(Boolean).length > 0 && (
                                <span className="text-[#6C6C80] text-xs flex items-center gap-1">
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
                              <span key={c.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-[#A1A1B5] border border-white/[0.06]">
                                {c.name}{c.role ? ` · ${c.role}` : ""}
                              </span>
                            ))}
                            {acContacts.length > 3 && (
                              <span className="text-[#6C6C80] text-[10px] self-center">+{acContacts.length - 3} more</span>
                            )}
                          </div>
                        )}
                        {account.last_interaction_date && (
                          <p className="text-[#6C6C80] text-xs mt-1.5">Last contact: {format(new Date(account.last_interaction_date), "MMM d, yyyy")}</p>
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
        <div className="bg-surface rounded-2xl border border-white/[0.06] p-10 text-center">
          <Navigation className="w-8 h-8 text-[#7F5BFF]/40 mx-auto mb-3" />
          <p className="text-[#6C6C80] text-sm">Enter a location above to find nearby accounts</p>
          <p className="text-[#4a4a60] text-xs mt-1">Works best when accounts have addresses saved</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function TradeAccounts() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("browse"); // "browse" | "visit" | "map"
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [bulkGeocoding, setBulkGeocoding] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, errors: 0 });
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => base44.entities.TradeAccount.list("-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TradeAccount.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trade-accounts"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TradeAccount.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trade-accounts"] }); setEditing(null); setShowForm(false); setViewing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TradeAccount.delete(id),
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
        title="Trade Accounts"
        subtitle="Tour operators and travel agents"
        action={() => { setEditing(null); setShowForm(true); }}
        actionLabel="Add Account"
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-white/[0.08] p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white font-medium mb-2">Delete Trade Account</h3>
            <p className="text-[#A1A1B5] text-sm mb-5">Are you sure you want to delete <span className="text-white font-medium">{confirmDelete.name}</span>?</p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-[#6C6C80] hover:text-white transition-colors">Cancel</button>
              <button type="button" onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="px-5 py-2 text-sm bg-[#FF5C7A] hover:bg-[#FF5C7A]/80 text-white rounded-xl">
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import link */}
      <div className="flex justify-end mb-2 -mt-4">
        <Link to="/import-trade-accounts">
          <Button type="button" variant="ghost" className="text-[#6C6C80] hover:text-white text-xs gap-1.5 h-8">
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
      <div className="flex gap-2 mb-5 animate-fade-in-up">
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
                ? "bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white border-transparent shadow-lg shadow-[#7F5BFF]/20"
                : "bg-white/[0.03] text-[#6C6C80] border-white/[0.08] hover:border-white/[0.16] hover:text-white"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {key === "map" && geocodedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-white/10">{geocodedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── BROWSE MODE ── */}
      {mode === "browse" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
              <Input
                placeholder="Search by name, city, postcode, county, region..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C6C80] hover:text-white">
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
                      ? "bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white border-transparent shadow-lg shadow-[#7F5BFF]/20"
                      : "bg-white/[0.03] text-[#6C6C80] border-white/[0.08] hover:border-white/[0.16] hover:text-white"
                  }`}
                >
                  {f === "All" ? "All" : f + "s"}
                </button>
              ))}
            </div>
            {/* Bulk geocode */}
            {accounts.filter(a => !a.lat && (a.address_line1 || a.city)).length > 0 && !bulkGeocoding && (
              <button
                onClick={handleBulkGeocode}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border border-white/[0.08] bg-white/[0.03] text-[#A1A1B5] hover:text-white hover:border-white/[0.16] transition-all whitespace-nowrap"
              >
                <MapPin className="w-3 h-3" />
                Geocode All ({accounts.filter(a => !a.lat && (a.address_line1 || a.city)).length} unmapped)
              </button>
            )}
            {bulkGeocoding && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs border border-[#7F5BFF]/30 bg-[#7F5BFF]/10 text-[#7F5BFF] whitespace-nowrap">
                <Loader2 className="w-3 h-3 animate-spin" />
                Geocoding {bulkProgress.done}/{bulkProgress.total}…
              </div>
            )}
          </div>

          {search && (
            <p className="text-[#6C6C80] text-xs mb-4">{filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"</p>
          )}

          {isLoading ? <ShimmerCard count={4} /> : filtered.length === 0 ? (
            <EmptyState icon={Handshake} title="No trade accounts" description={search ? "No accounts match your search" : "Add your first tour operator or agent"} action={() => setShowForm(true)} actionLabel="Add Account" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((account, i) => (
                <div
                  key={account.id}
                  className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group relative"
                  style={{ animationDelay: `${0.05 + i * 0.03}s` }}
                  onClick={() => setViewing(account)}
                >
                  <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDelete(account); }} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#6C6C80] hover:text-[#FF5C7A] hover:bg-[#FF5C7A]/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1 pr-8">
                      <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{account.name}</h3>
                      {/* Show city prominently */}
                      {(account.city || account.county || account.address_postcode) && (
                        <p className="text-[#6C6C80] text-xs mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {[account.city, account.county, account.address_postcode].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {account.region && !account.city && (
                        <p className="text-[#6C6C80] text-xs mt-0.5">{account.region}</p>
                      )}
                      {account.parent_company_name && (
                        <p className="text-[#4a4a60] text-[10px] mt-0.5">↳ {account.parent_company_name}</p>
                      )}
                    </div>
                    <StatusBadge status={account.relationship_strength} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {account.type && (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${typeStyles[account.type] || "bg-white/5 text-[#A1A1B5] border-white/10"}`}>
                        {account.type}
                      </span>
                    )}
                    {account.lat && (
                      <span className="text-[#3DDC97] text-[10px] flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" /> mapped
                      </span>
                    )}
                  </div>
                  {account.last_interaction_date && (
                    <p className="text-[#6C6C80] text-xs mt-2">Last: {format(new Date(account.last_interaction_date), "MMM d, yyyy")}</p>
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
            <div className="bg-surface rounded-2xl border border-white/[0.06] p-10 text-center">
              <Map className="w-8 h-8 text-[#7F5BFF]/40 mx-auto mb-3" />
              <p className="text-[#6C6C80] text-sm">No accounts have been mapped yet</p>
              <p className="text-[#4a4a60] text-xs mt-1">Add addresses to your trade accounts and they'll appear here automatically</p>
            </div>
          ) : (
            <>
              <p className="text-[#6C6C80] text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#3DDC97]" />
                Showing <span className="text-white font-medium mx-1">{geocodedCount}</span> of <span className="text-white font-medium mx-1">{accounts.length}</span> accounts with mapped locations. Colour = relationship strength.
              </p>
              {/* Type filter for map */}
              <div className="flex gap-2 flex-wrap">
                {TYPE_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setTypeFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      typeFilter === f
                        ? "bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white border-transparent"
                        : "bg-white/[0.03] text-[#6C6C80] border-white/[0.08] hover:text-white"
                    }`}
                  >
                    {f === "All" ? "All types" : f + "s"}
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
                  <span key={label} className="flex items-center gap-1.5 text-xs text-[#A1A1B5]">
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
