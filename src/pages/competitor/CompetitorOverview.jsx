import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BarChart3, Hotel, Users } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatsCard from '@/components/competitor/StatsCard';
import RecentScenarios from '@/components/competitor/RecentScenarios';

export default function CompetitorOverview() {
  const navigate = useNavigate();

  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => base44.entities.Scenario.list('-created_date'),
  });

  const { data: hotels = [] } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => base44.entities.Hotel.list(),
  });

  const { data: operators = [] } = useQuery({
    queryKey: ['operators'],
    queryFn: () => base44.entities.Operator.list(),
  });

  const clientHotels = hotels.filter(h => h.type === 'client' && h.active !== false);
  const completedScenarios = scenarios.filter(s => s.status === 'complete');
  const activeScenarios = scenarios.filter(s => s.status === 'in_progress');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Competitor Analysis"
        subtitle="Pricing intelligence overview"
        action={() => navigate('/competitor-analysis/new-scenario')}
        actionLabel="New Scenario"
        actionIcon={Plus}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Scenarios" value={scenarios.length} subtitle={`${activeScenarios.length} in progress`} icon={BarChart3} />
        <StatsCard title="Completed" value={completedScenarios.length} subtitle="Analysis ready" icon={BarChart3} />
        <StatsCard title="Client Hotels" value={clientHotels.length} subtitle="Being tracked" icon={Hotel} />
        <StatsCard title="Operators" value={operators.filter(o => o.active !== false).length} subtitle="Active" icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentScenarios scenarios={scenarios} />
        </div>
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl shadow-card border border-line p-5">
            <h3 className="font-semibold text-sm text-ink mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/competitor-analysis/new-scenario" className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/[0.02] transition-colors group">
                <div className="p-2 rounded-xl bg-primary-soft group-hover:bg-primary/15 transition-colors">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Create Scenario</p>
                  <p className="text-xs text-muted">Start a new pricing comparison</p>
                </div>
              </Link>
              <Link to="/competitor-analysis/admin" className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/[0.02] transition-colors group">
                <div className="p-2 rounded-xl bg-primary-soft group-hover:bg-primary/15 transition-colors">
                  <Hotel className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Manage Hotels</p>
                  <p className="text-xs text-muted">Hotels, comp sets & operators</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
