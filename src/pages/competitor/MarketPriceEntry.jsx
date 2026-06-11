import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Save, Calendar, Clock, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PriceEntryGrid from '@/components/competitor/PriceEntryGrid';

export default function MarketPriceEntry() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedScenarioId = urlParams.get('scenario');

  const [selectedScenarioId, setSelectedScenarioId] = useState(preselectedScenarioId || '');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [localEntries, setLocalEntries] = useState({});
  const queryClient = useQueryClient();

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

  const { data: compSets = [] } = useQuery({
    queryKey: ['compSets'],
    queryFn: () => base44.entities.ClientCompSet.list(),
  });

  const { data: roomMappings = [] } = useQuery({
    queryKey: ['roomMappings'],
    queryFn: () => base44.entities.RoomMapping.list(),
  });

  const { data: existingEntries = [] } = useQuery({
    queryKey: ['priceEntries', selectedScenarioId],
    queryFn: () => selectedScenarioId
      ? base44.entities.PriceEntry.filter({ scenario_id: selectedScenarioId })
      : [],
    enabled: !!selectedScenarioId,
  });

  const scenario = scenarios.find(s => s.id === selectedScenarioId);
  const scenarioOperators = operators.filter(o => scenario?.operator_ids?.includes(o.id));

  // Set first operator if none selected
  React.useEffect(() => {
    if (scenarioOperators.length > 0 && !selectedOperatorId) {
      setSelectedOperatorId(scenarioOperators[0].id);
    }
  }, [scenarioOperators, selectedOperatorId]);

  // Merge local edits with saved entries
  const mergedEntries = useMemo(() => {
    const saved = existingEntries.filter(e => e.operator_id === selectedOperatorId);
    const localOps = Object.values(localEntries).filter(e => e.operator_id === selectedOperatorId);
    const merged = [...saved];
    localOps.forEach(local => {
      const idx = merged.findIndex(m => m.hotel_id === local.hotel_id && m.travel_date === local.travel_date);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...local };
      } else {
        merged.push(local);
      }
    });
    return merged;
  }, [existingEntries, localEntries, selectedOperatorId]);

  const onUpdateEntry = useCallback((hotelId, travelDate, updates) => {
    const key = `${selectedOperatorId}-${hotelId}-${travelDate}`;
    setLocalEntries(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        scenario_id: selectedScenarioId,
        operator_id: selectedOperatorId,
        hotel_id: hotelId,
        travel_date: travelDate,
        ...updates,
      }
    }));
  }, [selectedScenarioId, selectedOperatorId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const toSave = Object.values(localEntries);
      for (const entry of toSave) {
        const existing = existingEntries.find(
          e => e.operator_id === entry.operator_id && e.hotel_id === entry.hotel_id && e.travel_date === entry.travel_date
        );
        const data = {
          scenario_id: entry.scenario_id,
          operator_id: entry.operator_id,
          hotel_id: entry.hotel_id,
          travel_date: entry.travel_date,
          default_room: roomMappings.find(rm => rm.hotel_id === entry.hotel_id)?.default_room || '',
          actual_room: entry.actual_room || '',
          price: entry.price || null,
          notes: entry.notes || '',
          status: entry.price ? 'entered' : 'pending',
        };
        if (existing) {
          await base44.entities.PriceEntry.update(existing.id, data);
        } else {
          await base44.entities.PriceEntry.create(data);
        }
      }
      // Update scenario status
      if (scenario && scenario.status === 'draft') {
        await base44.entities.Scenario.update(scenario.id, { status: 'in_progress' });
      }
    },
    onSuccess: () => {
      setLocalEntries({});
      queryClient.invalidateQueries({ queryKey: ['priceEntries'] });
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Prices saved successfully');
    },
  });

  // Progress calc
  const totalExpected = useMemo(() => {
    if (!scenario) return 0;
    const allHotelIds = new Set(scenario.client_hotel_ids || []);
    (scenario.client_hotel_ids || []).forEach(cid => {
      compSets.filter(cs => cs.client_hotel_id === cid).forEach(cs => allHotelIds.add(cs.competitor_hotel_id));
    });
    return allHotelIds.size * (scenario.travel_dates?.length || 0) * (scenario.operator_ids?.length || 0);
  }, [scenario, compSets]);

  const totalEntered = existingEntries.filter(e => e.price).length +
    Object.values(localEntries).filter(e => e.price).length;

  const progress = totalExpected > 0 ? Math.round((totalEntered / totalExpected) * 100) : 0;

  if (!scenario) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-4">Price Entry</h1>
        <div className="bg-surface rounded-2xl shadow-card border border-line p-6 space-y-4">
          <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a scenario" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.filter(s => s.status !== 'complete').map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {scenarios.length === 0 && (
            <p className="text-sm text-muted text-center">No scenarios yet. Create one first.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">{scenario.name}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium text-muted border border-line">
              {scenario.destination}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3 w-3" /> {scenario.duration} nights
            </span>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Utensils className="h-3 w-3" /> {scenario.board_basis}
            </span>
          </div>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={Object.keys(localEntries).length === 0 || saveMutation.isPending}
          className="bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20"
        >
          <Save className="h-4 w-4 mr-2" /> {saveMutation.isPending ? 'Saving...' : 'Save Prices'}
        </Button>
      </div>

      {/* Progress */}
      <div className="bg-surface rounded-2xl shadow-card border border-line p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-faint">Completion</span>
          <span className="text-xs font-medium text-ink">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Operator Tabs */}
      <Tabs value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
        <TabsList className="bg-surface border border-line">
          {scenarioOperators.map(op => (
            <TabsTrigger key={op.id} value={op.id} className="text-xs">{op.name}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Date Groups */}
      {(scenario.travel_dates || []).map(date => (
        <div key={date} className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-canvas flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-ink">{format(new Date(date), 'dd MMMM yyyy')}</span>
          </div>
          <div className="p-4 overflow-x-auto">
            <PriceEntryGrid
              hotels={hotels}
              compSets={compSets}
              clientHotelIds={scenario.client_hotel_ids || []}
              roomMappings={roomMappings}
              travelDate={date}
              entries={mergedEntries}
              onUpdateEntry={onUpdateEntry}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
