import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { setClientDirectory, WD1_MARGIN_OPTION } from "@/lib/constants";

/**
 * Loads the allocation client list from CRM Client records.
 *
 * Only clients carrying a `code` (HR/SL/SO/SA/EL/WD) take part in expense
 * allocations. "We Define Travel (Internal)" (is_internal) is a legitimate
 * allocation target and stays in the picker, sorted last along with the
 * virtual WD1 margin bucket.
 *
 * Also hydrates the module-level directory in src/lib/constants.js so
 * synchronous helpers (getClientName / getClientAllocationFields) resolve.
 */
export function useExpenseClients() {
  const { data: rawClients = [], isLoading } = useQuery({
    queryKey: ["expenseClients"],
    queryFn: () => base44.entities.Client.list("name", 200),
    staleTime: 5 * 60 * 1000,
  });

  const clients = useMemo(() => {
    const coded = rawClients
      .filter((c) => c.code)
      .map((c) => ({
        client_id: c.id,
        client_code: c.code,
        client_name: c.name,
        is_internal: !!c.is_internal,
      }))
      .sort(
        (a, b) =>
          (a.is_internal === b.is_internal ? 0 : a.is_internal ? 1 : -1) ||
          a.client_name.localeCompare(b.client_name)
      );
    const list = [...coded, WD1_MARGIN_OPTION];
    setClientDirectory(list);
    return list;
  }, [rawClients]);

  return { clients, isLoading };
}
