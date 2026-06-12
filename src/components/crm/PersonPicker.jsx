import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const inputClass =
  "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

/** Generic type-ahead over a list of { id, name, ...meta }. */
export default function PersonPicker({ items, placeholder, onPick, renderSub, autoFocus }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items.filter((i) => i.name?.toLowerCase().includes(q)).slice(0, 6);
  }, [items, query]);

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} pl-9`}
          autoFocus={autoFocus}
        />
      </div>
      {matches.length > 0 && (
        <div className="mt-1 border border-line rounded-xl overflow-hidden bg-surface-elevated divide-y divide-line">
          {matches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onPick(item);
                setQuery("");
              }}
              className="w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors"
            >
              <p className="text-ink text-sm">{item.name}</p>
              {renderSub && <p className="text-faint text-xs">{renderSub(item)}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
