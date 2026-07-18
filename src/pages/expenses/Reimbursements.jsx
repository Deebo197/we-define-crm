import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllRecords } from "@/api/fetchAll";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import PersonAvatar from "@/components/expenses/PersonAvatar";
import { formatCurrency, formatDateUK, getPaidByLabel } from "@/lib/constants";

export default function Reimbursements() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const toggleCode = (code) => {
    setSelectedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const { data: expenses = [], isLoading: loadingExp } = useQuery({
    queryKey: ["allExpenses"],
    queryFn: () => fetchAllRecords(base44.entities.Expense, "-date"),
  });

  const { data: mileage = [], isLoading: loadingMil } = useQuery({
    queryKey: ["allMileage"],
    queryFn: () => fetchAllRecords(base44.entities.MileageJourney, "-date"),
  });

  // Pay run: settle every pending item for one person in a single action
  const payRun = useMutation({
    mutationFn: async (items) => {
      for (const item of items) {
        if (item.type === "Expense") {
          await base44.entities.Expense.update(item.id, { reimbursement_paid: true });
        } else {
          await base44.entities.MileageJourney.update(item.id, { reimbursement_paid: true });
        }
      }
      return items.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["allExpenses"] });
      queryClient.invalidateQueries({ queryKey: ["allMileage"] });
    },
  });

  const exportRunCSV = (person, items) => {
    const rows = items.map(i => [
      formatDateUK(i.date),
      i.type,
      `"${(i.description || i.purpose || "").replace(/"/g, '""')}"`,
      `"${(i.category || "").replace(/"/g, '""')}"`,
      (i.client_allocations || []).map(a => a.client_code).join("; "),
      i.receipt_code || "",
      (i.paid_amount || 0).toFixed(2),
      i.reimbursement_paid ? "Paid" : "Pending",
    ]);
    const total = items.reduce((s, i) => s + (i.paid_amount || 0), 0);
    const csv = [
      `Reimbursement run — ${person}`,
      ["Date", "Type", "Description", "Category", "Clients", "Receipt", "Amount", "Status"].join(","),
      ...rows.map(r => r.join(",")),
      `,,,,,,${total.toFixed(2)},TOTAL`,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `WDT-Reimbursement-Run-${person.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const togglePaid = useMutation({
    mutationFn: async ({ type, id, paid }) => {
      if (type === "expense") {
        await base44.entities.Expense.update(id, { reimbursement_paid: paid });
      } else {
        await base44.entities.MileageJourney.update(id, { reimbursement_paid: paid });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allExpenses"] });
      queryClient.invalidateQueries({ queryKey: ["allMileage"] });
    },
  });

  // Combine all expenses and mileage
  const allItems = useMemo(() => {
    const expItems = expenses
      .map(e => ({ ...e, type: "Expense", person: getPaidByLabel(e.paid_by), paidByCode: e.paid_by }));
    const milItems = mileage
      .map(m => ({ ...m, type: "Mileage", person: getPaidByLabel(m.staff_member) || m.staff_member_name || m.staff_member, paid_amount: m.total_cost, paidByCode: m.staff_member }));
    return [...expItems, ...milItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, mileage]);

  const filtered = useMemo(() => {
    return allItems.filter(item => {
      // If no codes selected, show nothing (force user to pick a person)
      if (selectedCodes.length === 0) return false;
      if (!selectedCodes.includes(item.paidByCode)) return false;
      if (filter === "pending" && item.reimbursement_paid) return false;
      if (filter === "paid" && !item.reimbursement_paid) return false;
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      return true;
    });
  }, [allItems, filter, selectedCodes, dateFrom, dateTo]);

  // Group by person
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(item => {
      const name = item.person || "Unknown";
      if (!map[name]) map[name] = [];
      map[name].push(item);
    });
    return map;
  }, [filtered]);

  const isLoading = loadingExp || loadingMil;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Reimbursements</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search / filter section */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6 space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Filter by Person</Label>
          <div className="flex flex-wrap gap-2">
            {[{ code: "CB", label: "Céline" }, { code: "ST", label: "Sophie" }, { code: "DJ", label: "Dee" }].map(p => (
              <button
                key={p.code}
                onClick={() => toggleCode(p.code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${
                  selectedCodes.includes(p.code)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <PersonAvatar code={p.code} size="xs" />
                {p.code} — {p.label}
              </button>
            ))}
            {selectedCodes.length > 0 && (
              <button
                onClick={() => setSelectedCodes([])}
                className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-border text-muted-foreground hover:bg-accent"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <Label className="text-sm font-medium">From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 w-40" />
          </div>
          <div>
            <Label className="text-sm font-medium">To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 w-40" />
          </div>
          {(dateFrom || dateTo) && (
            <div className="flex items-end">
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="mb-0.5 text-sm text-muted-foreground hover:text-foreground underline">Clear dates</button>
            </div>
          )}
        </div>
        {selectedCodes.length > 0 && (
          <div className="pt-1 border-t border-border text-sm font-medium">
            Showing {filtered.length} items — Total: <span className="text-primary font-bold">{formatCurrency(filtered.reduce((s, i) => s + (i.paid_amount || 0), 0))}</span>
          </div>
        )}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {selectedCodes.length === 0
            ? <><p className="text-lg font-medium">Select a person above</p><p className="text-sm mt-1">Choose one or more Paid By codes to view their expenses</p></>
            : <><p className="text-lg font-medium">No expenses found</p><p className="text-sm mt-1">No records match the selected filters</p></>}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([person, items]) => {
            const total = items.reduce((s, i) => s + (i.paid_amount || 0), 0);
            const pending = items.filter(i => !i.reimbursement_paid);
            const pendingTotal = pending.reduce((s, i) => s + (i.paid_amount || 0), 0);
            return (
              <div key={person} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-2">
                    <PersonAvatar code={items[0]?.paidByCode} size="sm" />
                    <h3 className="font-semibold">{person}</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => exportRunCSV(person, items)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      Export run CSV
                    </button>
                    {pending.length > 0 && (
                      <button
                        disabled={payRun.isPending}
                        onClick={() => {
                          if (confirm(`Mark all ${pending.length} pending item(s) for ${person} as paid (${formatCurrency(pendingTotal)})?`)) {
                            payRun.mutate(pending);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {payRun.isPending ? "Marking…" : `Mark ${pending.length} paid — ${formatCurrency(pendingTotal)}`}
                      </button>
                    )}
                    <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                      <PersonAvatar code={item.paidByCode} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatDateUK(item.date)}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {item.description || item.purpose}
                        </p>
                        {item.category && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{item.category}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {item.client_allocations?.map(a => a.client_code).join(", ")}
                        </p>
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap">{formatCurrency(item.paid_amount)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Paid</span>
                        <Switch
                          checked={!!item.reimbursement_paid}
                          onCheckedChange={(v) => togglePaid.mutate({
                            type: item.type === "Expense" ? "expense" : "mileage",
                            id: item.id,
                            paid: v,
                          })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}