import React from "react";

const statusStyles = {
  Active: "bg-[#3DDC97]/10 text-[#3DDC97] border-[#3DDC97]/20",
  Onboarding: "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20",
  Paused: "bg-[#A1A1B5]/10 text-[#A1A1B5] border-[#A1A1B5]/20",
  Ended: "bg-[#FF5C7A]/10 text-[#FF5C7A] border-[#FF5C7A]/20",
  Planning: "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20",
  Completed: "bg-[#3DDC97]/10 text-[#3DDC97] border-[#3DDC97]/20",
  Cancelled: "bg-[#FF5C7A]/10 text-[#FF5C7A] border-[#FF5C7A]/20",
  Draft: "bg-[#A1A1B5]/10 text-[#A1A1B5] border-[#A1A1B5]/20",
  Review: "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20",
  Final: "bg-[#3DDC97]/10 text-[#3DDC97] border-[#3DDC97]/20",
  Strong: "bg-[#3DDC97]/10 text-[#3DDC97] border-[#3DDC97]/20",
  Growing: "bg-[#7F5BFF]/10 text-[#7F5BFF] border-[#7F5BFF]/20",
  New: "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20",
  "At Risk": "bg-[#FF5C7A]/10 text-[#FF5C7A] border-[#FF5C7A]/20",
  Dormant: "bg-[#6C6C80]/10 text-[#6C6C80] border-[#6C6C80]/20",
  "To Do": "bg-[#A1A1B5]/10 text-[#A1A1B5] border-[#A1A1B5]/20",
  "In Progress": "bg-[#7F5BFF]/10 text-[#7F5BFF] border-[#7F5BFF]/20",
  "Waiting on Partner": "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20",
  "Waiting on Client": "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20",
  Low: "bg-[#A1A1B5]/10 text-[#A1A1B5] border-[#A1A1B5]/20",
  Medium: "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20",
  High: "bg-[#FF5C7A]/10 text-[#FF5C7A] border-[#FF5C7A]/20",
  Urgent: "bg-[#FF5C7A]/10 text-[#FF5C7A] border-[#FF5C7A]/20",
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const style = statusStyles[status] || "bg-white/5 text-[#A1A1B5] border-white/10";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
}