import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "./base44Client";
import { listActivePeople, listActiveSeats } from "./people";
import { listActiveTradeAccounts } from "./tradeAccounts";

// ─── Shared CRM query hooks ──────────────────────────────────────────────────
// All client-side joins (company-home, person page, targeting, global search)
// run over these cached lists. Keys are shared with existing pages where the
// same data is already fetched ("trade-accounts", "contacts").

const FIVE_MINUTES = 5 * 60 * 1000;

export function useCompanies() {
  return useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => listActiveTradeAccounts("-created_date"),
    staleTime: FIVE_MINUTES,
  });
}

export function usePeople() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: () => listActivePeople("-created_date"),
    staleTime: FIVE_MINUTES,
  });
}

export function useRoleSeats() {
  return useQuery({
    queryKey: ["role-seats"],
    queryFn: () => listActiveSeats("-updated_date", 10000),
    staleTime: FIVE_MINUTES,
  });
}

export function useGroupLinks() {
  return useQuery({
    queryKey: ["group-links"],
    queryFn: () => base44.entities.GroupLink.list("-created_date", 1000),
    staleTime: FIVE_MINUTES,
  });
}

// Larger windows than the list pages use, for whole-company pictures.
export function useAllActions() {
  return useQuery({
    queryKey: ["actions", "all"],
    queryFn: () => base44.entities.Action.list("-created_date", 1000),
    staleTime: FIVE_MINUTES,
  });
}

export function useAllInteractions() {
  return useQuery({
    queryKey: ["interactions", "all"],
    queryFn: () => base44.entities.Interaction.list("-date", 1000),
    staleTime: FIVE_MINUTES,
  });
}

// ─── Reference lists ─────────────────────────────────────────────────────────
// ALL pickers for sector / destination / specialism / company sub-type values
// must read from here — never from hardcoded arrays.

export function useReferenceItems() {
  return useQuery({
    queryKey: ["reference-items"],
    queryFn: () => base44.entities.ReferenceItem.list("sort_order", 1000),
    staleTime: FIVE_MINUTES,
  });
}

/** Active values for one list_key, sorted by sort_order. Returns string[]. */
export function useReferenceList(listKey) {
  const { data: items = [], isLoading } = useReferenceItems();
  const values = useMemo(
    () =>
      items
        .filter((i) => i.list_key === listKey && i.active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((i) => i.value),
    [items, listKey]
  );
  return { values, isLoading };
}

export const OPEN_ACTION = (a) => !["Completed", "Cancelled"].includes(a.status);

export const LOCATION_TYPES = ["HQ", "Retail store", "Home worker"];
export const SEAT_STATUSES = ["Occupied", "Vacant", "Temp-covered"];
export const DESTINATION_STRENGTHS = ["Core", "Occasional"];
