export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-orbit-border/60 ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2 w-20" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-orbit-border rounded-xl border border-orbit-border bg-orbit-surface/40">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="panel space-y-2 px-4 py-3">
      <Skeleton className="h-2 w-16" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}
