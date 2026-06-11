import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ScenarioStatusPill } from '@/components/competitor/StatusPills';

export default function RecentScenarios({ scenarios }) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="bg-surface rounded-2xl shadow-card border border-line p-8 text-center">
        <p className="text-muted text-sm">No scenarios yet</p>
        <Link to="/competitor-analysis/new-scenario" className="text-primary text-sm font-medium mt-2 inline-block hover:underline">
          Create your first scenario →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden">
      <div className="p-4 border-b border-line flex items-center justify-between">
        <h3 className="font-semibold text-sm text-ink">Recent Scenarios</h3>
        <Link to="/competitor-analysis/price-entry" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-line">
        {scenarios.slice(0, 5).map((s) => (
          <Link
            key={s.id}
            to={`/competitor-analysis/price-entry?scenario=${s.id}`}
            className="flex items-center justify-between p-4 hover:bg-black/[0.02] transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium text-sm text-ink truncate">{s.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted">
                  <MapPin className="h-3 w-3" /> {s.destination}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Calendar className="h-3 w-3" /> {s.created_date ? format(new Date(s.created_date), 'dd MMM yyyy') : ''}
                </span>
              </div>
            </div>
            <ScenarioStatusPill status={s.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
