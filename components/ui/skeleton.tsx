import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded bg-border/80 dark:bg-accent/55", className)}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full border border-border rounded-xl overflow-hidden bg-card">
      <div className="flex border-b border-border bg-accent/40 p-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-5 flex-1 mx-2" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex border-b border-border p-4 last:border-0 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1 mx-2" />
          ))}
        </div>
      ))}
    </div>
  );
}
