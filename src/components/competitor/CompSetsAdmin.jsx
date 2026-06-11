import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { TONES } from '@/lib/statusColors';

export default function CompSetsAdmin() {
  const queryClient = useQueryClient();
  const [newCS, setNewCS] = useState({ client_hotel_id: '', competitor_hotel_id: '' });

  const { data: hotels = [] } = useQuery({ queryKey: ['hotels'], queryFn: () => base44.entities.Hotel.list() });
  const { data: compSets = [] } = useQuery({ queryKey: ['compSets'], queryFn: () => base44.entities.ClientCompSet.list() });

  const clientHotels = hotels.filter(h => h.type === 'client' && h.active !== false);
  const competitorHotels = hotels.filter(h => h.type === 'competitor' && h.active !== false);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientCompSet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compSets'] });
      setNewCS({ client_hotel_id: '', competitor_hotel_id: '' });
      toast.success('Comp set entry added');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientCompSet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compSets'] });
      toast.success('Comp set entry removed');
    },
  });

  const getHotelName = (id) => hotels.find(h => h.id === id)?.name || 'Unknown';

  // Group by client
  const grouped = {};
  clientHotels.forEach(ch => {
    grouped[ch.id] = compSets.filter(cs => cs.client_hotel_id === ch.id);
  });

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-surface rounded-2xl shadow-card border border-line p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <p className="text-xs text-faint mb-1">Client Hotel</p>
            <Select value={newCS.client_hotel_id} onValueChange={(v) => setNewCS(n => ({ ...n, client_hotel_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clientHotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ArrowRight className="h-4 w-4 text-faint hidden sm:block flex-shrink-0 mb-3" />
          <div className="flex-1">
            <p className="text-xs text-faint mb-1">Competitor Hotel</p>
            <Select value={newCS.competitor_hotel_id} onValueChange={(v) => setNewCS(n => ({ ...n, competitor_hotel_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select competitor" /></SelectTrigger>
              <SelectContent>
                {competitorHotels
                  .filter(h => newCS.client_hotel_id ? hotels.find(x => x.id === newCS.client_hotel_id)?.destination === h.destination : true)
                  .map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => createMutation.mutate(newCS)}
            disabled={!newCS.client_hotel_id || !newCS.competitor_hotel_id}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Grouped list */}
      {clientHotels.map(client => (
        <div key={client.id} className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-canvas">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-ink">{client.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-muted border border-line">
                {client.destination}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ml-auto ${TONES.primary.pill}`}>
                {grouped[client.id]?.length || 0} competitors
              </span>
            </div>
          </div>
          <div className="divide-y divide-line">
            {(grouped[client.id] || []).map(cs => (
              <div key={cs.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-ink">{getHotelName(cs.competitor_hotel_id)}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-danger hover:text-danger" onClick={() => deleteMutation.mutate(cs.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {(!grouped[client.id] || grouped[client.id].length === 0) && (
              <p className="text-xs text-muted text-center py-4">No competitors assigned</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
