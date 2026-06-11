import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  CalendarDays, Building2, User, X, Trash2, ChevronUp, ChevronDown
} from "lucide-react";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import TagPicker from "@/components/todos/TagPicker";

function TagPill({ icon: Icon, label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[11px] bg-canvas border border-line text-muted max-w-[160px]">
      <Icon className="w-3 h-3 text-faint flex-shrink-0" />
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 rounded-full text-faint hover:text-danger transition-colors"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      ) : (
        <span className="w-1" />
      )}
    </span>
  );
}

// One to-do row: checkbox, inline-editable title, due date, client/contact
// tags, and hover affordances for reordering and deleting.
export default function TodoItem({
  todo,
  canEdit,
  canMoveUp,
  canMoveDown,
  onToggle,
  onUpdate,
  onDelete,
  onMove,
  clients,
  contacts,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [dueOpen, setDueOpen] = useState(false);

  const overdue =
    !todo.done &&
    todo.due_date &&
    isBefore(parseISO(todo.due_date), startOfDay(new Date()));

  const commitTitle = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== todo.title) onUpdate({ title: next });
    else setDraft(todo.title);
  };

  const removeFromList = (idsKey, namesKey, id) => {
    const ids = todo[idsKey] || [];
    const names = todo[namesKey] || [];
    const idx = ids.indexOf(id);
    if (idx === -1) return;
    onUpdate({
      [idsKey]: ids.filter((_, i) => i !== idx),
      [namesKey]: names.filter((_, i) => i !== idx),
    });
  };

  const addClient = (client) => {
    if ((todo.client_ids || []).includes(client.id)) return;
    onUpdate({
      client_ids: [...(todo.client_ids || []), client.id],
      client_names: [...(todo.client_names || []), client.name],
    });
  };

  const addContact = (contact) => {
    if ((todo.contact_ids || []).includes(contact.id)) return;
    onUpdate({
      contact_ids: [...(todo.contact_ids || []), contact.id],
      contact_names: [...(todo.contact_names || []), contact.name],
    });
  };

  const clientTags = (todo.client_ids || []).map((id, i) => ({
    id,
    name: (todo.client_names || [])[i] || "Client",
  }));
  const contactTags = (todo.contact_ids || []).map((id, i) => ({
    id,
    name: (todo.contact_names || [])[i] || "Contact",
  }));

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 border-b border-line last:border-b-0 hover:bg-canvas/60 transition-colors ${
        todo.done ? "opacity-50" : ""
      }`}
    >
      <Checkbox
        checked={!!todo.done}
        onCheckedChange={() => canEdit && onToggle()}
        disabled={!canEdit}
        className="mt-0.5 rounded-md border-line-strong data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />

      <div className="flex-1 min-w-0">
        {/* Title */}
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setDraft(todo.title); setEditing(false); }
            }}
            className="w-full bg-transparent text-sm text-ink border-b border-primary/40 outline-none pb-0.5"
          />
        ) : (
          <p
            onClick={() => canEdit && !todo.done && (setDraft(todo.title), setEditing(true))}
            className={`text-sm text-ink ${todo.done ? "line-through" : ""} ${
              canEdit && !todo.done ? "cursor-text" : ""
            }`}
          >
            {todo.title}
          </p>
        )}

        {/* Meta row: due date + tags */}
        {(todo.due_date || clientTags.length > 0 || contactTags.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {todo.due_date && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                  overdue ? "text-danger" : "text-faint"
                }`}
              >
                <CalendarDays className="w-3 h-3" />
                {format(parseISO(todo.due_date), "d MMM")}
                {overdue && " · overdue"}
              </span>
            )}
            {clientTags.map((t) => (
              <TagPill
                key={`c-${t.id}`}
                icon={Building2}
                label={t.name}
                onRemove={canEdit ? () => removeFromList("client_ids", "client_names", t.id) : null}
              />
            ))}
            {contactTags.map((t) => (
              <TagPill
                key={`p-${t.id}`}
                icon={User}
                label={t.name}
                onRemove={canEdit ? () => removeFromList("contact_ids", "contact_names", t.id) : null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {canEdit && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
          {/* Due date */}
          <Popover open={dueOpen} onOpenChange={setDueOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-faint hover:text-primary hover:bg-primary-soft transition-colors"
                title="Set due date"
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-3 bg-surface border-line rounded-xl shadow-card">
              <input
                type="date"
                value={todo.due_date || ""}
                onChange={(e) => { onUpdate({ due_date: e.target.value || null }); setDueOpen(false); }}
                className="bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-sm text-ink"
              />
              {todo.due_date && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 h-7 text-xs text-muted hover:text-danger"
                  onClick={() => { onUpdate({ due_date: null }); setDueOpen(false); }}
                >
                  Clear date
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Tags */}
          <TagPicker
            clients={clients}
            contacts={contacts}
            excludeClientIds={todo.client_ids || []}
            excludeContactIds={todo.contact_ids || []}
            onPickClient={addClient}
            onPickContact={addContact}
          />

          {/* Reorder */}
          {!todo.done && (
            <div className="flex flex-col -my-1">
              <button
                type="button"
                onClick={() => onMove(-1)}
                disabled={!canMoveUp}
                className="p-0.5 rounded text-faint hover:text-ink disabled:opacity-30 transition-colors"
                title="Move up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                disabled={!canMoveDown}
                className="p-0.5 rounded text-faint hover:text-ink disabled:opacity-30 transition-colors"
                title="Move down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-faint hover:text-danger hover:bg-danger/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
