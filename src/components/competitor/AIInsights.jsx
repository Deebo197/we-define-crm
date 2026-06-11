import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Lightbulb, Pencil, Check, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function EditableText({ value, onChange, multiline = true, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const save = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="text-sm min-h-[80px] bg-canvas"
            autoFocus
          />
        ) : (
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="text-sm" autoFocus />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={save} className="h-7 text-xs bg-primary hover:bg-primary-hover text-white">
            <Check className="h-3 w-3 mr-1" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative", className)}>
      <p className="text-sm leading-relaxed text-muted pr-8">{value}</p>
      <button
        onClick={() => setEditing(true)}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/[0.04]"
      >
        <Pencil className="h-3 w-3 text-faint" />
      </button>
    </div>
  );
}

function EditableList({ items, onChange, bulletColor }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [draft, setDraft] = useState('');

  const startEdit = (i) => { setEditingIdx(i); setDraft(items[i]); };
  const save = (i) => {
    const updated = [...items];
    updated[i] = draft;
    onChange(updated);
    setEditingIdx(null);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => {
    onChange([...items, 'New item — click to edit']);
    setTimeout(() => startEdit(items.length), 0);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="group flex gap-2 items-start">
          <span className={cn("flex-shrink-0 mt-0.5", bulletColor)}>•</span>
          {editingIdx === i ? (
            <div className="flex-1 space-y-1">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="text-sm min-h-[60px] bg-canvas"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => save(i)} className="h-6 text-xs bg-primary hover:bg-primary-hover text-white">
                  <Check className="h-3 w-3 mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingIdx(null)} className="h-6 text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-start justify-between gap-2">
              <p className="text-sm text-muted flex-1">{item}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => startEdit(i)} className="p-1 rounded hover:bg-black/[0.04]">
                  <Pencil className="h-3 w-3 text-faint" />
                </button>
                <button onClick={() => remove(i)} className="p-1 rounded hover:bg-black/[0.04]">
                  <Trash2 className="h-3 w-3 text-danger" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors mt-1"
      >
        <Plus className="h-3 w-3" /> Add item
      </button>
    </div>
  );
}

export default function AIInsights({ report, onReportChange }) {
  if (!report) return null;

  const update = (key, value) => onReportChange({ ...report, [key]: value });

  return (
    <div className="space-y-6" id="ai-insights-section">
      {/* Overview */}
      <div className="bg-surface rounded-2xl shadow-card border border-line p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-ink">Overview</h2>
          <span className="text-[10px] text-faint ml-auto">Hover to edit</span>
        </div>
        <EditableText value={report.overview} onChange={(v) => update('overview', v)} />
      </div>

      {/* Client Analysis */}
      {report.client_analysis?.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Client Hotel Analysis</h2>
          {report.client_analysis.map((ca, i) => (
            <div key={i} className="bg-surface rounded-2xl shadow-card border border-line p-5">
              <h3 className="font-semibold text-primary mb-3">{ca.hotel}</h3>
              <EditableText
                value={ca.analysis}
                onChange={(v) => {
                  const updated = [...report.client_analysis];
                  updated[i] = { ...updated[i], analysis: v };
                  update('client_analysis', updated);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Operator Insights */}
      {report.operator_insights && (
        <div className="bg-surface rounded-2xl shadow-card border border-line p-6">
          <h2 className="text-lg font-semibold text-ink mb-3">Operator Insights</h2>
          <EditableText value={report.operator_insights} onChange={(v) => update('operator_insights', v)} />
        </div>
      )}

      {/* Opportunities & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.opportunities && (
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-4 w-4 text-success" />
              <h3 className="font-semibold text-sm text-ink">Opportunities</h3>
            </div>
            <EditableList
              items={report.opportunities}
              onChange={(v) => update('opportunities', v)}
              bulletColor="text-success"
            />
          </div>
        )}

        {report.risks && (
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="font-semibold text-sm text-ink">Risks</h3>
            </div>
            <EditableList
              items={report.risks}
              onChange={(v) => update('risks', v)}
              bulletColor="text-warning"
            />
          </div>
        )}
      </div>
    </div>
  );
}
