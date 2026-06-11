import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

function MiniBar({ clientPrice, allHotels }) {
  const prices = allHotels.map(h => h.price).filter(Boolean);
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const getLeft = (p) => `${((p - min) / range) * 100}%`;

  return (
    <div className="relative h-5 w-full mt-1">
      <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-line rounded-full" />
      {allHotels.filter(h => h.price && !h.isClient).map(h => (
        <div
          key={h.name}
          title={`${h.name}: £${h.price.toLocaleString()}`}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-neutral border border-line-strong"
          style={{ left: getLeft(h.price) }}
        />
      ))}
      {clientPrice && (
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm z-10"
          style={{ left: getLeft(clientPrice) }}
        />
      )}
    </div>
  );
}

export default function DateBreakdown({ data, scenario, priceEntries, hotels, operators }) {
  const [expandedClient, setExpandedClient] = useState(Object.keys(data)[0] || null);
  const travelDates = [...(scenario?.travel_dates || [])].sort();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Date-by-Date Rate Comparison</h2>
        <p className="text-xs text-muted mt-0.5">See how rates shift across each travel date — averages can mask seasonal swings</p>
      </div>

      {Object.entries(data).map(([clientId, d]) => {
        const isOpen = expandedClient === clientId;

        // Build per-date table: rows = hotels, cols = dates
        const clientHotel = hotels.find(h => h.id === clientId);
        const compHotels = hotels.filter(h => d.competitorAnalysis.some(c => c.hotel === h.name));

        const allHotelRows = [
          { hotel: clientHotel, isClient: true },
          ...compHotels.map(h => ({ hotel: h, isClient: false })),
        ];

        return (
          <div key={clientId} className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden">
            {/* Accordion header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/[0.02] transition-colors"
              onClick={() => setExpandedClient(isOpen ? null : clientId)}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-ink">{d.hotelName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-muted border border-line">
                  {travelDates.length} date{travelDates.length !== 1 ? 's' : ''}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-muted border border-line">
                  {d.competitorAnalysis.length} competitors
                </span>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4 text-faint" /> : <ChevronRight className="h-4 w-4 text-faint" />}
            </button>

            {isOpen && (
              <div className="border-t border-line overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-canvas">
                      <th className="text-left px-4 py-2.5 font-medium text-faint sticky left-0 bg-canvas min-w-[160px]">Hotel</th>
                      {travelDates.map(dt => (
                        <th key={dt} className="text-center px-3 py-2.5 font-medium text-faint whitespace-nowrap">
                          {format(new Date(dt), 'dd MMM')}
                        </th>
                      ))}
                      <th className="text-center px-3 py-2.5 font-medium text-faint">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allHotelRows.map(({ hotel, isClient }) => {
                      if (!hotel) return null;
                      const rowPrices = travelDates.map(dt => {
                        const entries = priceEntries.filter(e => e.hotel_id === hotel.id && e.travel_date === dt && e.price);
                        if (entries.length === 0) return null;
                        return Math.round(entries.reduce((s, e) => s + e.price, 0) / entries.length);
                      });
                      const validPrices = rowPrices.filter(Boolean);
                      const avg = validPrices.length > 0
                        ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
                        : null;

                      // For client row: get client price per date for % calc
                      const clientPrices = travelDates.map(dt => {
                        const entries = priceEntries.filter(e => e.hotel_id === clientId && e.travel_date === dt && e.price);
                        if (entries.length === 0) return null;
                        return Math.round(entries.reduce((s, e) => s + e.price, 0) / entries.length);
                      });

                      return (
                        <tr
                          key={hotel.id}
                          className={cn(
                            "border-t border-line",
                            isClient ? "bg-primary-soft/40" : "hover:bg-black/[0.02]"
                          )}
                        >
                          <td className={cn(
                            "px-4 py-2.5 font-medium sticky left-0",
                            isClient ? "text-primary bg-primary-soft/40" : "text-ink bg-surface"
                          )}>
                            <div className="flex items-center gap-1.5">
                              {isClient && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                              <span className="truncate max-w-[140px]">{hotel.name}</span>
                            </div>
                          </td>
                          {travelDates.map((dt, di) => {
                            const price = rowPrices[di];
                            const clientPrice = clientPrices[di];

                            let diffPct = null;
                            let diffDir = null;
                            if (!isClient && price && clientPrice) {
                              const gap = clientPrice - price;
                              diffPct = Math.round((gap / price) * 100);
                              diffDir = gap > 0 ? 'above' : gap < 0 ? 'below' : 'same';
                            }

                            return (
                              <td key={dt} className="px-3 py-2.5 text-center">
                                {price ? (
                                  <div className="space-y-0.5">
                                    <div className={cn("font-semibold tabular-nums", isClient ? "text-primary" : "text-ink")}>
                                      £{price.toLocaleString()}
                                    </div>
                                    {diffPct !== null && (
                                      <div className={cn(
                                        "text-[10px] font-medium flex items-center justify-center gap-0.5",
                                        diffDir === 'above' ? "text-warning" : diffDir === 'below' ? "text-success" : "text-muted"
                                      )}>
                                        {diffDir === 'above' ? <TrendingUp className="h-2.5 w-2.5" /> :
                                         diffDir === 'below' ? <TrendingDown className="h-2.5 w-2.5" /> :
                                         <Minus className="h-2.5 w-2.5" />}
                                        {diffPct > 0 ? '+' : ''}{diffPct}%
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-faint/50">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2.5 text-center">
                            {avg ? (
                              <span className={cn("font-semibold tabular-nums", isClient ? "text-primary" : "text-muted")}>
                                £{avg.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-faint/50">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Price position mini-chart per date */}
                <div className="px-4 pb-4 pt-3 border-t border-line">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-faint mb-3">
                    Rate spread by date — <span className="text-primary">● client</span> <span className="text-muted">● competitors</span>
                  </p>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(travelDates.length, 4)}, 1fr)` }}>
                    {travelDates.map(dt => {
                      const allForDate = allHotelRows.map(({ hotel, isClient: ic }) => {
                        if (!hotel) return null;
                        const entries = priceEntries.filter(e => e.hotel_id === hotel.id && e.travel_date === dt && e.price);
                        const price = entries.length > 0
                          ? Math.round(entries.reduce((s, e) => s + e.price, 0) / entries.length)
                          : null;
                        return { name: hotel.name, price, isClient: ic };
                      }).filter(Boolean);

                      const clientEntry = allForDate.find(h => h.isClient);
                      const hasData = allForDate.some(h => h.price);

                      return (
                        <div key={dt} className="space-y-1">
                          <p className="text-[10px] font-medium text-center text-muted">
                            {format(new Date(dt), 'dd MMM')}
                          </p>
                          {hasData ? (
                            <MiniBar clientPrice={clientEntry?.price} allHotels={allForDate} />
                          ) : (
                            <p className="text-[10px] text-center text-faint/50">No data</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
