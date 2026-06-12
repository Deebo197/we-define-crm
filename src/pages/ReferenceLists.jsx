import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ListChecks, Plus, Pencil, Check, X, ArrowUp, ArrowDown, EyeOff, Eye } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useReferenceItems } from "@/api/crm";

const inputClass =
  "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

const LIST_KEYS = [
  { key: "destination", label: "Destinations" },
  { key: "sector", label: "Sectors" },
  { key: "specialism", label: "Specialisms" },
  { key: "company_subtype", label: "Company sub-types" },
];

function ListEditor({ listKey, items }) {
  const queryClient = useQueryClient();
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [items]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["reference-items"] });

  const createMutation = useMutation({
    mutationFn: (value) =>
      base44.entities.ReferenceItem.create({
        list_key: listKey,
        value,
        sort_order: (sorted[sorted.length - 1]?.sort_order ?? 0) + 1,
        active: true,
      }),
    onSuccess: () => { invalidate(); setNewValue(""); },
    onError: () => toast.error("Couldn’t add the value"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReferenceItem.update(id, data),
    onSuccess: () => { invalidate(); setEditingId(null); },
    onError: () => toast.error("Couldn’t save the change"),
  });

  const swapMutation = useMutation({
    mutationFn: async ({ a, b }) => {
      // Swap sort_order values; fall back to indexes when orders collide.
      const aOrder = a.sort_order ?? 0;
      const bOrder = b.sort_order ?? 0;
      const [newA, newB] = aOrder === bOrder ? [bOrder + 1, aOrder] : [bOrder, aOrder];
      await base44.entities.ReferenceItem.update(a.id, { sort_order: newA });
      await base44.entities.ReferenceItem.update(b.id, { sort_order: newB });
    },
    onSuccess: invalidate,
    onError: () => toast.error("Couldn’t reorder"),
  });

  const addValue = () => {
    const v = newValue.trim();
    if (!v) return;
    if (sorted.some((i) => i.value.toLowerCase() === v.toLowerCase())) {
      toast.error(`“${v}” is already in this list`);
      return;
    }
    createMutation.mutate(v);
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
      <div className="space-y-1.5 mb-4">
        {sorted.length === 0 && <p className="text-faint text-sm">No values yet.</p>}
        {sorted.map((item, idx) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
              item.active === false ? "bg-canvas border-dashed border-line opacity-60" : "bg-canvas border-line"
            }`}
          >
            {editingId === item.id ? (
              <>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className={`${inputClass} h-8 text-sm flex-1`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editValue.trim()) {
                      updateMutation.mutate({ id: item.id, data: { value: editValue.trim() } });
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button
                  type="button"
                  disabled={!editValue.trim()}
                  onClick={() => updateMutation.mutate({ id: item.id, data: { value: editValue.trim() } })}
                  className="text-success hover:opacity-80 p-1"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="text-faint hover:text-ink p-1">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className={`flex-1 text-sm ${item.active === false ? "text-faint line-through" : "text-ink"}`}>
                  {item.value}
                </span>
                {item.active === false && (
                  <span className="text-[10px] text-faint px-1.5 py-0.5 rounded-full border border-line">inactive</span>
                )}
                <button
                  type="button"
                  disabled={idx === 0 || swapMutation.isPending}
                  onClick={() => swapMutation.mutate({ a: item, b: sorted[idx - 1] })}
                  className="text-faint hover:text-ink p-1 disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === sorted.length - 1 || swapMutation.isPending}
                  onClick={() => swapMutation.mutate({ a: item, b: sorted[idx + 1] })}
                  className="text-faint hover:text-ink p-1 disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingId(item.id); setEditValue(item.value); }}
                  className="text-faint hover:text-ink p-1"
                  title="Rename"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateMutation.mutate({ id: item.id, data: { active: item.active === false } })}
                  className="text-faint hover:text-ink p-1"
                  title={item.active === false ? "Reactivate" : "Deactivate"}
                >
                  {item.active === false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValue(); } }}
          className={`${inputClass} flex-1`}
          placeholder="Add a value…"
        />
        <Button
          type="button"
          onClick={addValue}
          disabled={!newValue.trim() || createMutation.isPending}
          className="bg-primary hover:bg-primary-hover text-white rounded-xl px-4 gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      <p className="text-faint text-[11px] mt-3">
        Deactivated values disappear from pickers but stay on existing records. Renames apply to pickers only —
        records keep the old text until edited.
      </p>
    </div>
  );
}

export default function ReferenceLists() {
  const { data: items = [], isLoading } = useReferenceItems();
  const [activeKey, setActiveKey] = useState(LIST_KEYS[0].key);

  const grouped = useMemo(() => {
    const map = {};
    LIST_KEYS.forEach(({ key }) => { map[key] = []; });
    items.forEach((i) => { (map[i.list_key] ??= []).push(i); });
    return map;
  }, [items]);

  return (
    <div>
      <PageHeader title="Reference Lists" subtitle="Values used by company and people pickers across the CRM" />

      <div className="flex gap-2 flex-wrap mb-5 animate-fade-in-up">
        {LIST_KEYS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveKey(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
              activeKey === key
                ? "bg-primary hover:bg-primary-hover text-white border-transparent shadow-lg shadow-primary/20"
                : "bg-canvas text-faint border-line hover:border-line-strong hover:text-ink"
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            {label}
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-black/[0.08]">
              {(grouped[key] || []).filter((i) => i.active !== false).length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <ListEditor key={activeKey} listKey={activeKey} items={grouped[activeKey] || []} />
      )}
    </div>
  );
}
