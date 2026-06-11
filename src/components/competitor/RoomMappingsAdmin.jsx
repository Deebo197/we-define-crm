import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RoomMappingsAdmin() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ hotel_id: '', default_room: '', notes: '' });

  const { data: hotels = [] } = useQuery({ queryKey: ['hotels'], queryFn: () => base44.entities.Hotel.list() });
  const { data: mappings = [] } = useQuery({ queryKey: ['roomMappings'], queryFn: () => base44.entities.RoomMapping.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RoomMapping.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomMappings'] });
      setForm({ hotel_id: '', default_room: '', notes: '' });
      toast.success('Room mapping added');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RoomMapping.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomMappings'] });
      toast.success('Room mapping removed');
    },
  });

  const getHotelName = (id) => hotels.find(h => h.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl shadow-card border border-line p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={form.hotel_id} onValueChange={(v) => setForm(f => ({ ...f, hotel_id: v }))}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select hotel" /></SelectTrigger>
            <SelectContent>
              {hotels.filter(h => h.active !== false).map(h => (
                <SelectItem key={h.id} value={h.id}>{h.name} ({h.type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Default room type"
            value={form.default_room}
            onChange={(e) => setForm(f => ({ ...f, default_room: e.target.value }))}
            className="flex-1"
          />
          <Input
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            className="flex-1"
          />
          <Button
            onClick={() => createMutation.mutate(form)}
            disabled={!form.hotel_id || !form.default_room}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border border-line divide-y divide-line">
        {mappings.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3">
            <span className="text-sm font-medium text-ink min-w-0 truncate">{getHotelName(m.hotel_id)}</span>
            <span className="text-xs text-faint">→</span>
            <span className="text-sm text-ink flex-1">{m.default_room}</span>
            {m.notes && <span className="text-xs text-muted truncate max-w-[150px]">{m.notes}</span>}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger" onClick={() => deleteMutation.mutate(m.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {mappings.length === 0 && (
          <p className="text-sm text-muted text-center p-8">No room mappings yet</p>
        )}
      </div>
    </div>
  );
}
