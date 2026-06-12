import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, MapPin, Loader2 } from "lucide-react";
import { geocodeAddress } from "@/lib/geocoding";
import { useReferenceList, DESTINATION_STRENGTHS } from "@/api/crm";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";
const NONE = "__none__";

export default function TradeAccountForm({ account, onSubmit, onCancel, isLoading }) {
  const { data: allAccounts = [] } = useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => listActiveTradeAccounts(),
  });

  // Reference-list driven pickers — never hardcoded
  const { values: subTypeOptions } = useReferenceList("company_subtype");
  const { values: sectorOptions } = useReferenceList("sector");
  const { values: specialismOptions } = useReferenceList("specialism");
  const { values: destinationOptions } = useReferenceList("destination");

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(
    account?.lat ? "✓ Location mapped" : ""
  );

  const [form, setForm] = useState({
    name: account?.name ?? "",
    type: account?.type ?? "Tour Operator",
    tier: account?.tier ?? "",
    sector: account?.sector ?? "",
    specialisms: account?.specialisms ?? [],
    destinations: account?.destinations ?? [],
    parent_company_id: account?.parent_company_id ?? "",
    parent_company_name: account?.parent_company_name ?? "",
    website: account?.website ?? "",
    phone: account?.phone ?? "",
    address_line1: account?.address_line1 ?? "",
    city: account?.city ?? "",
    county: account?.county ?? "",
    address_postcode: account?.address_postcode ?? "",
    address_country: account?.address_country ?? "",
    lat: account?.lat ?? null,
    lng: account?.lng ?? null,
    geocoded_at: account?.geocoded_at ?? "",
    key_destinations: account?.key_destinations ?? [],
    notes: account?.notes ?? "",
    relationship_strength: account?.relationship_strength ?? "New",
    region: account?.region ?? "",
    linked_clients: account?.linked_clients ?? [],
  });

  const [destInput, setDestInput] = useState("");
  const parentOptions = allAccounts.filter(a => a.id !== account?.id);

  const handleParentChange = (v) => {
    if (v === NONE) {
      setForm(f => ({ ...f, parent_company_id: "", parent_company_name: "" }));
      return;
    }
    const p = parentOptions.find(a => a.id === v);
    setForm(f => ({ ...f, parent_company_id: v, parent_company_name: p?.name ?? "" }));
  };

  const addDest = () => {
    const d = destInput.trim();
    if (d && !form.key_destinations.includes(d)) {
      setForm(f => ({ ...f, key_destinations: [...f.key_destinations, d] }));
    }
    setDestInput("");
  };

  const removeDest = (d) => setForm(f => ({ ...f, key_destinations: f.key_destinations.filter(x => x !== d) }));

  const toggleSpecialism = (s) =>
    setForm(f => ({
      ...f,
      specialisms: f.specialisms.includes(s)
        ? f.specialisms.filter(x => x !== s)
        : [...f.specialisms, s],
    }));

  const toggleDestination = (destination) =>
    setForm(f => ({
      ...f,
      destinations: f.destinations.some(d => d.destination === destination)
        ? f.destinations.filter(d => d.destination !== destination)
        : [...f.destinations, { destination, strength: "Core" }],
    }));

  const setDestinationStrength = (destination, strength) =>
    setForm(f => ({
      ...f,
      destinations: f.destinations.map(d => d.destination === destination ? { ...d, strength } : d),
    }));

  const handleGeocode = async () => {
    setGeocoding(true);
    setGeocodeStatus("Locating...");
    const result = await geocodeAddress(form);
    if (result) {
      setForm(f => ({ ...f, lat: result.lat, lng: result.lng, geocoded_at: new Date().toISOString() }));
      setGeocodeStatus("✓ Location mapped");
    } else {
      setGeocodeStatus("⚠ Could not locate — check address");
    }
    setGeocoding(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Auto-geocode if address has changed or no coords yet
    let finalForm = { ...form };
    const hasAddress = form.city || form.address_postcode;
    const needsGeocode = hasAddress && !form.lat;
    if (needsGeocode) {
      setGeocoding(true);
      setGeocodeStatus("Mapping location...");
      const result = await geocodeAddress(form);
      if (result) {
        finalForm = { ...finalForm, lat: result.lat, lng: result.lng, geocoded_at: new Date().toISOString() };
        setGeocodeStatus("✓ Location mapped");
      }
      setGeocoding(false);
    }
    onSubmit(finalForm);
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-ink font-medium">{account ? "Edit Company" : "New Company"}</h2>
        <button type="button" onClick={onCancel} className="text-faint hover:text-ink"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted text-xs mb-1.5">Company Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} required placeholder="e.g. Kuoni" />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Sub-type</Label>
            <Select value={form.type || NONE} onValueChange={v => setForm(f => ({ ...f, type: v === NONE ? "" : v }))}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Select sub-type..." /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                <SelectItem value={NONE}>None</SelectItem>
                {/* Keep a legacy value selectable even if it's no longer in the reference list */}
                {form.type && !subTypeOptions.includes(form.type) && (
                  <SelectItem value={form.type}>{form.type}</SelectItem>
                )}
                {subTypeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Tier</Label>
            <Input value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))} className={inputClass} placeholder="e.g. Tier 1" />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Sector</Label>
            <Select value={form.sector || NONE} onValueChange={v => setForm(f => ({ ...f, sector: v === NONE ? "" : v }))}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Select sector..." /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                <SelectItem value={NONE}>None</SelectItem>
                {form.sector && !sectorOptions.includes(form.sector) && (
                  <SelectItem value={form.sector}>{form.sector}</SelectItem>
                )}
                {sectorOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-muted text-xs mb-1.5">Parent Company</Label>
            <Select value={form.parent_company_id || NONE} onValueChange={handleParentChange}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-line">
                <SelectItem value={NONE}>None</SelectItem>
                {parentOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Website</Label>
            <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} placeholder="https://..." />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Address */}
        <div className="border-t border-line pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-faint text-xs font-medium uppercase tracking-wider">Address</p>
            <div className="flex items-center gap-2">
              {geocodeStatus && (
                <span className={`text-[10px] ${geocodeStatus.startsWith("✓") ? "text-success" : geocodeStatus.startsWith("⚠") ? "text-warning" : "text-faint"}`}>
                  {geocodeStatus}
                </span>
              )}
              <button
                type="button"
                onClick={handleGeocode}
                disabled={geocoding}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all disabled:opacity-50"
              >
                {geocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                {geocoding ? "Mapping..." : "Map location"}
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-muted text-xs mb-1.5">Address Line 1</Label>
              <Input
                value={form.address_line1}
                onChange={e => { setForm(f => ({ ...f, address_line1: e.target.value, lat: null, lng: null })); setGeocodeStatus(""); }}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">City</Label>
              <Input
                value={form.city}
                onChange={e => { setForm(f => ({ ...f, city: e.target.value, lat: null, lng: null })); setGeocodeStatus(""); }}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">County</Label>
              <Input
                value={form.county}
                onChange={e => { setForm(f => ({ ...f, county: e.target.value, lat: null, lng: null })); setGeocodeStatus(""); }}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Postcode</Label>
              <Input
                value={form.address_postcode}
                onChange={e => { setForm(f => ({ ...f, address_postcode: e.target.value, lat: null, lng: null })); setGeocodeStatus(""); }}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Country</Label>
              <Input
                value={form.address_country}
                onChange={e => setForm(f => ({ ...f, address_country: e.target.value }))}
                className={inputClass}
                placeholder="UK"
              />
            </div>
          </div>
          {form.lat && (
            <p className="text-success text-[10px] flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Mapped: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Region */}
        <div>
          <Label className="text-muted text-xs mb-1.5">Region</Label>
          <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} className={inputClass} placeholder="e.g. North West, London, Yorkshire" />
        </div>

        {/* Relationship Strength */}
        <div>
          <Label className="text-muted text-xs mb-1.5">Relationship Strength</Label>
          <Select value={form.relationship_strength} onValueChange={v => setForm(f => ({ ...f, relationship_strength: v }))}>
            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface-elevated border-line">
              {["Strong", "Growing", "New", "At Risk", "Dormant"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Destinations (reference-list driven, with strength) */}
        <div className="border-t border-line pt-4">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-muted text-xs font-bold uppercase tracking-wider">Destinations</p>
            <span className="text-[10px] text-faint italic">Which destinations does this company sell, and how strongly?</span>
          </div>
          <div className="space-y-2">
            {destinationOptions.map(destination => {
              const entry = form.destinations.find(d => d.destination === destination);
              return (
                <div key={destination} className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleDestination(destination)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      entry ? "bg-success/20 text-[#00804C] border-success/30" : "bg-canvas text-faint border-line hover:border-line-strong"
                    }`}
                  >
                    {destination}
                  </button>
                  {entry && (
                    <div className="flex gap-1 bg-canvas border border-line rounded-xl p-0.5">
                      {DESTINATION_STRENGTHS.map(strength => (
                        <button
                          key={strength}
                          type="button"
                          onClick={() => setDestinationStrength(destination, strength)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                            (entry.strength || "Core") === strength
                              ? "bg-primary text-white"
                              : "text-faint hover:text-ink"
                          }`}
                        >
                          {strength}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {destinationOptions.length === 0 && (
              <p className="text-faint text-xs">No destinations in the reference list yet — add them under Reference Lists.</p>
            )}
          </div>
        </div>

        {/* Specialisms (reference-list driven) */}
        <div>
          <Label className="text-muted text-xs mb-1.5">Specialisms</Label>
          <div className="flex flex-wrap gap-1.5">
            {specialismOptions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialism(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  form.specialisms.includes(s)
                    ? "bg-primary text-white border-transparent shadow-lg shadow-primary/20"
                    : "bg-canvas text-faint border-line hover:border-line-strong hover:text-ink"
                }`}
              >
                {s}
              </button>
            ))}
            {specialismOptions.length === 0 && (
              <p className="text-faint text-xs">No specialisms in the reference list yet.</p>
            )}
          </div>
        </div>

        {/* Key Destinations (legacy free-text) */}
        <div>
          <Label className="text-muted text-xs mb-1.5">Key Destinations (legacy)</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.key_destinations.map(d => (
              <span key={d} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                {d}
                <button type="button" onClick={() => removeDest(d)} className="hover:text-ink"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={destInput} onChange={e => setDestInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addDest(); }}} className={`${inputClass} flex-1`} placeholder="Add destination..." />
            <Button type="button" onClick={addDest} variant="ghost" className="text-primary text-xs">Add</Button>
          </div>
        </div>

        <div>
          <Label className="text-muted text-xs mb-1.5">Notes</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputClass} min-h-[80px]`} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-muted hover:text-ink">Cancel</Button>
          <Button type="submit" disabled={isLoading || geocoding} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6">
            {isLoading || geocoding ? "Saving..." : account ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
