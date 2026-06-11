import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, X } from "lucide-react";
import EventContactPicker from "./EventContactPicker";
import { ITEM_KINDS, KIND_META, addressFromAccount, formatDay } from "./eventUtils";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

// Full-screen overlay editor for one itinerary item. Edits a local copy and
// only commits on "Done" via onSave.
export default function ItemEditor({ item, days, isNew, contacts, tradeAccounts, venues, onSave, onDelete, onCancel }) {
  const [draft, setDraft] = useState({ ...item });
  const [companyOpen, setCompanyOpen] = useState(false);
  const companyRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const set = (patch) => setDraft(prev => ({ ...prev, ...patch }));

  const isMeeting = draft.kind === "Meeting";
  const isVenueKind = draft.kind === "Dinner" || draft.kind === "Evening Event";

  // Company type-ahead over active trade accounts (Meetings)
  const companyQ = (draft.company_name || "").toLowerCase().trim();
  const companySuggestions = companyQ
    ? tradeAccounts.filter(a => a.name?.toLowerCase().includes(companyQ)).slice(0, 8)
    : [];

  const selectCompany = (account) => {
    // Auto-fill the venue address from the TradeAccount record
    const addr = addressFromAccount(account);
    set({
      company_id: account.id,
      company_name: account.name,
      title: draft.title || `Meeting with ${account.name}`,
      ...addr,
    });
    setCompanyOpen(false);
  };

  const selectVenue = (name) => {
    const match = venues.find(v => v.name.toLowerCase() === (name || "").trim().toLowerCase());
    if (!match) { set({ venue_name: name }); return; }
    // Known venue: fill any empty address fields from the last use
    set({
      venue_name: match.name,
      address: draft.address || match.address,
      city: draft.city || match.city,
      postcode: draft.postcode || match.postcode,
    });
  };

  const addContact = (contact) => {
    setDraft(prev => prev.contact_ids?.includes(contact.id) ? prev : {
      ...prev,
      contact_ids: [...(prev.contact_ids || []), contact.id],
      contact_names: [...(prev.contact_names || []), contact.name],
    });
  };

  const removeContact = (contactId) => {
    setDraft(prev => {
      const idx = (prev.contact_ids || []).indexOf(contactId);
      if (idx === -1) return prev;
      return {
        ...prev,
        contact_ids: prev.contact_ids.filter(id => id !== contactId),
        contact_names: prev.contact_names.filter((_, i) => i !== idx),
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6 overflow-y-auto">
      <div className="bg-surface sm:rounded-2xl shadow-2xl border border-line w-full max-w-2xl my-0 sm:my-8 max-h-screen sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <h3 className="text-ink font-semibold text-sm">{isNew ? "Add itinerary item" : "Edit itinerary item"}</h3>
          <button type="button" onClick={onCancel} className="text-faint hover:text-ink transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {/* Kind */}
          <div>
            <Label className="text-muted text-xs mb-1.5 block">What is it?</Label>
            <div className="flex flex-wrap gap-1.5">
              {ITEM_KINDS.map(k => {
                const Icon = KIND_META[k].icon;
                return (
                  <button key={k} type="button" onClick={() => set({ kind: k })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      draft.kind === k
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-canvas text-faint border-line hover:border-line-strong"
                    }`}>
                    <Icon className="w-3.5 h-3.5" /> {k}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day + times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-muted text-xs mb-1.5">Day</Label>
              <select value={draft.date || ""} onChange={(e) => set({ date: e.target.value })}
                className={`${inputClass} w-full h-10 px-3 text-sm border rounded-lg`}>
                {!days.includes(draft.date) && <option value={draft.date || ""}>{draft.date ? formatDay(draft.date, "EEE d MMM") : "Pick a day"}</option>}
                {days.map((d, i) => (
                  <option key={d} value={d}>Day {i + 1} — {formatDay(d, "EEE d MMM")}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Start</Label>
              <Input type="time" value={draft.start_time || ""} onChange={(e) => set({ start_time: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">End</Label>
              <Input type="time" value={draft.end_time || ""} onChange={(e) => set({ end_time: e.target.value })} className={inputClass} />
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="text-muted text-xs mb-1.5">Title</Label>
            <Input value={draft.title || ""} onChange={(e) => set({ title: e.target.value })} className={inputClass}
              placeholder={isMeeting ? "e.g. Product update meeting" : isVenueKind ? "e.g. Client dinner" : "e.g. Transfer to London"} />
          </div>

          {/* Where: company (Meetings) or venue (everything else) */}
          {isMeeting ? (
            <div ref={companyRef} className="relative">
              <Label className="text-muted text-xs mb-1.5">Company (trade account)</Label>
              <Input
                value={draft.company_name || ""}
                onChange={(e) => { set({ company_name: e.target.value, company_id: "" }); setCompanyOpen(true); }}
                onFocus={() => setCompanyOpen(true)}
                className={inputClass}
                placeholder="e.g. Kuoni, Audley Travel…"
                autoComplete="off"
              />
              {companyOpen && companySuggestions.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface border border-line rounded-xl shadow-xl overflow-hidden">
                  {companySuggestions.map(a => (
                    <button key={a.id} type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCompany(a)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-black/[0.03] transition-colors group">
                      <span className="text-ink text-sm group-hover:text-primary transition-colors truncate">{a.name}</span>
                      <span className="text-faint text-[10px] bg-canvas px-2 py-0.5 rounded-full shrink-0">
                        {[a.city, a.address_postcode].filter(Boolean).join(", ") || a.type || "Trade Account"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-faint text-[11px] mt-1.5">Picking a company auto-fills the address from the trade account.</p>
            </div>
          ) : (
            <div>
              <Label className="text-muted text-xs mb-1.5">Venue</Label>
              <Input
                value={draft.venue_name || ""}
                onChange={(e) => selectVenue(e.target.value)}
                className={inputClass}
                placeholder="e.g. The Ivy, Hutong at The Shard…"
                list="event-venue-suggestions"
                autoComplete="off"
              />
              <datalist id="event-venue-suggestions">
                {venues.map(v => <option key={v.name} value={v.name} />)}
              </datalist>
              {venues.length > 0 && (
                <p className="text-faint text-[11px] mt-1.5">Previously used venues appear as suggestions and fill in their address.</p>
              )}
            </div>
          )}

          {/* Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-muted text-xs mb-1.5">Address</Label>
              <Input value={draft.address || ""} onChange={(e) => set({ address: e.target.value })} className={inputClass} placeholder="Street address" />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">City</Label>
              <Input value={draft.city || ""} onChange={(e) => set({ city: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Postcode</Label>
              <Input value={draft.postcode || ""} onChange={(e) => set({ postcode: e.target.value })} className={inputClass} />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <Label className="text-muted text-xs mb-1.5 block">Attendees</Label>
            <EventContactPicker
              contacts={contacts}
              companyName={draft.company_name}
              companyId={draft.company_id}
              contactIds={draft.contact_ids || []}
              contactNames={draft.contact_names || []}
              onAdd={addContact}
              onRemove={removeContact}
            />
          </div>

          {/* Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4">
            <div>
              <Label className="text-muted text-xs mb-1.5">Cost (£)</Label>
              <Input type="number" min="0" step="0.01" value={draft.cost ?? ""}
                onChange={(e) => set({ cost: e.target.value === "" ? "" : Number(e.target.value) })}
                className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Cost notes</Label>
              <Input value={draft.cost_notes || ""} onChange={(e) => set({ cost_notes: e.target.value })} className={inputClass} placeholder="e.g. estimate, deposit paid…" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-muted text-xs mb-1.5">Notes <span className="text-faint">(client-facing — appears on the itinerary)</span></Label>
            <Textarea value={draft.notes || ""} onChange={(e) => set({ notes: e.target.value })} className={`${inputClass} min-h-[64px] text-sm`} />
          </div>
          <div>
            <Label className="text-muted text-xs mb-1.5">Internal notes <span className="text-faint">(never shared)</span></Label>
            <Textarea value={draft.internal_notes || ""} onChange={(e) => set({ internal_notes: e.target.value })} className={`${inputClass} min-h-[64px] text-sm`} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-line shrink-0">
          {!isNew ? (
            <button type="button" onClick={onDelete}
              className="inline-flex items-center gap-1.5 text-xs text-faint hover:text-danger transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Remove item
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-faint hover:text-ink transition-colors">Cancel</button>
            <Button type="button" onClick={() => onSave(draft)} className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6 h-9 text-sm">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
