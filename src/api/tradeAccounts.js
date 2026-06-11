import { base44 } from "./base44Client";

// Archived accounts are soft-deleted duplicates/broken rows from the June 2026
// data cleanse. They must never appear in lists, pickers, or import matching.
// Filtering happens client-side because legacy records pre-date the `archived`
// field and a server-side { archived: false } filter would exclude them.
export const listActiveTradeAccounts = (sort) =>
  base44.entities.TradeAccount.list(sort).then((accounts) =>
    accounts.filter((account) => !account.archived)
  );
