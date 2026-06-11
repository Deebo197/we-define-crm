import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Search, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import ReportForm from "@/components/reports/ReportForm";
import ReportEditor from "@/components/reports/ReportEditor";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";

export default function Reports() {
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => base44.entities.Report.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const report = await base44.entities.Report.create(data);
      // Each report carries an Internal and a Client version
      await Promise.all(["Internal", "Client"].map(version =>
        base44.entities.ReportVersion.create({
          report_id: report.id,
          report_title: report.title,
          version,
          status: "Draft",
        })
      ));
      return report;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setShowForm(false);
      setViewing(report);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const versions = await base44.entities.ReportVersion.filter({ report_id: id });
      await Promise.all(versions.map(v => base44.entities.ReportVersion.delete(v.id)));
      await base44.entities.Report.delete(id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reports"] }); setConfirmDelete(null); },
  });

  const filtered = reports.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (viewing) {
    return <ReportEditor report={viewing} onBack={() => setViewing(null)} />;
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Monthly client reports" action={() => setShowForm(true)} actionLabel="New Report" actionIcon={FileText} />

      {showForm && (
        <ReportForm onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setShowForm(false)} isLoading={createMutation.isPending} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-white/[0.08] p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white font-medium mb-2">Delete Report</h3>
            <p className="text-[#A1A1B5] text-sm mb-5">Are you sure you want to delete <span className="text-white font-medium">{confirmDelete.title}</span> and both its versions? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-[#6C6C80] hover:text-white transition-colors">Cancel</button>
              <button type="button" onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="px-5 py-2 text-sm bg-[#FF5C7A] hover:bg-[#FF5C7A]/80 text-white rounded-xl">
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
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
            <div key={report.id} className="bg-surface rounded-2xl border border-white/[0.06] p-5 hover:border-white/[0.12] hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group relative" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => setViewing(report)}>
              <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDelete(report); }} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#6C6C80] hover:text-[#FF5C7A] hover:bg-[#FF5C7A]/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-start justify-between mb-2 pr-6">
                <div>
                  <h3 className="text-white font-medium text-sm group-hover:text-[#7F5BFF] transition-colors">{report.title}</h3>
                  <p className="text-[#6C6C80] text-xs mt-0.5">{report.client_name} · {report.month}</p>
                </div>
                <StatusBadge status={report.status} />
              </div>
              {report.metrics ? (
                <p className="text-[#6C6C80] text-xs mt-2">
                  {report.metrics.interaction_count ?? 0} interactions · {report.metrics.actions_raised ?? 0} actions · {report.metrics.coverage_entries ?? 0} coverage
                </p>
              ) : (
                <p className="text-[#6C6C80] text-xs mt-2 italic">No metrics yet — open to auto-draft</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
