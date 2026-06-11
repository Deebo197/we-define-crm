import React from 'react';
import { TrendingUp, TrendingDown, Minus, Trophy, Medal, Award, Utensils, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TONES } from '@/lib/statusColors';

const positioningConfig = {
  Cheapest: { pill: TONES.success.pill, icon: Trophy },
  Competitive: { pill: TONES.info.pill, icon: Medal },
  Premium: { pill: TONES.warning.pill, icon: Award },
};

function PositioningBar({ clientPrice, competitors }) {
  const allPrices = [clientPrice, ...competitors.map(c => c.avgPrice)].filter(Boolean);
  if (allPrices.length === 0) return null;
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;

  const getLeft = (price) => `${((price - min) / range) * 100}%`;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-faint">Price Position</p>
      <div className="relative h-8 w-full">
        {/* Track */}
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-line rounded-full" />
        {/* Competitor dots */}
        {competitors.map((comp) => (
          <div
            key={comp.hotel}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
            style={{ left: getLeft(comp.avgPrice) }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-neutral border border-line-strong" />
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-surface border border-line rounded-lg px-2 py-1 text-[10px] text-ink whitespace-nowrap shadow-card">
              {comp.hotel}: £{comp.avgPrice.toLocaleString()}
            </div>
          </div>
        ))}
        {/* Client marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
          style={{ left: getLeft(clientPrice) }}
        >
          <div className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-lg shadow-primary/30" />
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-faint">
        <span>£{min.toLocaleString()} cheapest</span>
        <span>£{max.toLocaleString()} most expensive</span>
      </div>
    </div>
  );
}

export default function ClientPositioning({ data, scenario }) {
  const boardBasis = scenario?.board_basis || '';
  const travelDates = scenario?.travel_dates || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-ink">Client Positioning</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(data).map(([id, d]) => {
          const config = positioningConfig[d.positioning] || positioningConfig.Competitive;
          const Icon = config.icon;

          return (
            <div key={id} className="bg-surface rounded-2xl shadow-card border border-line p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-base text-ink">{d.hotelName}</h3>
                  <p className="text-3xl font-semibold text-ink mt-1 tracking-tight tabular-nums">£{d.avgPrice.toLocaleString()}</p>
                  <p className="text-xs text-muted">avg per person</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", config.pill)}>
                    <Icon className="h-3 w-3 mr-1" /> {d.positioning}
                  </span>
                  <span className="text-xs text-muted">Rank {d.rank} of {d.total}</span>
                </div>
              </div>

              {/* Visual positioning bar */}
              {d.competitorAnalysis.length > 0 && (
                <PositioningBar clientPrice={d.avgPrice} competitors={d.competitorAnalysis} />
              )}

              {/* vs Competitors % breakdown */}
              {d.competitorAnalysis.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-line">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-faint">vs Each Competitor</p>
                  {d.competitorAnalysis.map((comp) => {
                    const isAbove = comp.gap > 0;
                    const isBelow = comp.gap < 0;
                    const pct = Math.abs(comp.gapPct);
                    const barWidth = Math.min(pct * 2, 100);

                    return (
                      <div key={comp.hotel} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted truncate max-w-[150px]">{comp.hotel}</span>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="font-medium text-ink">£{comp.avgPrice.toLocaleString()}</span>
                            <span className={cn(
                              "font-semibold text-[11px] min-w-[48px] text-right",
                              isAbove ? "text-warning" : isBelow ? "text-success" : "text-muted"
                            )}>
                              {isAbove ? '+' : ''}{comp.gapPct}%
                            </span>
                            {isAbove ? <TrendingUp className="h-3 w-3 text-warning" /> :
                             isBelow ? <TrendingDown className="h-3 w-3 text-success" /> :
                             <Minus className="h-3 w-3 text-muted" />}
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-neutral/30 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", isAbove ? "bg-warning" : "bg-success")}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Board Basis */}
              {boardBasis && (
                <div className="flex items-center gap-2 pt-2 border-t border-line">
                  <Utensils className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-faint">Board Basis</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-canvas text-muted border border-line ml-auto">
                    {boardBasis}
                  </span>
                </div>
              )}

              {/* Travel / Off dates */}
              {travelDates.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-line">
                  <div className="flex items-center gap-2">
                    <CalendarX className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <p className="text-[10px] font-medium uppercase tracking-wider text-faint">Dates Analysed</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {travelDates.map(dt => {
                      const hasEntry = d.dateEntries && d.dateEntries[dt];
                      return (
                        <span
                          key={dt}
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md font-medium",
                            hasEntry === false
                              ? "bg-danger/10 text-danger border border-danger/20"
                              : "bg-canvas text-muted border border-line"
                          )}
                        >
                          {format(new Date(dt), 'dd MMM')}
                          {hasEntry === false && ' ✗'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
