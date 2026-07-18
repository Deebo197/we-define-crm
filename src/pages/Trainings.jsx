/**
 * Trade Training — log training sessions delivered to agencies and operators,
 * per WDT client product. Evidence for the monthly report pack and the
 * education service line.
 */
import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useCompanies } from "@/api/crm";
import { useClients, resolveOwnerName } from "@/api/pipeline";
import { useTrainings, createTraining, deleteTraining, TRAINING_FORMATS } from "@/api/trainings";

function TrainingForm({ onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: companies = [] } = useCompanies();
  const { data: clients = [] } = useClients();
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.filter({ status: "Active" }),
    staleTime: 10 * 60 * 1000,
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    company_id: "",
    company_name: "",
    client_ids: [],
    client_names: [],
    format: "In-person",
    attendee_count: "",
    product_covered: "",
    notes: "",
  });
  const [companyOpen, setCompanyOpen] = useState(false);
  const companyRef = useRef(null);

  const suggestions = (() => {
    const q = form.company_name.toLowerCase().trim();
    if (!q || form.company_id) return [];
    return companies.filter((c) => c.name?.toLowerCase().includes(q)).slice(0, 8);
  })();

  const toggleClient = (c) => {
    setForm((f) => {
      const has = f.client_ids.includes(c.id);
      return {
        ...f,
        client_ids: has ? f.client_ids.filter((id) => id !== c.id) : [...f.client_ids, c.id],
        client_names: has ? f.client_names.filter((n) => n !== c.name) : [...f.client_names, c.name],
      };
    });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      createTraining({
        ...form,
        attendee_count: parseFloat(form.attendee_count) || 0,
        delivered_by: resolveOwnerName(teamMembers, user),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast.success("Training logged");
      onClose();
    },
    onError: (e) => toast.error(e.message || "Failed to save training"),
  });

  const canSave = form.date && form.company_name.trim();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log training session</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted mb-1.5 block">Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted mb-1.5 block">Format</Label>
              <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRAINING_FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div ref={companyRef} className="relative">
            <Label className="text-xs text-muted mb-1.5 block">Company / agency trained *</Label>
            <Input
              value={form.company_name}
              onChange={(e) => { setForm({ ...form, company_name: e.target.value, company_id: "" }); setCompanyOpen(true); }}
              onFocus={() => setCompanyOpen(true)}
              onBlur={() => setTimeout(() => setCompanyOpen(false), 150)}
              placeholder="e.g. Hays Travel Peterborough"
              autoComplete="off"
            />
            {companyOpen && suggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface border border-line rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setForm((f) => ({ ...f, company_name: s.name, company_id: s.id })); setCompanyOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-black/[0.03]"
                  >
                    <span className="text-sm text-ink">{s.name}</span>
                    <span className="text-[10px] text-faint bg-canvas px-2 py-0.5 rounded-full">{s.type || "Company"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted mb-1.5 block">Product covered (clients)</Label>
            <div className="flex flex-wrap gap-1.5">
              {clients.filter((c) => !c.is_internal).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClient(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    form.client_ids.includes(c.id)
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-canvas text-faint border-line hover:border-line-strong"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted mb-1.5 block">Attendees</Label>
              <Input
                type="number" min="0" step="1"
                value={form.attendee_count}
                onChange={(e) => setForm({ ...form, attendee_count: e.target.value })}
                placeholder="e.g. 12"
              />
            </div>
            <div>
              <Label className="text-xs text-muted mb-1.5 block">Topic / focus</Label>
              <Input
                value={form.product_covered}
                onChange={(e) => setForm({ ...form, product_covered: e.target.value })}
                placeholder="e.g. Family product, honeymoons"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted mb-1.5 block">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Reaction, follow-ups agreed, objections raised…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Saving…" : "Log training"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Trainings() {
  const queryClient = useQueryClient();
  const { data: trainings = [], isLoading } = useTrainings();
  const [showForm, setShowForm] = useState(false);
  const [clientFilter, setClientFilter] = useState("all");
  const { data: clients = [] } = useClients();

  const removeMutation = useMutation({
    mutationFn: (id) => deleteTraining(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["training-sessions"] }),
    onError: (e) => toast.error(e.message || "Failed to delete"),
  });

  const filtered = useMemo(
    () => trainings.filter((t) => clientFilter === "all" || t.client_ids?.includes(clientFilter)),
    [trainings, clientFilter]
  );

  const totalAttendees = filtered.reduce((s, t) => s + (t.attendee_count || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Trade Training</h1>
        <span className="text-sm text-faint">
          {filtered.length} session{filtered.length !== 1 ? "s" : ""} · {totalAttendees} sellers trained
        </span>
        <div className="ml-auto flex gap-2">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-44 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.filter((c) => !c.is_internal).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Log training
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-line rounded-2xl">
          <GraduationCap className="w-6 h-6 text-faint mx-auto mb-2" />
          <p className="text-muted text-sm">No training sessions logged yet</p>
          <p className="text-faint text-xs mt-1">Every session logged here feeds the monthly client report pack</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="bg-surface rounded-2xl border border-line shadow-card px-4 py-3 flex items-start gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                  {t.company_id ? (
                    <Link to={`/trade-accounts/${t.company_id}`} className="text-sm font-medium text-ink hover:text-primary">
                      {t.company_name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-ink">{t.company_name}</span>
                  )}
                  <span className="text-xs text-faint">{new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-canvas border border-line text-muted">{t.format}</span>
                  {t.attendee_count > 0 && (
                    <span className="text-xs text-faint flex items-center gap-1"><Users className="w-3 h-3" />{t.attendee_count}</span>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {[t.client_names?.join(", "), t.product_covered].filter(Boolean).join(" — ")}
                </p>
                {t.notes && <p className="text-xs text-faint mt-1">{t.notes}</p>}
                {t.delivered_by && <p className="text-[10px] text-faint mt-1">Delivered by {t.delivered_by}</p>}
              </div>
              <button
                type="button"
                onClick={() => { if (confirm(`Delete this training session at ${t.company_name}?`)) removeMutation.mutate(t.id); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-faint hover:text-danger hover:bg-danger/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && <TrainingForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
