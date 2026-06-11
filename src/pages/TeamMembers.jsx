import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users2, Search, Mail, Phone } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamMemberForm from "@/components/team/TeamMemberForm";
import { Input } from "@/components/ui/input";

export default function TeamMembers() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMember.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["team-members"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["team-members"] }); setEditing(null); setShowForm(false); },
  });

  const handleSubmit = (data) => {
    editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  };

  const filtered = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.job_title?.toLowerCase().includes(search.toLowerCase())
  );

  const active = filtered.filter(m => m.status !== "Inactive");
  const inactive = filtered.filter(m => m.status === "Inactive");

  return (
    <div>
      <PageHeader
        title="Team Members"
        subtitle="Internal WDT staff"
        action={() => { setEditing(null); setShowForm(true); }}
        actionLabel="Add Member"
      />

      {showForm && (
        <TeamMemberForm
          member={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <div className="relative mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
        <Input placeholder="Search team…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-line text-ink placeholder:text-faint rounded-xl h-10" />
      </div>

      {isLoading ? <ShimmerCard count={3} /> : filtered.length === 0 ? (
        <EmptyState icon={Users2} title="No team members" description="Add your WDT team" action={() => setShowForm(true)} actionLabel="Add Member" />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <p className="text-faint text-xs font-medium uppercase tracking-wider mb-3">Active</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((member, i) => (
                  <MemberCard key={member.id} member={member} delay={i * 0.03} onClick={() => { setEditing(member); setShowForm(true); }} />
                ))}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <p className="text-faint text-xs font-medium uppercase tracking-wider mb-3">Inactive</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactive.map((member, i) => (
                  <MemberCard key={member.id} member={member} delay={i * 0.03} onClick={() => { setEditing(member); setShowForm(true); }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, delay, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-surface rounded-2xl shadow-card border border-line p-5 hover:border-line-strong hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in-up group"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-semibold text-sm">{member.full_name?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-ink font-medium text-sm group-hover:text-primary transition-colors truncate">{member.full_name}</h3>
          {member.job_title && <p className="text-faint text-xs truncate">{member.job_title}</p>}
        </div>
        <StatusBadge status={member.status} />
      </div>
      <div className="space-y-1">
        {member.email && (
          <p className="text-faint text-xs flex items-center gap-1.5"><Mail className="w-3 h-3" />{member.email}</p>
        )}
        {member.phone && (
          <p className="text-faint text-xs flex items-center gap-1.5"><Phone className="w-3 h-3" />{member.phone}</p>
        )}
      </div>
    </div>
  );
}