import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="relative overflow-hidden bg-surface rounded-2xl shadow-card border border-line p-5 transition-all duration-300 hover:border-line-strong">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-faint uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-semibold text-ink mt-1 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-primary-soft">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
