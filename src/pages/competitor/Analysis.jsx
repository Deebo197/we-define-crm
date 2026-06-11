import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, Sparkles, Download } from 'lucide-react';
import { toast } from 'sonner';
import ClientPositioning from '@/components/competitor/ClientPositioning';
import OperatorComparison from '@/components/competitor/OperatorComparison';
import AIInsights from '@/components/competitor/AIInsights';
import DateBreakdown from '@/components/competitor/DateBreakdown';
import { downloadReportPDF } from '@/components/competitor/ReportPDF';

export default function CompetitorAnalysis() {
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [aiReport, setAiReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const { data: priceEntries = [] } = useQuery({
    queryKey: ['priceEntries', selectedScenarioId],
    queryFn: () => selectedScenarioId
      ? base44.entities.PriceEntry.filter({ scenario_id: selectedScenarioId })
      : [],
    enabled: !!selectedScenarioId,
  });

  const scenario = scenarios.find(s => s.id === selectedScenarioId);

  const analysisData = useMemo(() => {
    if (!scenario || priceEntries.length === 0) return null;

    const clientHotelIds = scenario.client_hotel_ids || [];
    const results = {};

    clientHotelIds.forEach(clientId => {
      const clientHotel = hotels.find(h => h.id === clientId);
      if (!clientHotel) return;

      const clientPrices = priceEntries.filter(e => e.hotel_id === clientId && e.price);
      const compIds = compSets
        .filter(cs => cs.client_hotel_id === clientId)
        .map(cs => cs.competitor_hotel_id);

      const avgClientPrice = clientPrices.length > 0
        ? clientPrices.reduce((sum, e) => sum + e.price, 0) / clientPrices.length
        : 0;

      const competitorAnalysis = compIds.map(compId => {
        const compHotel = hotels.find(h => h.id === compId);
        const compPrices = priceEntries.filter(e => e.hotel_id === compId && e.price);
        const avgCompPrice = compPrices.length > 0
          ? compPrices.reduce((sum, e) => sum + e.price, 0) / compPrices.length
          : 0;
        const gap = avgClientPrice - avgCompPrice;
        const gapPct = avgCompPrice > 0 ? ((gap / avgCompPrice) * 100) : 0;
        return {
          hotel: compHotel?.name || 'Unknown',
          avgPrice: Math.round(avgCompPrice),
          gap: Math.round(gap),
          gapPct: Math.round(gapPct),
        };
      }).filter(c => c.avgPrice > 0);

      const allPrices = [
        { hotel: clientHotel.name, avgPrice: avgClientPrice, isClient: true },
        ...competitorAnalysis.map(c => ({ hotel: c.hotel, avgPrice: c.avgPrice, isClient: false }))
      ].sort((a, b) => a.avgPrice - b.avgPrice);

      const rank = allPrices.findIndex(p => p.isClient) + 1;
      const total = allPrices.length;

      let positioning = 'Competitive';
      if (rank === 1) positioning = 'Cheapest';
      else if (rank >= Math.ceil(total * 2 / 3)) positioning = 'Premium';

      // Per-date entry map for off-date detection
      const dateEntries = {};
      (scenario.travel_dates || []).forEach(dt => {
        dateEntries[dt] = clientPrices.some(e => e.travel_date === dt);
      });

      const operatorBreakdown = (scenario.operator_ids || []).map(opId => {
        const op = operators.find(o => o.id === opId);
        const opPrices = priceEntries.filter(e => e.hotel_id === clientId && e.operator_id === opId && e.price);
        const avgOpPrice = opPrices.length > 0
          ? opPrices.reduce((sum, e) => sum + e.price, 0) / opPrices.length
          : 0;
        return { operator: op?.name || 'Unknown', operatorId: opId, avgPrice: Math.round(avgOpPrice) };
      }).filter(o => o.avgPrice > 0);

      results[clientId] = {
        hotelName: clientHotel.name,
        avgPrice: Math.round(avgClientPrice),
        rank,
        total,
        positioning,
        competitorAnalysis,
        operatorBreakdown,
        dateEntries,
      };
    });

    return results;
  }, [scenario, priceEntries, hotels, compSets, operators]);

  const generateAIReport = async () => {
    if (!analysisData || !scenario) return;
    setIsGenerating(true);

    const dataForAI = Object.values(analysisData).map(d => ({
      clientHotel: d.hotelName,
      avgPrice: d.avgPrice,
      positioning: d.positioning,
      rank: `${d.rank}/${d.total}`,
      competitors: d.competitorAnalysis,
      operators: d.operatorBreakdown,
    }));

    const prompt = `You are a pricing intelligence analyst for We Define Travel, a hotel representation company.
Analyse this competitor pricing data and produce a commercial report.

Scenario: ${scenario.name}
Destination: ${scenario.destination}
Duration: ${scenario.duration} nights, ${scenario.board_basis}
Travel dates: ${scenario.travel_dates?.join(', ')}

Data:
${JSON.stringify(dataForAI, null, 2)}

RULES:
- Every paragraph MUST start with a client hotel name
- Competitors are only context — the focus is always on the client
- Use UK English
- Be clear, simple, commercially sharp
- No fluff or corporate jargon

OUTPUT STRUCTURE:
1. Overview — brief summary of market positioning
2. Client Hotel Analysis — detailed per-hotel breakdown
3. Operator Insights — which operators offer best positioning for each client
4. Opportunities — where clients can improve positioning
5. Risks — where clients are losing ground`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overview: { type: "string" },
          client_analysis: { type: "array", items: { type: "object", properties: {
            hotel: { type: "string" },
            analysis: { type: "string" },
          }}},
          operator_insights: { type: "string" },
          opportunities: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
        }
      }
    });

    setAiReport(response);
    setIsGenerating(false);
    toast.success('Report generated');
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    await downloadReportPDF({ scenario, analysisData, aiReport, priceEntries, hotels, operators });
    setIsDownloading(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Analysis</h1>
          <p className="text-sm text-muted mt-1">Client-focused pricing intelligence</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <Select value={selectedScenarioId} onValueChange={(v) => { setSelectedScenarioId(v); setAiReport(null); }}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Select scenario" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {analysisData && (
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exporting...</>
                : <><Download className="h-4 w-4 mr-2" /> Download PDF</>
              }
            </Button>
          )}
        </div>
      </div>

      {analysisData && (
        <>
          <ClientPositioning data={analysisData} scenario={scenario} />
          <DateBreakdown
            data={analysisData}
            scenario={scenario}
            priceEntries={priceEntries}
            hotels={hotels}
            operators={operators}
          />
          <OperatorComparison data={analysisData} />

          <div className="flex justify-center">
            <Button
              onClick={generateAIReport}
              disabled={isGenerating}
              size="lg"
              className="bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20"
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Report...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> {aiReport ? 'Regenerate' : 'Generate'} AI Report</>
              )}
            </Button>
          </div>

          {aiReport && (
            <AIInsights
              report={aiReport}
              onReportChange={setAiReport}
            />
          )}
        </>
      )}

      {!selectedScenarioId && (
        <div className="bg-surface rounded-2xl shadow-card border border-line p-12 text-center">
          <BarChart3 className="h-12 w-12 text-faint mx-auto mb-4 opacity-40" />
          <p className="text-muted">Select a scenario to view analysis</p>
        </div>
      )}

      {selectedScenarioId && !analysisData && priceEntries.length === 0 && (
        <div className="bg-surface rounded-2xl shadow-card border border-line p-12 text-center">
          <p className="text-muted">No price data entered for this scenario yet</p>
        </div>
      )}
    </div>
  );
}
