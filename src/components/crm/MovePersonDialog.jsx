import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanies, useRoleSeats } from "@/api/crm";
import { movePersonToCompany, markPersonLeft } from "@/api/seats";
import PersonPicker from "./PersonPicker";

const inputClass =
  "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl border border-line p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-ink font-medium">{title}</h3>
          <button type="button" onClick={onClose} className="text-faint hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function invalidateSeatData(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["role-seats"] });
  queryClient.invalidateQueries({ queryKey: ["contacts"] });
}

/** "Move to another company…" — vacates the old seat, creates the new one. */
export function MovePersonDialog({ person, onClose }) {
  const queryClient = useQueryClient();
  const { data: companies = [] } = useCompanies();
  const { data: seats = [] } = useRoleSeats();
  const [company, setCompany] = useState(null);
  const [title, setTitle] = useState("");
  const [moveDate, setMoveDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const mutation = useMutation({
    mutationFn: () => movePersonToCompany({ person, seats, company, title, moveDate }),
    onSuccess: () => {
      invalidateSeatData(queryClient);
      toast.success(`${person.name} moved to ${company.name}`);
      onClose();
    },
    onError: () => toast.error("Couldn’t complete the move — please try again"),
  });

  return (
    <ModalShell title={`Move ${person.name} to another company`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label className="text-muted text-xs mb-1.5">New company *</Label>
          {company ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-ink text-sm flex-1 truncate">{company.name}</span>
              <button type="button" onClick={() => setCompany(null)} className="text-faint hover:text-ink">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <PersonPicker
              items={companies.filter((c) => c.id !== person.company_id)}
              placeholder="Type a company name…"
              onPick={setCompany}
              renderSub={(c) => c.type || "Company"}
              autoFocus
            />
          )}
        </div>
        <div>
          <Label className="text-muted text-xs mb-1.5">New job title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Senior Product Manager" />
        </div>
        <div>
          <Label className="text-muted text-xs mb-1.5">Move date</Label>
          <Input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className={inputClass} />
        </div>
        <p className="text-faint text-xs">
          Their current seat will be marked vacant (name kept in the seat notes). Past interactions are unaffected.
        </p>
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="text-muted hover:text-ink">Cancel</Button>
          <Button
            type="button"
            disabled={!company || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="bg-primary hover:bg-primary-hover text-white rounded-xl px-5"
          >
            {mutation.isPending ? "Moving…" : "Confirm move"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

/** "Mark seat vacant" — the person leaves the industry. */
export function MarkVacantDialog({ person, onClose }) {
  const queryClient = useQueryClient();
  const { data: seats = [] } = useRoleSeats();
  const [moveDate, setMoveDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const mutation = useMutation({
    mutationFn: () => markPersonLeft({ person, seats, moveDate }),
    onSuccess: () => {
      invalidateSeatData(queryClient);
      toast.success(`${person.name}'s seat marked vacant`);
      onClose();
    },
    onError: () => toast.error("Couldn’t update the seat — please try again"),
  });

  return (
    <ModalShell title="Mark seat vacant" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-muted text-sm">
          Mark <span className="text-ink font-medium">{person.name}</span>'s seat as vacant and remove their employer link?
          Use this when someone leaves the industry. Their record and past interactions are kept.
        </p>
        <div>
          <Label className="text-muted text-xs mb-1.5">Leaving date</Label>
          <Input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className={inputClass} />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="text-muted hover:text-ink">Cancel</Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="bg-danger hover:bg-danger/80 text-white rounded-xl px-5"
          >
            {mutation.isPending ? "Updating…" : "Mark vacant"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export { ModalShell };
