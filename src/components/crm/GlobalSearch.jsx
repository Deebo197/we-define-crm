import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, User, X } from "lucide-react";
import { useCompanies, usePeople } from "@/api/crm";
import { useAuth } from "@/lib/AuthContext";
import { navGroups } from "@/components/layout/navGroups";

const OPEN_EVENT = "repevo:open-global-search";

export function openGlobalSearch() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

/** Compact trigger for the sidebar / mobile header. */
export function GlobalSearchTrigger({ collapsed = false }) {
  return (
    <button
      type="button"
      onClick={openGlobalSearch}
      className={`flex items-center gap-2 rounded-xl border border-line bg-canvas text-faint hover:text-ink hover:border-line-strong transition-all text-sm ${
        collapsed ? "p-2.5 justify-center w-full" : "px-3 py-2 w-full"
      }`}
      title="Search companies and people (⌘K)"
    >
      <Search className="w-4 h-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left text-xs">Search…</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-line bg-surface text-faint">⌘K</kbd>
        </>
      )}
    </button>
  );
}

/**
 * Single global search dialog — mount once (AppLayout). Opens on ⌘/Ctrl-K or
 * via openGlobalSearch(). Type-ahead over the cached companies + people lists,
 * max 8 results grouped by kind.
 */
export default function GlobalSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { data: companies = [] } = useCompanies();
  const { data: people = [] } = usePeople();
  const { user, isLoadingAuth } = useAuth();
  const isAdmin = user?.role === "admin";

  // Flat list of navigable pages, e.g. "Submit Expense" (Expenses)
  const pages = useMemo(
    () =>
      navGroups.flatMap((group) =>
        group.items
          .filter((item) => !item.soon && (!item.adminOnly || isAdmin || isLoadingAuth))
          .map((item) => ({
            kind: "page",
            id: item.path,
            label: item.label,
            sub: group.label,
            path: item.path,
            icon: item.icon,
          }))
      ),
    [isAdmin, isLoadingAuth]
  );

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const pageHits = pages
      .filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.sub.toLowerCase().includes(q)
      )
      .slice(0, 3);
    const companyHits = companies
      .filter((c) => c.name?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((c) => ({
        kind: "company",
        id: c.id,
        label: c.name,
        sub: c.type || "Company",
        path: `/trade-accounts/${c.id}`,
      }));
    const peopleHits = people
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.company_name?.toLowerCase().includes(q)
      )
      .slice(0, 8 - Math.min(companyHits.length, 4))
      .map((p) => ({
        kind: "person",
        id: p.id,
        label: p.name,
        sub: p.company_name || "No company",
        path: `/contacts/${p.id}`,
      }));
    return [...pageHits, ...companyHits, ...peopleHits].slice(0, 10);
  }, [query, companies, people, pages]);

  useEffect(() => setHighlight(0), [query]);

  const go = (item) => {
    setOpen(false);
    navigate(item.path);
  };

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && results[highlight]) {
      go(results[highlight]);
    }
  };

  if (!open) return null;

  const grouped = [
    { label: "Pages", items: results.filter((r) => r.kind === "page") },
    { label: "Companies", items: results.filter((r) => r.kind === "company") },
    { label: "People", items: results.filter((r) => r.kind === "person") },
  ].filter((g) => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="bg-surface rounded-2xl border border-line shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <Search className="w-4 h-4 text-faint shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search pages, companies and people…"
            className="flex-1 h-12 bg-transparent text-ink text-sm placeholder:text-faint outline-none"
          />
          <button type="button" onClick={() => setOpen(false)} className="text-faint hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <p className="text-faint text-sm px-4 py-6 text-center">No pages, companies or people match “{query}”</p>
          )}
          {!query.trim() && (
            <p className="text-faint text-xs px-4 py-5 text-center">Start typing to jump to a page or find companies and people</p>
          )}
          {grouped.map((group) => (
            <div key={group.label} className="py-2">
              <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-faint">{group.label}</p>
              {group.items.map((item) => {
                const idx = results.indexOf(item);
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    onClick={() => go(item)}
                    onMouseEnter={() => setHighlight(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === highlight ? "bg-primary-soft" : "hover:bg-black/[0.03]"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-canvas border border-line flex items-center justify-center shrink-0">
                      {item.kind === "page" ? (
                        <item.icon className="w-3.5 h-3.5 text-primary" />
                      ) : item.kind === "company" ? (
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-ink text-sm font-medium truncate">{item.label}</p>
                      <p className="text-faint text-xs truncate">{item.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
