import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { FolderOpen, FileText, ChevronRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import { format } from "date-fns";

// One folder card per (non-internal) client.
function ClientFolderCard({ client, docs, onClick }) {
  const byCategory = useMemo(() => {
    const counts = {};
    docs.forEach((d) => {
      counts[d.category || "Other"] = (counts[d.category || "Other"] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [docs]);

  const lastUpdated = useMemo(() => {
    const dates = docs.map((d) => d.updated_date || d.created_date).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
  }, [docs]);

  return (
    <div
      className="bg-surface rounded-2xl shadow-card border border-line hover:border-line-strong hover:scale-[1.01] transition-all duration-300 cursor-pointer group p-5"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-ink font-medium text-sm group-hover:text-primary transition-colors truncate">
              {client.name}
            </h3>
            <p className="text-faint text-xs">
              {docs.length === 0 ? "No documents yet" : `${docs.length} document${docs.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-faint group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>

      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {byCategory.slice(0, 4).map(([cat, n]) => (
            <span key={cat} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-canvas text-muted">
              {n} {cat}
            </span>
          ))}
          {byCategory.length > 4 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-canvas text-faint">
              +{byCategory.length - 4} more
            </span>
          )}
        </div>
      )}

      {lastUpdated && (
        <p className="text-faint text-[11px]">
          Updated {format(new Date(lastUpdated), "d MMM yyyy")}
        </p>
      )}
    </div>
  );
}

export default function Documents() {
  const navigate = useNavigate();

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-updated_date", 2000),
  });

  const visibleClients = useMemo(
    () =>
      clients
        .filter((c) => !c.is_internal)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [clients]
  );

  const docsByClient = useMemo(() => {
    const map = new Map();
    documents.forEach((d) => {
      if (!map.has(d.client_id)) map.set(d.client_id, []);
      map.get(d.client_id).push(d);
    });
    return map;
  }, [documents]);

  const isLoading = loadingClients || loadingDocs;

  return (
    <div>
      <PageHeader
        title="Client Library"
        subtitle="Presentations, fact sheets, rates and more — organised per client"
      />

      {isLoading ? (
        <ShimmerCard count={6} />
      ) : visibleClients.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No clients yet"
          description="Add clients to the CRM first — each client gets its own document folder here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleClients.map((client) => (
            <ClientFolderCard
              key={client.id}
              client={client}
              docs={docsByClient.get(client.id) || []}
              onClick={() => navigate(`/documents/${client.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
