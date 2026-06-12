import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { usePeople, useRoleSeats } from "@/api/crm";
import { tempCoverSeat, fillSeat } from "@/api/seats";
import PersonPicker from "./PersonPicker";
import { ModalShell } from "./MovePersonDialog";

const inputClass =
  "bg-surface-secondary border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

function invalidate(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["role-seats"] });
  queryClient.invalidateQueries({ queryKey: ["contacts"] });
}

/** Assign a temp cover to a vacant seat. */
export function TempCoverDialog({ seat, onClose }) {
  const queryClient = useQueryClient();
  const { data: people = [] } = usePeople();

  const mutation = useMutation({
    mutationFn: (person) => tempCoverSeat({ seat, coveringPerson: person }),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Temp cover assigned");
      onClose();
    },
    onError: () => toast.error("Couldn’t assign cover — please try again"),
  });

  return (
    <ModalShell title={`Temp-cover: ${seat.title || "seat"}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-muted text-sm">
          Pick the person temporarily covering this seat at <span className="text-ink font-medium">{seat.company_name}</span>.
          Their own seat is not changed.
        </p>
        <PersonPicker
          items={people}
          placeholder="Type a person's name…"
          onPick={(p) => mutation.mutate(p)}
          renderSub={(p) => p.company_name || "No company"}
          autoFocus
        />
        <div className="flex justify-end pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="text-muted hover:text-ink">Cancel</Button>
        </div>
      </div>
    </ModalShell>
  );
}

/** Fill a vacant seat — pick an existing person or create a new one inline. */
export function FillSeatDialog({ seat, onClose }) {
  const queryClient = useQueryClient();
  const { data: people = [] } = usePeople();
  const { data: seats = [] } = useRoleSeats();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fillMutation = useMutation({
    mutationFn: (person) => fillSeat({ seat, person, seats, startDate }),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Seat filled");
      onClose();
    },
    onError: () => toast.error("Couldn’t fill the seat — please try again"),
  });

  const createAndFillMutation = useMutation({
    mutationFn: async () => {
      const created = await base44.entities.Contact.create({
        name: newName.trim(),
        email: newEmail.trim(),
        company_id: seat.company_id,
        company_name: seat.company_name,
        company_type: "TradeAccount",
        role: seat.title || "",
      });
      await fillSeat({ seat, person: created, seats, startDate });
    },
    onSuccess: () => {
      invalidate(queryClient);
      toast.success(`${newName.trim()} created and seated`);
      onClose();
    },
    onError: () => toast.error("Couldn’t create the person — please try again"),
  });

  return (
    <ModalShell title={`Fill seat: ${seat.title || "Untitled seat"}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label className="text-muted text-xs mb-1.5">Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>

        {!creating ? (
          <>
            <div>
              <Label className="text-muted text-xs mb-1.5">Existing person</Label>
              <PersonPicker
                items={people}
                placeholder="Type a person's name…"
                onPick={(p) => fillMutation.mutate(p)}
                renderSub={(p) => p.company_name || "No company"}
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 text-primary text-xs hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" /> Create a new person instead
            </button>
          </>
        ) : (
          <div className="space-y-3 border-t border-line pt-3">
            <div>
              <Label className="text-muted text-xs mb-1.5">Full name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} autoFocus />
            </div>
            <div>
              <Label className="text-muted text-xs mb-1.5">Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} />
            </div>
            <div className="flex justify-between items-center pt-1">
              <button type="button" onClick={() => setCreating(false)} className="text-faint text-xs hover:text-ink">
                ← Pick existing instead
              </button>
              <Button
                type="button"
                disabled={!newName.trim() || createAndFillMutation.isPending}
                onClick={() => createAndFillMutation.mutate()}
                className="bg-primary hover:bg-primary-hover text-white rounded-xl px-5"
              >
                {createAndFillMutation.isPending ? "Creating…" : "Create & fill seat"}
              </Button>
            </div>
          </div>
        )}

        {fillMutation.isPending && <p className="text-faint text-xs">Filling seat…</p>}
        {!creating && (
          <div className="flex justify-end pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-muted hover:text-ink">Cancel</Button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
