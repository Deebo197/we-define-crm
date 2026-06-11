import React from "react";
import { statusPillClasses } from "@/lib/statusColors";

export default function StatusBadge({ status }) {
  if (!status) return null;
  return <span className={statusPillClasses(status)}>{status}</span>;
}
