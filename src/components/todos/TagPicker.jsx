import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Building2, User, Tag, Search } from "lucide-react";

// Compact popover to tag a to-do with clients and contacts.
// Clients are listed (small list); contacts are type-ahead searched —
// there are 2,000+ of them, so we only show matches once you type.
export default function TagPicker({
  clients = [],
  contacts = [],
  excludeClientIds = [],
  excludeContactIds = [],
  onPickClient,
  onPickContact,
  trigger,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const clientMatches = clients
    .filter((c) => !excludeClientIds.includes(c.id))
    .filter((c) => !q || c.name?.toLowerCase().includes(q));

  const contactMatches =
    q.length >= 2
      ? contacts
          .filter((c) => !excludeContactIds.includes(c.id))
          .filter((c) => c.name?.toLowerCase().includes(q))
          .slice(0, 8)
      : [];

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <PopoverTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="p-1.5 rounded-lg text-faint hover:text-primary hover:bg-primary-soft transition-colors"
            title="Tag client or contact"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0 bg-surface border-line rounded-xl shadow-card">
        <div className="p-2 border-b border-line">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients & contacts…"
              className="pl-8 h-8 text-sm bg-canvas border-line text-ink placeholder:text-faint rounded-lg"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto p-1.5">
          {clientMatches.length > 0 && (
            <>
              <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                Clients
              </p>
              {clientMatches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onPickClient(c)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm text-ink hover:bg-primary-soft transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-faint flex-shrink-0" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </>
          )}

          {q.length >= 2 && (
            <>
              <p className="px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                Contacts
              </p>
              {contactMatches.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-faint">No contacts match “{query}”</p>
              ) : (
                contactMatches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onPickContact(c)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm text-ink hover:bg-primary-soft transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-faint flex-shrink-0" />
                    <span className="truncate">{c.name}</span>
                    {c.company_name && (
                      <span className="text-faint text-xs truncate ml-auto flex-shrink-0 max-w-[100px]">
                        {c.company_name}
                      </span>
                    )}
                  </button>
                ))
              )}
            </>
          )}

          {q.length < 2 && (
            <p className="px-2 py-2 text-[11px] text-faint">
              Type 2+ letters to search contacts
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
