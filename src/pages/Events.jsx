import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CalendarDays, MapPin } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import {
  EVENT_TYPES, EVENT_STATUSES, eventStatusPill, kindPill,
  eventTotalCost, formatGBP, formatDateRange,
} from "@/components/events/eventUtils";

function FilterChip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
        active ? "bg-primary/20 text-primary border-primary/30" : "bg-canvas text-faint border-line hover:border-line-strong"
      }`}>
      {label}
    </button>
  );
}

function EventCard({ event, onClick, delay }) {
  const itemCount = event.items?.length || 0;
  const total = eventTotalCost(event);
  return (
    <div onClick={onClick} style={{ animationDelay: `${delay}s` }}
      className="bg-surface rounded-2xl shadow-card border border-line p-5 hover:border-line-strong hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="text-ink font-medium text-sm group-hover:text-primary transition-colors truncate">{event.title}</h3>
          {event.start_date && (
            <p className="text-faint text-xs mt-0.5 flex items-center gap-1">
              <CalendarDays className="w-3 h-3 shrink-0" />
              {formatDateRange(event.start_date, event.end_date)}
            </p>
          )}
        </div>
        <span className={eventStatusPill(event.status)}>{event.status || "Planning"}</span>
      </div>
      <div className="flex items-center flex-wrap gap-2 mt-3">
        {event.event_type && (
          <span className={kindPill(event.event_type)}>{event.event_type}</span>
        )}
        <span className="text-muted text-xs">{itemCount} item{itemCount === 1 ? "" : "s"}</span>
        {total > 0 && <span className="text-muted text-xs font-medium">{formatGBP(total)}</span>}
      </div>
      {event.client_names?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {event.client_names.map(name => (
            <span key={name} className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary">{name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-start_date"),
  });

  const filtered = events.filter(e =>
    (!statusFilter || e.status === statusFilter) &&
    (!typeFilter || e.event_type === typeFilter)
  );

  const today = format(new Date(), "yyyy-MM-dd");
  const isUpcoming = (e) => !e.start_date || (e.end_date || e.start_date) >= today;
  const upcoming = filtered.filter(isUpcoming).sort((a, b) => (a.start_date || "9999").localeCompare(b.start_date || "9999"));
  const past = filtered.filter(e => !isUpcoming(e)).sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Sales trips, dinners and client events"
        action={() => navigate("/events/new")}
        actionLabel="New Event"
      />

      {/* Filters */}
      <div className="space-y-2 mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="All statuses" active={!statusFilter} onClick={() => setStatusFilter("")} />
          {EVENT_STATUSES.map(s => (
            <FilterChip key={s} label={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? "" : s)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="All types" active={!typeFilter} onClick={() => setTypeFilter("")} />
          {EVENT_TYPES.map(t => (
            <FilterChip key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(typeFilter === t ? "" : t)} />
          ))}
        </div>
      </div>

      {isLoading ? <ShimmerCard count={4} /> : filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No events yet"
          description="Plan a sales trip or client dinner — itineraries, attendee lists and invites all live here."
          action={() => navigate("/events/new")}
          actionLabel="New Event"
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-3">Upcoming</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((e, i) => (
                  <EventCard key={e.id} event={e} delay={i * 0.03} onClick={() => navigate(`/events/${e.id}`)} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-3">Past</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {past.map((e, i) => (
                  <EventCard key={e.id} event={e} delay={i * 0.03} onClick={() => navigate(`/events/${e.id}`)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
