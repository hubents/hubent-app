import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "pulse" | "shimmer";
}

function Skeleton({ className, variant = "shimmer" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)]",
        variant === "shimmer" 
          ? "skeleton-shimmer" 
          : "animate-pulse bg-[var(--muted)]",
        className
      )}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-8 w-1/4" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-1/4" />
          <Skeleton className="h-12 w-1/4" />
          <Skeleton className="h-12 w-1/4" />
          <Skeleton className="h-12 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTable };
