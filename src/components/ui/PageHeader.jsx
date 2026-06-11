import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PageHeader({ title, subtitle, action, actionLabel, actionIcon }) {
  const Icon = actionIcon || Plus;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {action && (
        <Button
          type="button"
          onClick={action}
          className="bg-primary hover:bg-primary-hover text-white border-0 rounded-xl px-5 h-10 text-sm font-medium shadow-lg shadow-primary/20 transition-all duration-200"
        >
          <Icon className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}