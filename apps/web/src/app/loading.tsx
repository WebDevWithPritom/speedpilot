import React from "react";

export default function RootLoading() {
  return (
    <div className="space-y-6 animate-pulse py-2">
      {/* Page Title & Action Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-md" />
          <div className="h-4 w-72 bg-muted/60 rounded-md" />
        </div>
        <div className="h-9 w-32 bg-muted rounded-md" />
      </div>

      {/* Metrics Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-muted/70 rounded" />
              <div className="h-4 w-4 bg-muted/50 rounded" />
            </div>
            <div className="h-7 w-24 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted/50 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area / Table Skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="h-5 w-36 bg-muted rounded" />
          <div className="h-8 w-28 bg-muted/60 rounded" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-3/5 bg-muted rounded" />
                <div className="h-3 w-2/5 bg-muted/60 rounded" />
              </div>
              <div className="h-6 w-16 bg-muted/70 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
