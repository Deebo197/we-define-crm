import React from "react";

export default function ShimmerCard({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="bg-surface rounded-2xl border border-white/[0.06] p-5">
          <div className="shimmer h-4 w-1/3 rounded bg-white/[0.04] mb-3" />
          <div className="shimmer h-3 w-2/3 rounded bg-white/[0.04] mb-2" />
          <div className="shimmer h-3 w-1/2 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}