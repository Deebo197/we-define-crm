import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Building2 } from "lucide-react";
import { useCompanies } from "@/api/crm";
import TradeAccountDetail from "@/components/trade/TradeAccountDetail";
import TradeAccountForm from "@/components/trade/TradeAccountForm";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";

/** Route wrapper: /trade-accounts/:id → company-home. */
export default function CompanyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: companies = [], isLoading } = useCompanies();
  const company = companies.find((c) => c.id === id);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.TradeAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-accounts"] });
      setEditing(false);
    },
  });

  if (isLoading) return <ShimmerCard count={3} />;

  if (!company) {
    return (
      <EmptyState
        icon={Building2}
        title="Company not found"
        description="It may have been deleted or archived."
        action={() => navigate("/trade-accounts")}
        actionLabel="Back to Companies"
      />
    );
  }

  if (editing) {
    return (
      <TradeAccountForm
        account={company}
        onSubmit={(data) => updateMutation.mutate(data)}
        onCancel={() => setEditing(false)}
        isLoading={updateMutation.isPending}
      />
    );
  }

  return (
    <TradeAccountDetail
      account={company}
      onBack={() => navigate(-1)}
      onEdit={() => setEditing(true)}
    />
  );
}
