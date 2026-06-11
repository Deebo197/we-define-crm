import { AlertTriangle, Clock, CheckCircle2, RefreshCw, FileX, Send } from "lucide-react";
import { TONES } from "@/lib/statusColors";

/**
 * Derives the most relevant status for an expense record.
 * Priority: draft > sync_failed > missing_receipt > reimbursement_pending > reimbursed > submitted
 */
export function getExpenseStatus(expense) {
  if (expense.status === "draft") return "draft";
  if (expense.drive_sync_failed) return "sync_failed";
  if (!expense._isMileage && !expense.receipt_file && !expense.receipt_url) return "missing_receipt";
  if (expense.reimbursement_required && !expense.reimbursement_paid) return "reimbursement_pending";
  if (expense.reimbursement_required && expense.reimbursement_paid) return "reimbursed";
  return "submitted";
}

// Tone keys come from the Repevo status colour system (src/lib/statusColors.js)
const STATUS_CONFIG = {
  draft: { label: "Needs Review", icon: Clock, tone: "warning" },
  sync_failed: { label: "Sync Failed", icon: RefreshCw, tone: "danger" },
  missing_receipt: { label: "Missing Receipt", icon: FileX, tone: "danger" },
  reimbursement_pending: { label: "Reimbursement Pending", icon: AlertTriangle, tone: "warning" },
  reimbursed: { label: "Reimbursed", icon: CheckCircle2, tone: "success" },
  submitted: { label: "Submitted", icon: Send, tone: "neutral" },
};

export default function ExpenseStatusBadge({ expense, size = "sm" }) {
  const status = getExpenseStatus(expense);
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const pill = TONES[config.tone].pill;

  const isSmall = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap ${pill} ${
        isSmall ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      }`}
    >
      <Icon className="flex-shrink-0" style={{ width: isSmall ? 10 : 12, height: isSmall ? 10 : 12 }} />
      {config.label}
    </span>
  );
}
