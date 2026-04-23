import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function EmptyState({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in-up">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#6C6C80]" />
      </div>
      <h3 className="text-white font-medium mb-1">{title}</h3>
      <p className="text-[#6C6C80] text-sm max-w-sm mb-6">{description}</p>
      {action && (
        <Button
          onClick={action}
          className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] hover:from-[#6F3BFF] hover:to-[#3A1DFF] text-white border-0 rounded-xl px-5 h-10 text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}