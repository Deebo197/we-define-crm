import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, ArrowRight, Check, Hotel, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STEPS = ['Basics', 'Hotels', 'Dates & Details', 'Operators', 'Review'];

export default function CreateScenario() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    destination: '',
    analysis_scope: 'single',
    client_hotel_ids: [],
    travel_dates: [],
    duration: 7,
    board_basis: 'Half Board',
    operator_ids: [],
    analysis_month: '',
  });

  const { data: hotels = [] } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => base44.entities.Hotel.list(),
  });

  const { data: compSets = [] } = useQuery({
    queryKey: ['compSets'],
    queryFn: () => base44.entities.ClientCompSet.list(),
  });

  const { data: operators = [] } = useQuery({
    queryKey: ['operators'],
    queryFn: () => base44.entities.Operator.list(),
  });

  const clientHotels = useMemo(() =>
    hotels.filter(h => h.type === 'client' && h.destination === form.destination && h.active !== false),
    [hotels, form.destination]
  );

  const competitorHotels = useMemo(() => {
    if (!form.client_hotel_ids.length) return [];
    const compIds = new Set();
    form.client_hotel_ids.forEach(cid => {
      compSets.filter(cs => cs.client_hotel_id === cid).forEach(cs => compIds.add(cs.competitor_hotel_id));
    });
    return hotels.filter(h => compIds.has(h.id));
  }, [hotels, compSets, form.client_hotel_ids]);

  // Auto-select Sands for Mauritius
  useEffect(() => {
    if (form.destination === 'Mauritius') {
      const sands = clientHotels.find(h => h.name.includes('Sands'));
      if (sands) {
        setForm(f => ({ ...f, client_hotel_ids: [sands.id], analysis_scope: 'single' }));
      }
    } else {
      setForm(f => ({ ...f, client_hotel_ids: [] }));
    }
  }, [form.destination, clientHotels]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Scenario.create(data),
    onSuccess: (created) => {
      toast.success('Scenario created successfully');
      navigate(`/competitor-analysis/price-entry?scenario=${created.id}`);
    },
  });

  const toggleClient = (id) => {
    setForm(f => ({
      ...f,
      client_hotel_ids: f.client_hotel_ids.includes(id)
        ? f.client_hotel_ids.filter(x => x !== id)
        : [...f.client_hotel_ids, id]
    }));
  };

  const toggleOperator = (id) => {
    setForm(f => ({
      ...f,
      operator_ids: f.operator_ids.includes(id)
        ? f.operator_ids.filter(x => x !== id)
        : [...f.operator_ids, id]
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 0: return form.name && form.destination;
      case 1: return form.client_hotel_ids.length > 0;
      case 2: return form.travel_dates.length > 0 && form.duration > 0;
      case 3: return form.operator_ids.length > 0;
      default: return true;
    }
  };

  const handleSubmit = () => {
    createMutation.mutate({
      ...form,
      status: 'draft',
      analysis_month: form.travel_dates[0] ? format(new Date(form.travel_dates[0]), 'MMMM yyyy') : '',
    });
  };

  const getHotelName = (id) => hotels.find(h => h.id === id)?.name || id;
  const getOperatorName = (id) => operators.find(o => o.id === id)?.name || id;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
        <Button variant="ghost" size="icon" onClick={() => navigate('/competitor-analysis')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Create Scenario</h1>
          <p className="text-sm text-muted">Set up a new pricing comparison</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                i === step ? "bg-primary text-white" :
                i < step ? "bg-primary-soft text-primary cursor-pointer" :
                "bg-neutral/25 text-faint"
              )}
            >
              {i < step ? <Check className="h-3 w-3" /> : <span className="w-4 text-center">{i + 1}</span>}
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-line flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-surface rounded-2xl shadow-card border border-line p-6">
        {/* Step 0 - Basics */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Scenario Name</Label>
              <Input
                placeholder="e.g. May 2026 Maldives Comparison"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
              <Select value={form.destination} onValueChange={(v) => setForm(f => ({ ...f, destination: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maldives">🏝️ Maldives</SelectItem>
                  <SelectItem value="Mauritius">🌴 Mauritius</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.destination === 'Maldives' && (
              <div className="space-y-2">
                <Label>Analysis Scope</Label>
                <Select value={form.analysis_scope} onValueChange={(v) => setForm(f => ({ ...f, analysis_scope: v, client_hotel_ids: [] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Client</SelectItem>
                    <SelectItem value="multi">Multi-Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Step 1 - Hotels */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">Select Client Hotels</Label>
              <div className="space-y-2">
                {clientHotels.map((h) => (
                  <label
                    key={h.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      form.client_hotel_ids.includes(h.id)
                        ? "border-primary bg-primary-soft/50"
                        : "border-line hover:bg-black/[0.02]",
                      form.destination === 'Mauritius' && "pointer-events-none opacity-70"
                    )}
                  >
                    <Checkbox
                      checked={form.client_hotel_ids.includes(h.id)}
                      onCheckedChange={() => {
                        if (form.destination === 'Mauritius') return;
                        if (form.analysis_scope === 'single') {
                          setForm(f => ({ ...f, client_hotel_ids: [h.id] }));
                        } else {
                          toggleClient(h.id);
                        }
                      }}
                    />
                    <Hotel className="h-4 w-4 text-faint" />
                    <span className="font-medium text-sm text-ink">{h.name}</span>
                    {h.client_name && (
                      <span className="text-[10px] text-faint truncate hidden sm:inline">· {h.client_name}</span>
                    )}
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-soft text-primary">Client</span>
                  </label>
                ))}
              </div>
            </div>

            {competitorHotels.length > 0 && (
              <div>
                <Label className="mb-3 block">Comp Set (auto-loaded)</Label>
                <div className="space-y-1.5">
                  {competitorHotels.map((h) => {
                    const parentClients = compSets
                      .filter(cs => cs.competitor_hotel_id === h.id && form.client_hotel_ids.includes(cs.client_hotel_id))
                      .map(cs => getHotelName(cs.client_hotel_id));
                    return (
                      <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line">
                        <Hotel className="h-4 w-4 text-faint" />
                        <span className="text-sm text-ink">{h.name}</span>
                        <div className="ml-auto flex gap-1">
                          {parentClients.map(pc => (
                            <span key={pc} className="px-2 py-0.5 rounded-full text-[10px] font-medium text-muted border border-line">
                              {pc.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 - Dates & Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Travel Dates</Label>
              <p className="text-xs text-muted">Select one or more travel dates</p>
              <div className="flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={form.travel_dates.map(d => new Date(d))}
                  onSelect={(dates) => {
                    setForm(f => ({
                      ...f,
                      travel_dates: (dates || []).map(d => format(d, 'yyyy-MM-dd')).sort()
                    }));
                  }}
                  className="rounded-xl border border-line"
                />
              </div>
              {form.travel_dates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.travel_dates.map(d => (
                    <span key={d} className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-soft text-primary">
                      {format(new Date(d), 'dd MMM yyyy')}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (nights)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration}
                  onChange={(e) => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 7 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Board Basis</Label>
                <Select value={form.board_basis} onValueChange={(v) => setForm(f => ({ ...f, board_basis: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Room Only">Room Only</SelectItem>
                    <SelectItem value="Bed & Breakfast">Bed & Breakfast</SelectItem>
                    <SelectItem value="Half Board">Half Board</SelectItem>
                    <SelectItem value="Full Board">Full Board</SelectItem>
                    <SelectItem value="All Inclusive">All Inclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Operators */}
        {step === 3 && (
          <div className="space-y-4">
            <Label>Select Operators</Label>
            <div className="space-y-2">
              {operators.filter(o => o.active !== false).map((op) => (
                <label
                  key={op.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    form.operator_ids.includes(op.id)
                      ? "border-primary bg-primary-soft/50"
                      : "border-line hover:bg-black/[0.02]"
                  )}
                >
                  <Checkbox
                    checked={form.operator_ids.includes(op.id)}
                    onCheckedChange={() => toggleOperator(op.id)}
                  />
                  <Users className="h-4 w-4 text-faint" />
                  <span className="font-medium text-sm text-ink">{op.name}</span>
                  {op.trade_account_name && (
                    <span className="text-[10px] text-faint truncate hidden sm:inline">· {op.trade_account_name}</span>
                  )}
                </label>
              ))}
              {operators.filter(o => o.active !== false).length === 0 && (
                <p className="text-sm text-muted text-center py-4">
                  No operators configured. <Link to="/competitor-analysis/admin" className="text-primary hover:underline">Add operators</Link> first.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4 - Review */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-ink">Review Scenario</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-canvas">
                <p className="text-xs text-faint">Name</p>
                <p className="font-medium text-sm text-ink mt-0.5">{form.name}</p>
              </div>
              <div className="p-3 rounded-xl bg-canvas">
                <p className="text-xs text-faint">Destination</p>
                <p className="font-medium text-sm text-ink mt-0.5">{form.destination}</p>
              </div>
              <div className="p-3 rounded-xl bg-canvas">
                <p className="text-xs text-faint">Client Hotels</p>
                <p className="font-medium text-sm text-ink mt-0.5">{form.client_hotel_ids.map(getHotelName).join(', ')}</p>
              </div>
              <div className="p-3 rounded-xl bg-canvas">
                <p className="text-xs text-faint">Comp Set</p>
                <p className="font-medium text-sm text-ink mt-0.5">{competitorHotels.length} hotels</p>
              </div>
              <div className="p-3 rounded-xl bg-canvas">
                <p className="text-xs text-faint">Travel Dates</p>
                <p className="font-medium text-sm text-ink mt-0.5">{form.travel_dates.map(d => format(new Date(d), 'dd MMM')).join(', ')}</p>
              </div>
              <div className="p-3 rounded-xl bg-canvas">
                <p className="text-xs text-faint">Duration / Board</p>
                <p className="font-medium text-sm text-ink mt-0.5">{form.duration} nights / {form.board_basis}</p>
              </div>
              <div className="p-3 rounded-xl bg-canvas sm:col-span-2">
                <p className="text-xs text-faint">Operators</p>
                <p className="font-medium text-sm text-ink mt-0.5">{form.operator_ids.map(getOperatorName).join(', ')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Scenario'}
          </Button>
        )}
      </div>
    </div>
  );
}
