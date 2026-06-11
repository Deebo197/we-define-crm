import React from 'react';
import { cn } from '@/lib/utils';
import { TONES } from '@/lib/statusColors';

export default function OperatorComparison({ data }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-ink">Operator Comparison</h2>
      <div className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas">
                <th className="text-left px-4 py-3 text-xs font-medium text-faint">Client Hotel</th>
                {Object.values(data)[0]?.operatorBreakdown.map(ob => (
                  <th key={ob.operator} className="text-right px-4 py-3 text-xs font-medium text-faint">
                    {ob.operator}
                  </th>
                ))}
                <th className="text-right px-4 py-3 text-xs font-medium text-faint">Best Operator</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data).map(([id, d]) => {
                const best = d.operatorBreakdown.length > 0
                  ? d.operatorBreakdown.reduce((min, ob) => ob.avgPrice < min.avgPrice ? ob : min, d.operatorBreakdown[0])
                  : null;

                return (
                  <tr key={id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{d.hotelName}</td>
                    {d.operatorBreakdown.map(ob => (
                      <td key={ob.operator} className={cn(
                        "text-right px-4 py-3 tabular-nums",
                        best && ob.operator === best.operator ? "text-primary font-semibold" : "text-ink"
                      )}>
                        £{ob.avgPrice.toLocaleString()}
                      </td>
                    ))}
                    <td className="text-right px-4 py-3">
                      {best && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TONES.primary.pill}`}>
                          {best.operator}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
