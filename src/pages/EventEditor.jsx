import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActivePeople } from "@/api/people";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ShimmerCard from "@/components/ui/ShimmerCard";
import { ArrowLeft, Plus, Pencil, MapPin, Users, X, CalendarDays } from "lucide-react";
import ItemEditor from "@/components/events/ItemEditor";
import ItineraryPreview from "@/components/events/ItineraryPreview";
import InviteEditor from "@/components/events/InviteEditor";
import {
  EVENT_TYPES, EVENT_STATUSES, eventStatusPill, kindPill, KIND_META,
  eventDays, itemsForDay, timeRange, formatDay, itemAddressLine,
  eventTotalCost, dayCost, formatGBP, collectVenues,
} from "@/components/events/eventUtils";

const inputClass = "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

const EVENT_FIELDS = [
  "title", "event_type", "status", "client_ids", "client_names", "start_date", "end_date",
  "description", "internal_notes", "host_names", "items", "invite",
];

const blankEvent = () => ({
  title: "",
  event_type: "Sales Trip",
  status: "Planning",
  client_ids: [],
  client_names: [],
  start_date: "",
  end_date: "",
  description: "",
  internal_notes: "",
  host_names: [],
  items: [],
  invite: {},
});

const normalise = (event) => ({ ...blankEvent(), ...Object.fromEntries(EVENT_FIELDS.filter(k => event?.[k] !== undefined).map(k => [k, event[k]])) });

function Section({ title, action, children }) {
  return (
    <section className="bg-surface rounded-2xl shadow-card border border-line p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// Compact read-only card for one itinerary item
function ItemCard({ item, onEdit }) {
  const Icon = (KIND_META[item.kind] || KIND_META.Other).icon;
  const where = item.company_name || item.venue_name || "";
  const addr = itemAddressLine(item);
  return (
    <div onClick={onEdit}
      className="bg-surface rounded-xl border border-line p-3.5 hover:border-line-strong transition-all cursor-pointer group">
      <div className="flex items-start gap-3">
        <div className="w-16 shrink-0 text-xs font-semibold text-primary pt-0.5">{timeRange(item) || "—"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={kindPill(item.kind)}><Icon className="w-3 h-3" />{item.kind}</span>
            <span className="text-ink text-sm font-medium truncate">{item.title || where || "Untitled"}</span>
          </div>
          {where && item.title && <p className="text-muted text-xs mt-1 truncate">{where}</p>}
          {addr && (
            <p className="text-faint text-xs mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />{addr}
            </p>
          )}
          {item.contact_names?.length > 0 && (
            <p className="text-faint text-xs mt-1 flex items-center gap-1 truncate">
              <Users className="w-3 h-3 shrink-0" />{item.contact_names.join(", ")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {Number(item.cost) > 0 && <span className="text-muted text-xs font-medium">{formatGBP(item.cost)}</span>}
          <Pencil className="w-3.5 h-3.5 text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}

export default function EventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new";

  const [form, setForm] = useState(isNew ? blankEvent() : null);
  const [tab, setTab] = useState("plan");
  const [hostInput, setHostInput] = useState("");
  // Item being edited: { item, isNew }
  const [editing, setEditing] = useState(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const list = await base44.entities.Event.filter({ id });
      return list[0];
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (event) setForm(f => f ?? normalise(event));
  }, [event]);

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => listActivePeople("-created_date"),
    staleTime: 10 * 60 * 1000,
  });
  const { data: teamMembers = [] } = useQuery({ queryKey: ["team-members"], queryFn: () => base44.entities.TeamMember.filter({ status: "Active" }) });
  const { data: tradeAccounts = [] } = useQuery({ queryKey: ["trade-accounts"], queryFn: () => listActiveTradeAccounts() });
  const { data: allEvents = [] } = useQuery({ queryKey: ["events"], queryFn: () => base44.entities.Event.list("-start_date") });

  const visibleClients = clients.filter(c => !c.is_internal);
  // "Previously used venues" datalist — built client-side from every event,
  // including unsaved items on the one being edited.
  const venues = useMemo(() => collectVenues([...allEvents.filter(e => e.id !== id), form].filter(Boolean)), [allEvents, form, id]);

  const saveMutation = useMutation({
    mutationFn: (data) => isNew
      ? base44.entities.Event.create(data)
      : base44.entities.Event.update(id, data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success(isNew ? "Event created" : "Event saved");
      if (isNew && created?.id) navigate(`/events/${created.id}`, { replace: true });
    },
    onError: () => toast.error("Couldn’t save the event — please try again"),
  });

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error("Give the event a title before saving");
      setTab("plan");
      return;
    }
    saveMutation.mutate({ ...form, items: form.items || [] });
  };

  if (!isNew) {
    if (isLoading) return <div className="py-12"><ShimmerCard count={3} /></div>;
    if (!event && !form) return <div className="text-faint py-12 text-center">Event not found</div>;
    if (!form) return <div className="py-12"><ShimmerCard count={3} /></div>;
  }

  const set = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const toggleClient = (client) => {
    const isIn = form.client_ids.includes(client.id);
    set({
      client_ids: isIn ? form.client_ids.filter(cid => cid !== client.id) : [...form.client_ids, client.id],
      client_names: isIn ? form.client_names.filter(n => n !== client.name) : [...form.client_names, client.name],
    });
  };

  const toggleHost = (name) => {
    set({
      host_names: form.host_names.includes(name)
        ? form.host_names.filter(n => n !== name)
        : [...form.host_names, name],
    });
  };

  const addHostTag = () => {
    const name = hostInput.trim();
    if (!name) return;
    if (!form.host_names.includes(name)) set({ host_names: [...form.host_names, name] });
    setHostInput("");
  };

  const days = eventDays(form);

  const addDay = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (!form.start_date) {
      set({ start_date: today, end_date: today });
      return;
    }
    const last = days[days.length - 1] || form.start_date;
    set({ end_date: format(addDays(new Date(`${last}T00:00:00`), 1), "yyyy-MM-dd") });
  };

  const addItem = (date) => {
    setEditing({
      isNew: true,
      item: {
        id: String(Date.now()),
        date,
        kind: "Meeting",
        start_time: "",
        end_time: "",
        title: "",
        company_id: "",
        company_name: "",
        venue_name: "",
        address: "",
        city: "",
        postcode: "",
        contact_ids: [],
        contact_names: [],
        cost: "",
        cost_notes: "",
        notes: "",
        internal_notes: "",
      },
    });
  };

  const saveItem = (item) => {
    const cleaned = { ...item, cost: item.cost === "" ? null : Number(item.cost) };
    setForm(prev => ({
      ...prev,
      items: editing.isNew
        ? [...(prev.items || []), cleaned]
        : (prev.items || []).map(it => it.id === cleaned.id ? cleaned : it),
    }));
    setEditing(null);
  };

  const deleteItem = () => {
    setForm(prev => ({ ...prev, items: (prev.items || []).filter(it => it.id !== editing.item.id) }));
    setEditing(null);
  };

  const total = eventTotalCost(form);

  const tabs = [
    { id: "plan", label: "Plan" },
    { id: "itinerary", label: "Client itinerary" },
    { id: "invite", label: "Invite" },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={() => navigate("/events")} className="text-faint hover:text-ink transition-colors" aria-label="Back to events">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-ink truncate">{isNew ? "New Event" : form.title || "Untitled event"}</h1>
          <p className="text-faint text-sm">{form.event_type}{form.start_date ? ` · ${formatDay(form.start_date, "d MMM yyyy")}` : ""}</p>
        </div>
        <span className={eventStatusPill(form.status)}>{form.status}</span>
        <Button type="button" onClick={handleSave} disabled={saveMutation.isPending}
          className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6 h-10 text-sm">
          {saveMutation.isPending ? "Saving…" : isNew ? "Create Event" : "Save"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-canvas border border-line rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              tab === t.id ? "bg-surface text-ink shadow-card" : "text-faint hover:text-ink"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "itinerary" && <ItineraryPreview event={form} />}
      {tab === "invite" && <InviteEditor event={form} onChange={(invite) => set({ invite })} />}

      {tab === "plan" && (
        <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            {/* ① Details */}
            <Section title="Details">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-muted text-xs mb-1.5">Title *</Label>
                  <Input value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputClass}
                    placeholder="e.g. Hard Rock & SAii UK Sales Trip — September" required />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-muted text-xs mb-1.5 block">Type</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => set({ event_type: t })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                          form.event_type === t ? "bg-primary/20 text-primary border-primary/30" : "bg-canvas text-faint border-line hover:border-line-strong"
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-muted text-xs mb-1.5 block">Status</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_STATUSES.map(s => (
                      <button key={s} type="button" onClick={() => set({ status: s })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                          form.status === s ? "bg-primary/20 text-primary border-primary/30" : "bg-canvas text-faint border-line hover:border-line-strong"
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-muted text-xs mb-1.5">Start date</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <Label className="text-muted text-xs mb-1.5">End date</Label>
                  <Input type="date" value={form.end_date} min={form.start_date || undefined} onChange={(e) => set({ end_date: e.target.value })} className={inputClass} />
                </div>
              </div>
            </Section>

            {/* ② Clients & hosts */}
            <Section title="Clients & Hosts">
              <div>
                <Label className="text-muted text-xs mb-1.5 block">WDT clients represented</Label>
                <div className="flex flex-wrap gap-2">
                  {visibleClients.map(c => (
                    <button key={c.id} type="button" onClick={() => toggleClient(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                        form.client_ids.includes(c.id) ? "bg-primary/20 text-primary border-primary/30" : "bg-canvas text-faint border-line hover:border-line-strong"
                      }`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-muted text-xs mb-1.5 block">Hosts</Label>
                {form.host_names.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.host_names.map(name => (
                      <span key={name} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl text-xs font-medium bg-success/15 text-success border border-success/30">
                        {name}
                        <button type="button" onClick={() => toggleHost(name)} aria-label={`Remove ${name}`}
                          className="rounded-full p-0.5 hover:bg-success/20 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {teamMembers.filter(m => !form.host_names.includes(m.full_name)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {teamMembers.filter(m => !form.host_names.includes(m.full_name)).map(m => (
                      <button key={m.id} type="button" onClick={() => toggleHost(m.full_name)}
                        className="px-2.5 py-1 rounded-xl text-xs font-medium border bg-canvas text-muted border-line hover:border-success/40 hover:text-success transition-all">
                        + {m.full_name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={hostInput} onChange={(e) => setHostInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHostTag(); } }}
                    className={`${inputClass} h-9 text-sm`} placeholder="Add a host by name…" />
                  <Button type="button" onClick={addHostTag} variant="outline" className="rounded-xl h-9 px-3 border-line text-muted text-xs">Add</Button>
                </div>
              </div>
            </Section>

            {/* ③ Overview & notes */}
            <Section title="Overview & Notes">
              <div>
                <Label className="text-muted text-xs mb-1.5">Overview <span className="text-faint">(client-facing — appears on the itinerary)</span></Label>
                <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })}
                  className={`${inputClass} min-h-[90px] text-sm`}
                  placeholder="A short welcome and overview of the trip for the client document…" />
              </div>
              <div>
                <Label className="text-muted text-xs mb-1.5">Internal notes <span className="text-faint">(never shared)</span></Label>
                <Textarea value={form.internal_notes} onChange={(e) => set({ internal_notes: e.target.value })}
                  className={`${inputClass} min-h-[70px] text-sm`} />
              </div>
            </Section>

            {/* ④ Itinerary builder */}
            <Section
              title="Itinerary"
              action={
                <button type="button" onClick={addDay}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl border border-line bg-canvas text-primary hover:border-primary/40 text-xs font-medium transition-all">
                  <Plus className="w-3.5 h-3.5" /> Add day
                </button>
              }
            >
              {days.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border border-dashed border-line">
                  <CalendarDays className="w-5 h-5 text-faint mx-auto mb-2" />
                  <p className="text-faint text-sm">Set the start and end dates above, or click <span className="text-primary">Add day</span> to begin.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {days.map((date, i) => {
                    const items = itemsForDay(form.items, date);
                    return (
                      <div key={date}>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-ink">
                            <span className="text-primary">Day {i + 1}</span>
                            <span className="text-muted font-normal"> — {formatDay(date, "EEEE d MMMM")}</span>
                          </h3>
                          {dayCost(form.items, date) > 0 && (
                            <span className="text-faint text-xs">{formatGBP(dayCost(form.items, date))}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {items.map(it => (
                            <ItemCard key={it.id} item={it} onEdit={() => setEditing({ isNew: false, item: it })} />
                          ))}
                          <button type="button" onClick={() => addItem(date)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-line text-faint hover:text-primary hover:border-primary/40 text-xs font-medium transition-all">
                            <Plus className="w-3.5 h-3.5" /> Add item
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>

          {/* Cost summary sidebar */}
          <aside className="bg-surface rounded-2xl shadow-card border border-line p-5 lg:sticky lg:top-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-3">Cost summary</h2>
            {days.length === 0 ? (
              <p className="text-faint text-xs">Add days and items to see costs.</p>
            ) : (
              <div className="space-y-1.5">
                {days.map((date, i) => (
                  <div key={date} className="flex items-center justify-between text-xs">
                    <span className="text-muted">Day {i + 1} · {formatDay(date, "EEE d MMM")}</span>
                    <span className="text-ink font-medium">{formatGBP(dayCost(form.items, date))}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2.5 mt-1.5 border-t border-line">
                  <span className="text-ink text-sm font-semibold">Event total</span>
                  <span className="text-primary text-sm font-semibold">{formatGBP(total)}</span>
                </div>
                <p className="text-faint text-[11px] pt-1">Costs are internal — never shown on the client itinerary or invite.</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Item editor overlay */}
      {editing && (
        <ItemEditor
          item={editing.item}
          isNew={editing.isNew}
          days={days}
          contacts={contacts}
          tradeAccounts={tradeAccounts}
          venues={venues}
          onSave={saveItem}
          onDelete={deleteItem}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
