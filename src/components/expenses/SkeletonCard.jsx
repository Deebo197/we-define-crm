export function SkeletonCard({ className = "" }) {
  return (
    <div className={`rounded-2xl p-5 overflow-hidden relative bg-surface border border-line shadow-card ${className}`}>
      <div className="shimmer-line w-1/3 h-3 rounded-full mb-4" />
      <div className="shimmer-line w-2/3 h-8 rounded-full mb-2" />
      <div className="shimmer-line w-1/2 h-3 rounded-full" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-line">
      <div className="shimmer-line w-20 h-4 rounded-full" />
      <div className="shimmer-line flex-1 h-4 rounded-full" />
      <div className="shimmer-line w-16 h-4 rounded-full" />
    </div>
  );
}
