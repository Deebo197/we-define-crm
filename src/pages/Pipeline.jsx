import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Clock, ExternalLink, Grid3X3, ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useCompanies, usePeople } from "@/api/crm";
import {
  STAGES,
  CLOSED_STATUSES,
  CONTACT_ROLES,
  STAGE_TONES,
  CLOSED_TONE,
  TIER_TONES,
  isPipelineEligible,
  useClients,
  usePipelineLinks,
  createLink,
  moveStage,
  closeLink,
  updateLinkContacts,
  daysSince,
} from "@/api/pipeline";

function TierBadge({ tier }) {
  if (!tier) return null;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${TIER_TONES[tier] || ""}`}>
      {tier}
    </span>
  );
}

function ActivityAge({ dateStr }) {
  const days = daysSince(dateStr);
  if (days === null) return null;
  const stale = days > 30;
  return (
    <span className={`flex items-center gap-1 text-[10px] ${stale ? "text-danger" : "text-faint"}`}>
      <Clock className="w-3 h-3" />
      {days === 0 ? "today" : `${days}d`}
    </span>
  );
}

function LinkCard({ link, company, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-surface rounded-xl border border-line p-3 shadow-card hover:border-line-strong transition-all space-y-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink truncate">{link.trade_account_name}</span>
        <TierBadge tier={company?.tier} />
      </div>
      {link.contacts?.length > 0 && (
        <p className="text-xs text-muted truncate">
          {link.contacts.map((c) => c.person_name).join(", ")}
        </p>
      )}
      <div className="flex items-center justify-between">
        <ActivityAge dateStr={link.last_activity_date} />
        {company?.bonded_agency && (
          <span className="text-[10px] text-faint">Bonded Agency</span>
        )}
      </div>
    </button>
  );
}

function ContactsEditor({ link, companyPeople, onSave, saving }) {
  const [adding, setAdding] = useState(false);
  const [personId, setPersonId] = useState("");
  const [role, setRole] = useState(CONTACT_ROLES[0]);

  const addContact = () => {
    const person = companyPeople.find((p) => p.id === personId);
    if (!person) return;
    onSave([...(link.contacts || []), { person_id: person.id, person_name: person.name, role }]);
    setAdding(false);
    setPersonId("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-faint">Contacts</Label>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {(link.contacts || []).map((c, i) => (
        <div key={`${c.person_id}-${i}`} className="flex items-center gap-2 text-sm">
          <Link to={`/contacts/${c.person_id}`} className="text-primary hover:underline truncate">
            {c.person_name}
          </Link>
          <span className="text-xs text-faint">{c.role}</span>
          <button
            type="button"
            className="ml-auto text-faint hover:text-danger"
            disabled={saving}
            onClick={() => onSave(link.contacts.filter((_, idx) => idx !== i))}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {(link.contacts || []).length === 0 && !adding && (
        <p className="text-xs text-faint">No contacts on this relationship yet</p>
      )}
      {adding && (
        <div className="flex gap-2 items-center">
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Person…" /></SelectTrigger>
            <SelectContent>
              {companyPeople.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTACT_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" disabled={!personId || saving} onClick={addContact}>Add</Button>
        </div>
      )}
    </div>
  );
}

function LinkDetailDialog({ link, company, people, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [closing, setClosing] = useState(false);
  const [closeStatus, setCloseStatus] = useState(CLOSED_STATUSES[0]);
  const [closeReason, setCloseReason] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["client-trade-links"] });

  const stageMutation = useMutation({
    mutationFn: (stage) => moveStage(link, stage, { by: user?.email }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message || "Failed to update stage"),
  });
  const contactsMutation = useMutation({
    mutationFn: (contacts) => updateLinkContacts(link, contacts),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message || "Failed to update contacts"),
  });
  const closeMutation = useMutation({
    mutationFn: () => closeLink(link, { status: closeStatus, reason: closeReason, by: user?.email }),
    onSuccess: () => {
      invalidate();
      toast.success(`${link.trade_account_name} closed as ${closeStatus}`);
      onClose();
    },
    onError: (e) => toast.error(e.message || "Failed to close"),
  });

  const companyPeople = people.filter((p) => p.company_id === link.trade_account_id);
  const history = [...(link.stage_history || [])].reverse();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {link.trade_account_name}
            <TierBadge tier={company?.tier} />
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted -mt-2">
          for <span className="font-medium text-ink">{link.client_name}</span>
          {" · "}
          <Link to={`/trade-accounts/${link.trade_account_id}`} className="text-primary inline-flex items-center gap-1 hover:underline">
            company page <ExternalLink className="w-3 h-3" />
          </Link>
        </p>

        {link.closed_status ? (
          <div className={`rounded-xl border p-3 text-sm ${CLOSED_TONE}`}>
            <p className="font-semibold">Closed: {link.closed_status}</p>
            {link.closed_reason && <p className="mt-1">{link.closed_reason}</p>}
            <p className="text-xs mt-1 opacity-80">Was at: {link.closed_from_stage}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1"
              onClick={() => stageMutation.mutate(link.closed_from_stage || "Targeted")}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reopen at {link.closed_from_stage || "Targeted"}
            </Button>
          </div>
        ) : (
          <div>
            <Label className="text-xs uppercase tracking-wider text-faint">Stage</Label>
            <Select value={link.stage} onValueChange={(s) => stageMutation.mutate(s)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <ContactsEditor
          link={link}
          companyPeople={companyPeople}
          onSave={(contacts) => contactsMutation.mutate(contacts)}
          saving={contactsMutation.isPending}
        />

        {!link.closed_status && (
          <div className="border-t border-line pt-3">
            {!closing ? (
              <Button variant="ghost" size="sm" className="text-danger gap-1" onClick={() => setClosing(true)}>
                <Trash2 className="w-3.5 h-3.5" /> Close this pair…
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select value={closeStatus} onValueChange={setCloseStatus}>
                    <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLOSED_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setClosing(false)}>Cancel</Button>
                </div>
                <Input
                  placeholder="Reason (optional)"
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                />
                <Button size="sm" variant="destructive" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate()}>
                  Close as {closeStatus}
                </Button>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className="border-t border-line pt-3">
            <Label className="text-xs uppercase tracking-wider text-faint">History</Label>
            <div className="mt-2 space-y-1.5 text-xs">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-faint whitespace-nowrap">
                    {new Date(h.date).toLocaleDateString("en-GB")}
                  </span>
                  <span className="text-ink font-medium">{h.stage}</span>
                  {h.interaction_id && (
                    <Link to={`/interactions/${h.interaction_id}`} className="text-primary hover:underline">
                      interaction
                    </Link>
                  )}
                  {h.note && <span className="text-muted truncate">{h.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddOperatorDialog({ client, companies, existingIds, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("Targeted");

  const eligible = useMemo(
    () =>
      companies
        .filter((c) => isPipelineEligible(c) && !existingIds.has(c.id))
        .filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 30),
    [companies, existingIds, search]
  );

  const addMutation = useMutation({
    mutationFn: (company) => createLink({ client, company, stage, by: user?.email }),
    onSuccess: (_, company) => {
      queryClient.invalidateQueries({ queryKey: ["client-trade-links"] });
      toast.success(`${company.name} added to ${client.name}'s pipeline`);
    },
    onError: (e) => toast.error(e.message || "Failed to add"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add operator to {client.name}'s pipeline</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            placeholder="Search tour operators & bonded agencies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          {eligible.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/[0.02]">
              <span className="text-sm text-ink truncate">{c.name}</span>
              <TierBadge tier={c.tier} />
              {c.bonded_agency && <span className="text-[10px] text-faint">Bonded</span>}
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-7 text-xs"
                disabled={addMutation.isPending}
                onClick={() => addMutation.mutate(c)}
              >
                Add
              </Button>
            </div>
          ))}
          {eligible.length === 0 && (
            <p className="text-sm text-faint py-4 text-center">
              No eligible operators match — tour operators and bonded agencies only
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Pipeline() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clients = [] } = useClients();
  const { data: links = [], isLoading } = usePipelineLinks();
  const { data: companies = [] } = useCompanies();
  const { data: people = [] } = usePeople();

  const activeClients = useMemo(
    () => clients.filter((c) => !c.is_internal),
    [clients]
  );
  const [clientId, setClientId] = useState(null);
  const client = activeClients.find((c) => c.id === clientId) || activeClients[0];

  const [detailLinkId, setDetailLinkId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  const companyById = useMemo(() => {
    const m = {};
    for (const c of companies) m[c.id] = c;
    return m;
  }, [companies]);

  const clientLinks = useMemo(
    () => links.filter((l) => l.client_id === client?.id),
    [links, client]
  );
  const openLinks = clientLinks.filter((l) => !l.closed_status);
  const closedLinks = clientLinks.filter((l) => !!l.closed_status);
  const existingIds = useMemo(() => new Set(clientLinks.map((l) => l.trade_account_id)), [clientLinks]);
  const detailLink = links.find((l) => l.id === detailLinkId);

  const dragMutation = useMutation({
    mutationFn: ({ link, stage }) => moveStage(link, stage, { by: user?.email }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-trade-links"] }),
    onError: (e) => toast.error(e.message || "Failed to move"),
  });

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const stage = result.destination.droppableId;
    const link = links.find((l) => l.id === result.draggableId);
    if (link && stage !== link.stage) dragMutation.mutate({ link, stage });
  };

  if (!client) {
    return <div className="py-20 text-center text-muted text-sm">No clients yet</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Pipeline</h1>
        <div className="flex gap-1 flex-wrap">
          {activeClients.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setClientId(c.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                c.id === client.id
                  ? "bg-primary text-white"
                  : "bg-surface border border-line text-muted hover:text-ink"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/pipeline/matrix" className="gap-1.5">
              <Grid3X3 className="w-4 h-4" /> Gap Matrix
            </Link>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add operator
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted text-sm">Loading pipeline…</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((stage) => {
              const stageLinks = openLinks.filter((l) => l.stage === stage);
              return (
                <Droppable droppableId={stage} key={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`w-60 flex-shrink-0 rounded-2xl border p-2 transition-colors ${
                        snapshot.isDraggingOver ? "border-primary bg-primary-soft/40" : "border-line bg-canvas"
                      }`}
                    >
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STAGE_TONES[stage]}`}>
                          {stage}
                        </span>
                        <span className="text-xs text-faint">{stageLinks.length}</span>
                      </div>
                      <div className="space-y-2 min-h-[40px]">
                        {stageLinks.map((link, index) => (
                          <Draggable draggableId={link.id} index={index} key={link.id}>
                            {(dragProvided) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <LinkCard
                                  link={link}
                                  company={companyById[link.trade_account_id]}
                                  onOpen={() => setDetailLinkId(link.id)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {closedLinks.length > 0 && (
        <div className="bg-surface rounded-2xl border border-line">
          <button
            type="button"
            onClick={() => setShowClosed(!showClosed)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted"
          >
            <span>Closed ({closedLinks.length})</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showClosed ? "rotate-180" : ""}`} />
          </button>
          {showClosed && (
            <div className="px-4 pb-3 space-y-1">
              {closedLinks.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setDetailLinkId(l.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/[0.02] text-left"
                >
                  <span className="text-sm text-ink">{l.trade_account_name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${CLOSED_TONE}`}>
                    {l.closed_status}
                  </span>
                  {l.closed_reason && <span className="text-xs text-faint truncate">{l.closed_reason}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {detailLink && (
        <LinkDetailDialog
          link={detailLink}
          company={companyById[detailLink.trade_account_id]}
          people={people}
          onClose={() => setDetailLinkId(null)}
        />
      )}
      {showAdd && (
        <AddOperatorDialog
          client={client}
          companies={companies}
          existingIds={existingIds}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
