import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Search, Sparkles, Loader2, Download } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import ReportForm from "@/components/reports/ReportForm";
import ReportView from "@/components/reports/ReportView";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";

export default function Reports() {
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => base44.entities.Report.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Report.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reports"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Report.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reports"] }); setEditing(null); setShowForm(false); setViewing(null); },
  });

  const handleSubmit = (data) => {
    editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  };

  const filtered = reports.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (viewing) {
    return (
      <ReportView
        report={viewing}
        onBack={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setShowForm(true); setViewing(null); }}
        onUpdate={(data) => updateMutation.mutate({ id: viewing.id, data })}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Monthly client reports" action={() => { setEditing(null); setShowForm(true); }} actionLabel="New Report" actionIcon={FileText} />

      {showForm && (
        <ReportForm report={editing} onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} isLoading={createMutation.isPending || updateMutation.isPending} />
      )}

      <div className="relative mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C80]" />
        <Input placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-white/[0.06] text-white placeholder:text-[#6C6C80] rounded-xl h-10" />
      </div>

      {isLoading ? <ShimmerCard count={3} /> : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No reports" description="Generate your first monthly client report" action={() => setShowForm(true)} actionLabel="New Report" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((report, i) => (
            <div key={report.id} className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => setViewing(report)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{report.title}</h3>
                  <p className="text-[#6C6C80] text-xs mt-0.5">{report.client_name} · {report.month}</p>
                </div>
                <StatusBadge status={report.status} />
              </div>
              {report.activity_summary && (
                <p className="text-[#6C6C80] text-xs mt-2 line-clamp-2">{report.activity_summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}