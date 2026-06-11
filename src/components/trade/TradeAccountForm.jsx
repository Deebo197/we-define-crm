import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, MapPin, Loader2 } from "lucide-react";
import { geocodeAddress } from "@/lib/geocoding";

const inputClass = "bg-surface-secondary border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-lg focus:border-[#7F5BFF] focus:ring-[#7F5BFF]/20";
const NONE = "__none__";

export default function TradeAccountForm({ account, onSubmit, onCancel, isLoading }) {
  const { data: allAccounts = [] } = useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => listActiveTradeAccounts(),
  });

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(
    account?.lat ? "✓ Location mapped" : ""
  );

  const [form, setForm] = useState({
    name: account?.name ?? "",
    type: account?.type ?? "Tour Operator",
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
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-medium">{account ? "Edit Account" : "New Trade Account"}</h2>
        <button type="button" onClick={onCancel} className="text-[#6C6C80] hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Account Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} required placeholder="e.g. Kuoni" />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Type</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                {["Tour Operator", "Travel Agent", "Parent Company"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Parent Company</Label>
            <Select value={form.parent_company_id || NONE} onValueChange={handleParentChange}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/[0.06]">
                <SelectItem value={NONE}>None</SelectItem>
                {parentOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Website</Label>
            <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} placeholder="https://..." />
          </div>
          <div>
            <Label className="text-[#A1A1B5] text-xs mb-1.5">Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Address */}
        <div className="border-t border-white/[0.06] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[#6C6C80] text-xs font-medium uppercase tracking-wider">Address</p>
            <div className="flex items-center gap-2">
              {geocodeStatus && (
                <span className={`text-[10px] ${geocodeStatus.startsWith("✓") ? "text-[#3DDC97]" : geocodeStatus.startsWith("⚠") ? "text-[#FFB547]" : "text-[#6C6C80]"}`}>
                  {geocodeStatus}
                </span>
              )}
              <button
                type="button"
                onClick={handleGeocode}
                disabled={geocoding}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] text-[#7F5BFF] border border-[#7F5BFF]/20 bg-[#7F5BFF]/5 hover:bg-[#7F5BFF]/10 transition-all disabled:opacity-50"
              >
                {geocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                {geocoding ? "Mapping..." : "Map location"}
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-[#A1A1B5] text-xs mb-1.5">Address Line 1</Label>
              <Input
                value={form.address_line1}
                onChange={e => { setForm(f => ({ ...f, address_line1: e.target.value, lat: null, lng: null })); setGeocodeStatus(""); }}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-[#A1A1B5] text-xs mb-1.5">City</Label>
              <Input
                value={form.city}
                onChange={e => { setForm(f => ({ ...f, city: e.target.value, lat: null, lng: null })); setGeocodeStatus(""); }}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-[#A1A1B5] text-xs mb-1.5">County</Label>
              <Input
                value={form.county}
                onChange={e => { setForm(f => ({ ...f, county: e.target.value, lat: null, lng: null })); setGeocodeStatus(""); }}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-[#A1A1B5] text-xs mb-1.5">Postcode</Label>
              <Input
                value={form.address_postcode}
                onChange={e => { setForm(f => ({ ...f, address_postcode: e.target.value, lat: null, lng: null })); setGeocodeStatus(""); }}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-[#A1A1B5] text-xs mb-1.5">Country</Label>
              <Input
                value={form.address_country}
                onChange={e => setForm(f => ({ ...f, address_country: e.target.value }))}
                className={inputClass}
                placeholder="UK"
              />
            </div>
          </div>
          {form.lat && (
            <p className="text-[#3DDC97] text-[10px] flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Mapped: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Region */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Region</Label>
          <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} className={inputClass} placeholder="e.g. North West, London, Yorkshire" />
        </div>

        {/* Relationship Strength */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Relationship Strength</Label>
          <Select value={form.relationship_strength} onValueChange={v => setForm(f => ({ ...f, relationship_strength: v }))}>
            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface-elevated border-white/[0.06]">
              {["Strong", "Growing", "New", "At Risk", "Dormant"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Key Destinations */}
        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Key Destinations</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.key_destinations.map(d => (
              <span key={d} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[#7F5BFF]/10 text-[#7F5BFF] border border-[#7F5BFF]/20">
                {d}
                <button type="button" onClick={() => removeDest(d)} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={destInput} onChange={e => setDestInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addDest(); }}} className={`${inputClass} flex-1`} placeholder="Add destination..." />
            <Button type="button" onClick={addDest} variant="ghost" className="text-[#7F5BFF] text-xs">Add</Button>
          </div>
        </div>

        <div>
          <Label className="text-[#A1A1B5] text-xs mb-1.5">Notes</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputClass} min-h-[80px]`} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-[#A1A1B5] hover:text-white">Cancel</Button>
          <Button type="submit" disabled={isLoading || geocoding} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-6">
            {isLoading || geocoding ? "Saving..." : account ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
