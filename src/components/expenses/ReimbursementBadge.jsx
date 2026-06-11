import { TONES } from "@/lib/statusColors";

export default function ReimbursementBadge({ required, paid }) {
  let tone = "neutral";
  let label = "Not Required";
  if (required && paid) {
    tone = "success";
    label = "Paid";
  } else if (required) {
    tone = "warning";
    label = "Pending";
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TONES[tone].pill}`}>
      {label}
    </span>
  );
}
