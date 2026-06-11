import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, X } from "lucide-react";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

// Adapted from InteractionFormContent's ContactPicker: never renders the full
// 2,000+ contact cache. Quick-pick chips for the selected company's contacts,
// plus a type-ahead search (2+ chars, max 8 results) over the cached list.
export default function EventContactPicker({ contacts, companyName, companyId, contactIds, contactNames, onAdd, onRemove }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Contacts at the selected company: prefer company_id, fall back to name match
  const companyContacts = useMemo(() => {
    if (companyId) {
      const byId = contacts.filter(c => c.company_id === companyId);
      if (byId.length > 0) return byId;
    }
    const cn = (companyName || "").trim().toLowerCase();
    if (!cn) return [];
    return contacts.filter(c => (c.company_name || "").trim().toLowerCase() === cn);
  }, [contacts, companyId, companyName]);

  const quickPicks = companyContacts.filter(c => !contactIds.includes(c.id)).slice(0, 20);

  const q = query.trim().toLowerCase();
  const searchMatches = q.length >= 2
    ? contacts
        .filter(c => !contactIds.includes(c.id))
        .filter(c => c.name?.toLowerCase().includes(q))
        .slice(0, 8)
    : [];

  const selected = contactIds.map((id, i) => {
    const c = contacts.find(x => x.id === id);
    return { id, name: c?.name || contactNames[i] || "Unknown contact", company: c?.company_name || "" };
  });

  const cn = (companyName || "").trim().toLowerCase();

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(p => (
            <span key={p.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl text-xs font-medium bg-success/15 text-success border border-success/30 max-w-full">
              <span className="truncate">{p.name}</span>
              {p.company && p.company.trim().toLowerCase() !== cn && (
                <span className="text-success/70 text-[10px] truncate">· {p.company}</span>
              )}
              <button type="button" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`}
                className="rounded-full p-0.5 hover:bg-success/20 transition-colors shrink-0">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {quickPicks.length > 0 && (
        <div>
          <p className="text-faint text-[11px] mb-1.5">Contacts at {companyName}</p>
          <div className="flex flex-wrap gap-1.5">
            {quickPicks.map(c => (
              <button key={c.id} type="button" onClick={() => onAdd(c)}
                className="px-2.5 py-1 rounded-xl text-xs font-medium border bg-canvas text-muted border-line hover:border-success/40 hover:text-success transition-all">
                + {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={searchRef} className="relative">
        <Search className="w-3.5 h-3.5 text-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search all contacts…"
          autoComplete="off"
          className={`${inputClass} pl-8 h-9 text-sm`}
        />
        {open && q.length >= 2 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface border border-line rounded-xl shadow-xl overflow-hidden">
            {searchMatches.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-faint">No contacts match “{query}”</p>
            ) : (
              searchMatches.map(c => (
                <button key={c.id} type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onAdd(c); setQuery(""); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/[0.03] transition-colors group">
                  <User className="w-3.5 h-3.5 text-faint shrink-0" />
                  <span className="text-ink text-sm group-hover:text-primary transition-colors truncate">{c.name}</span>
                  {c.company_name && (
                    <span className="text-faint text-[10px] bg-canvas px-2 py-0.5 rounded-full ml-auto shrink-0 max-w-[140px] truncate">{c.company_name}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {q.length > 0 && q.length < 2 && (
        <p className="text-faint text-[11px]">Type 2+ letters to search contacts</p>
      )}
    </div>
  );
}
