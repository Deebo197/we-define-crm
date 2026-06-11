import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TONES } from '@/lib/statusColors';

export default function HotelsAdmin() {
  const queryClient = useQueryClient();
  const [newHotel, setNewHotel] = useState({ name: '', type: 'competitor', destination: 'Maldives', star_rating: 5 });

  const { data: hotels = [] } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => base44.entities.Hotel.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Hotel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      setNewHotel({ name: '', type: 'competitor', destination: 'Maldives', star_rating: 5 });
      toast.success('Hotel added');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Hotel.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hotels'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Hotel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      toast.success('Hotel removed');
    },
  });

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-surface rounded-2xl shadow-card border border-line p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Hotel name"
            value={newHotel.name}
            onChange={(e) => setNewHotel(n => ({ ...n, name: e.target.value }))}
            className="flex-1"
          />
          <Select value={newHotel.type} onValueChange={(v) => setNewHotel(n => ({ ...n, type: v }))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="competitor">Competitor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={newHotel.destination} onValueChange={(v) => setNewHotel(n => ({ ...n, destination: v }))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Maldives">Maldives</SelectItem>
              <SelectItem value="Mauritius">Mauritius</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(newHotel.star_rating)} onValueChange={(v) => setNewHotel(n => ({ ...n, star_rating: Number(v) }))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 ★</SelectItem>
              <SelectItem value="4">4 ★</SelectItem>
              <SelectItem value="5">5 ★</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => createMutation.mutate({ ...newHotel, active: true })}
            disabled={!newHotel.name}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="bg-surface rounded-2xl shadow-card border border-line divide-y divide-line">
        {hotels.map(h => (
          <div key={h.id} className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">
                {h.name}
                {h.client_name && (
                  <span className="text-xs text-faint font-normal ml-2">· CRM: {h.client_name}</span>
                )}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-muted border border-line">
              {h.destination}
            </span>
            {h.star_rating && <span className="text-[11px] text-warning font-medium">{'★'.repeat(h.star_rating)}</span>}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
              h.type === 'client' ? TONES.primary.pill : TONES.neutral.pill
            )}>
              {h.type}
            </span>
            <Switch
              checked={h.active !== false}
              onCheckedChange={(checked) => updateMutation.mutate({ id: h.id, data: { active: checked } })}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger" onClick={() => deleteMutation.mutate(h.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {hotels.length === 0 && (
          <p className="text-sm text-muted text-center p-8">No hotels yet</p>
        )}
      </div>
    </div>
  );
}
