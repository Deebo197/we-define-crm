import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { usePeople } from "@/api/crm";
import ContactDetail from "@/components/contacts/ContactDetail";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";

/** Route wrapper: /contacts/:id → rich person page. */
export default function PersonPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: people = [], isLoading } = usePeople();
  const person = people.find((p) => p.id === id);

  if (isLoading) return <ShimmerCard count={3} />;

  if (!person) {
    return (
      <EmptyState
        icon={Users}
        title="Person not found"
        description="They may have been deleted."
        action={() => navigate("/contacts")}
        actionLabel="Back to People"
      />
    );
  }

  return (
    <ContactDetail
      key={person.id}
      contact={person}
      onBack={() => navigate(-1)}
      onDeleted={() => navigate("/contacts")}
      onViewContact={(c) => navigate(`/contacts/${c.id}`)}
    />
  );
}
