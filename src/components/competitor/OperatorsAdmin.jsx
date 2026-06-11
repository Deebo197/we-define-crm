import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OperatorsAdmin() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const { data: operators = [] } = useQuery({
    queryKey: ['operators'],
    queryFn: () => base44.entities.Operator.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Operator.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      setName('');
      toast.success('Operator added');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Operator.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operators'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Operator.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      toast.success('Operator removed');
    },
  });

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl shadow-card border border-line p-4">
        <div className="flex gap-3">
          <Input
            placeholder="Operator name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => createMutation.mutate({ name, active: true })}
            disabled={!name}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border border-line divide-y divide-line">
        {operators.map(op => (
          <div key={op.id} className="flex items-center gap-3 p-3">
            <span className="flex-1 text-sm font-medium text-ink min-w-0 truncate">
              {op.name}
              {op.trade_account_name && (
                <span className="text-xs text-faint font-normal ml-2">· CRM: {op.trade_account_name}</span>
              )}
            </span>
            <Switch
              checked={op.active !== false}
              onCheckedChange={(checked) => updateMutation.mutate({ id: op.id, data: { active: checked } })}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger" onClick={() => deleteMutation.mutate(op.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {operators.length === 0 && (
          <p className="text-sm text-muted text-center p-8">No operators yet</p>
        )}
      </div>
    </div>
  );
}
