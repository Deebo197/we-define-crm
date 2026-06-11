import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { Cake, CalendarDays, Clock, Mail, Pencil, Phone, Plane } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatNumber, hexWithAlpha, memberInitials } from "@/components/team/teamUtils";

// Profile cards — avatar in calendar colour, contact details, key dates,
// allowance & contracted hours (inline-editable for admins).
export default function MemberCards({ members, colourOf, isAdmin, onEdit }) {
  const queryClient = useQueryClient();

  const updateField = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Saved");
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  const active = members.filter((m) => m.status !== "Inactive");
  const inactive = members.filter((m) => m.status === "Inactive");

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
      <p className="text-faint text-xs font-medium uppercase tracking-wider mb-3">Members</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...active, ...inactive].map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            colour={colourOf(member)}
            isAdmin={isAdmin}
            onEdit={() => onEdit(member)}
            onSaveField={(data) => updateField.mutate({ id: member.id, data })}
          />
        ))}
      </div>
    </div>
  );
}

function MemberCard({ member, colour, isAdmin, onEdit, onSaveField }) {
  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-5 hover:border-line-strong transition-all duration-300 group">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: hexWithAlpha(colour, 0.15) }}>
          <span className="font-semibold text-sm" style={{ color: colour }}>{memberInitials(member.full_name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-ink font-medium text-sm truncate">{member.full_name}</h3>
          {member.job_title && <p className="text-faint text-xs truncate">{member.job_title}</p>}
        </div>
        <StatusBadge status={member.status} />
        <button onClick={onEdit} className="text-faint hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" title="Edit member" aria-label={`Edit ${member.full_name}`}>
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 mb-4">
        {member.email && <p className="text-faint text-xs flex items-center gap-1.5"><Mail className="w-3 h-3 flex-shrink-0" />{member.email}</p>}
        {member.phone && <p className="text-faint text-xs flex items-center gap-1.5"><Phone className="w-3 h-3 flex-shrink-0" />{member.phone}</p>}
        <p className="text-faint text-xs flex items-center gap-1.5">
          <Cake className="w-3 h-3 flex-shrink-0" />
          {member.birthday ? format(parseISO(member.birthday), "d MMMM") : "Birthday not set"}
        </p>
        <p className="text-faint text-xs flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3 flex-shrink-0" />
          {member.start_date ? `Started ${format(parseISO(member.start_date), "d MMM yyyy")}` : "Start date not set"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line">
        <InlineNumberField
          icon={Plane}
          label="Leave allowance"
          value={member.annual_leave_allowance}
          suffix="days"
          editable={isAdmin}
          onSave={(v) => onSaveField({ annual_leave_allowance: v })}
        />
        <InlineNumberField
          icon={Clock}
          label="Contracted / week"
          value={member.contracted_hours_per_week}
          suffix="h"
          editable={isAdmin}
          onSave={(v) => onSaveField({ contracted_hours_per_week: v })}
        />
      </div>
    </div>
  );
}

function InlineNumberField({ icon: Icon, label, value, suffix, editable, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    setEditing(false);
    const trimmed = String(draft).trim();
    const num = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && (Number.isNaN(num) || num < 0)) return toast.error("Enter a valid number");
    onSave(num);
  };

  const hasValue = value != null && value !== "";

  return (
    <div>
      <p className="text-faint text-[10px] uppercase tracking-wider flex items-center gap-1 mb-0.5"><Icon className="w-3 h-3" />{label}</p>
      {editing ? (
        <Input
          type="number"
          min="0"
          step="0.5"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-7 text-xs bg-surface-secondary border-line rounded-lg px-2"
        />
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={() => { setDraft(hasValue ? String(value) : ""); setEditing(true); }}
          className={`text-sm font-medium text-left ${hasValue ? "text-ink" : "text-faint italic"} ${editable ? "hover:text-primary cursor-pointer underline decoration-dotted decoration-line underline-offset-4" : "cursor-default"}`}
          title={editable ? "Click to edit" : undefined}
        >
          {hasValue ? `${formatNumber(value)} ${suffix}` : "Not set"}
        </button>
      )}
    </div>
  );
}
