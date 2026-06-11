import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/ui/PageHeader";
import ShimmerCard from "@/components/ui/ShimmerCard";
import EmptyState from "@/components/ui/EmptyState";
import TodoItem from "@/components/todos/TodoItem";
import TagPicker from "@/components/todos/TagPicker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListTodo, Plus, ChevronDown, ChevronRight, X, User } from "lucide-react";
import { emailsMatch } from "@/components/team/teamUtils";
import { toast } from "sonner";

const TODOS_KEY = ["team-todos"];

export default function Todos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [selectedEmail, setSelectedEmail] = useState(null); // null = me
  const [newTitle, setNewTitle] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All | Open | Done
  const [clientFilter, setClientFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState(null); // { id, name }
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: todos = [], isLoading: loadingTodos } = useQuery({
    queryKey: TODOS_KEY,
    queryFn: () => base44.entities.TeamTodo.list("sort_order", 1000),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.list("created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });

  // Contacts cached once for type-ahead (2,000+ records, searched client-side).
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("-created_date"),
    staleTime: 10 * 60 * 1000,
  });

  const activeMembers = useMemo(
    () => members.filter((m) => m.status !== "Inactive" && m.email),
    [members]
  );

  const taggableClients = useMemo(
    () =>
      clients
        .filter((c) => !c.is_internal)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [clients]
  );

  const viewedEmail = selectedEmail || user?.email || "";
  const viewedMember = activeMembers.find((m) => emailsMatch(m.email, viewedEmail));
  const isOwnList = emailsMatch(viewedEmail, user?.email);
  const canEdit = isOwnList || isAdmin;

  // ── This member's to-dos ────────────────────────────────────────────────
  const ownerTodos = useMemo(
    () => todos.filter((t) => emailsMatch(t.owner_email, viewedEmail)),
    [todos, viewedEmail]
  );

  const sortOrderAsc = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
  const openTodos = useMemo(
    () => ownerTodos.filter((t) => !t.done).sort(sortOrderAsc),
    [ownerTodos]
  );
  const doneTodos = useMemo(
    () =>
      ownerTodos
        .filter((t) => t.done)
        .sort((a, b) => (b.updated_date || "").localeCompare(a.updated_date || "")),
    [ownerTodos]
  );

  // Clients in use across this member's to-dos (for the filter dropdown).
  const clientsInUse = useMemo(() => {
    const map = new Map();
    ownerTodos.forEach((t) =>
      (t.client_ids || []).forEach((id, i) => {
        if (!map.has(id)) map.set(id, (t.client_names || [])[i] || "Client");
      })
    );
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ownerTodos]);

  const matchesFilters = (t) => {
    if (clientFilter !== "all" && !(t.client_ids || []).includes(clientFilter)) return false;
    if (contactFilter && !(t.contact_ids || []).includes(contactFilter.id)) return false;
    return true;
  };

  const visibleOpen = openTodos.filter(matchesFilters);
  const visibleDone = doneTodos.filter(matchesFilters);

  // ── Mutations ───────────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: TODOS_KEY });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamTodo.create(data),
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message || "Failed to add to-do"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamTodo.update(id, data),
    // Optimistic so checkboxes and edits feel instant.
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const previous = queryClient.getQueryData(TODOS_KEY);
      queryClient.setQueryData(TODOS_KEY, (old = []) =>
        old.map((t) => (t.id === id ? { ...t, ...data } : t))
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(TODOS_KEY, ctx.previous);
      toast.error(err.message || "Failed to update to-do");
    },
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamTodo.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const previous = queryClient.getQueryData(TODOS_KEY);
      queryClient.setQueryData(TODOS_KEY, (old = []) => old.filter((t) => t.id !== id));
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(TODOS_KEY, ctx.previous);
      toast.error(err.message || "Failed to delete to-do");
    },
    onSettled: invalidate,
  });

  const addTodo = () => {
    const title = newTitle.trim();
    if (!title || !canEdit) return;
    const minSort = openTodos.length ? Math.min(...openTodos.map((t) => t.sort_order ?? 0)) : 0;
    createMutation.mutate({
      title,
      done: false,
      owner_email: viewedEmail,
      owner_name: viewedMember?.full_name || (isOwnList ? user?.full_name : "") || "",
      sort_order: minSort - 10,
    });
    setNewTitle("");
  };

  // Reorder: swap positions in the open list, renormalise sort_order to
  // multiples of 10 and write back only the records that changed.
  const moveTodo = (todo, dir) => {
    const idx = openTodos.findIndex((t) => t.id === todo.id);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= openTodos.length) return;
    const reordered = [...openTodos];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    reordered.forEach((t, i) => {
      const next = i * 10;
      if ((t.sort_order ?? 0) !== next) {
        updateMutation.mutate({ id: t.id, data: { sort_order: next } });
      }
    });
  };

  const colourOf = (member) => member?.calendar_colour || "#C4C7D4";

  return (
    <div>
      <PageHeader title="To-dos" subtitle="Simple personal checklists for the team" />

      {/* Member switcher */}
      <div className="flex flex-wrap gap-2 mb-5">
        {activeMembers.map((m) => {
          const isSelected = emailsMatch(m.email, viewedEmail);
          const mine = emailsMatch(m.email, user?.email);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedEmail(mine ? null : m.email)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isSelected
                  ? "bg-primary-soft text-primary border-primary/30"
                  : "bg-surface text-muted border-line hover:text-ink hover:border-line-strong"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: colourOf(m) }}
              />
              {m.full_name}
              {mine && <span className="text-[10px] text-faint font-normal">(me)</span>}
            </button>
          );
        })}
      </div>

      {/* Add input */}
      {canEdit && (
        <div className="relative mb-4">
          <Plus className="w-4 h-4 text-faint absolute left-4 top-1/2 -translate-y-1/2" />
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder={isOwnList ? "Add a to-do…" : `Add a to-do for ${viewedMember?.full_name || "this member"}…`}
            className="pl-10 h-11 bg-surface border-line text-ink placeholder:text-faint rounded-xl shadow-card focus:border-primary"
          />
        </div>
      )}

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1.5">
          {["All", "Open", "Done"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f
                  ? "bg-primary text-white"
                  : "bg-surface border border-line text-muted hover:text-ink"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {clientsInUse.length > 0 && (
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-auto min-w-[140px] h-8 text-xs bg-surface border-line text-muted rounded-full px-3">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-line">
              <SelectItem value="all">All clients</SelectItem>
              {clientsInUse.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {contactFilter ? (
          <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-medium bg-primary-soft text-primary">
            <User className="w-3 h-3" />
            {contactFilter.name}
            <button
              type="button"
              onClick={() => setContactFilter(null)}
              className="p-0.5 rounded-full hover:bg-primary/10"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ) : (
          <TagPicker
            clients={[]}
            contacts={contacts}
            onPickClient={() => {}}
            onPickContact={(c) => setContactFilter({ id: c.id, name: c.name })}
            trigger={
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface border border-line text-muted hover:text-ink transition-colors"
              >
                Filter by contact…
              </button>
            }
          />
        )}
      </div>

      {/* List */}
      {loadingTodos ? (
        <ShimmerCard count={3} />
      ) : ownerTodos.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={isOwnList ? "Nothing on your list" : `${viewedMember?.full_name || "This member"} has no to-dos`}
          description={
            canEdit
              ? "Add your first to-do above — keep it light and tick things off as you go."
              : "Their list is empty right now."
          }
        />
      ) : (
        <>
          {/* Open items */}
          {statusFilter !== "Done" && (
            visibleOpen.length === 0 ? (
              <div className="bg-surface rounded-2xl shadow-card border border-line px-4 py-6 text-center text-sm text-faint mb-4">
                {openTodos.length === 0 ? "All done — nothing open." : "No open to-dos match the filters."}
              </div>
            ) : (
              <div className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden mb-4">
                {visibleOpen.map((todo) => {
                  const idx = openTodos.findIndex((t) => t.id === todo.id);
                  return (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      canEdit={canEdit}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < openTodos.length - 1}
                      onToggle={() => updateMutation.mutate({ id: todo.id, data: { done: !todo.done } })}
                      onUpdate={(data) => updateMutation.mutate({ id: todo.id, data })}
                      onDelete={() => deleteMutation.mutate(todo.id)}
                      onMove={(dir) => moveTodo(todo, dir)}
                      clients={taggableClients}
                      contacts={contacts}
                    />
                  );
                })}
              </div>
            )
          )}

          {/* Completed section */}
          {statusFilter !== "Open" && visibleDone.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-1.5 px-1 py-2 text-xs font-semibold uppercase tracking-wider text-faint hover:text-muted transition-colors"
              >
                {showCompleted || statusFilter === "Done" ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                Completed ({visibleDone.length})
              </button>
              {(showCompleted || statusFilter === "Done") && (
                <div className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden">
                  {visibleDone.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      canEdit={canEdit}
                      canMoveUp={false}
                      canMoveDown={false}
                      onToggle={() => updateMutation.mutate({ id: todo.id, data: { done: !todo.done } })}
                      onUpdate={(data) => updateMutation.mutate({ id: todo.id, data })}
                      onDelete={() => deleteMutation.mutate(todo.id)}
                      onMove={() => {}}
                      clients={taggableClients}
                      contacts={contacts}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
