import React from "react";
import { getScoreColorClass } from "@/lib/utils";

interface MetricBadgeProps {
  score?: number | null;
  label?: string;
  category?: "GOOD" | "NEEDS_IMPROVEMENT" | "POOR" | null;
  size?: "sm" | "md" | "lg";
}

export function MetricBadge({ score, label, category, size = "md" }: MetricBadgeProps) {
  // If category is provided without score (e.g. for CrUX)
  if (score == null && category) {
    const isGood = category === "GOOD";
    const isModerate = category === "NEEDS_IMPROVEMENT";

    const color = isGood
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : isModerate
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

    const text = isGood ? "Good" : isModerate ? "Needs Improvement" : "Poor";

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {label ? `${label}: ${text}` : text}
      </span>
    );
  }

  const colors = getScoreColorClass(score);
  const sizeClasses = {
    sm: "w-7 h-7 text-xs font-semibold",
    md: "w-10 h-10 text-sm font-bold",
    lg: "w-14 h-14 text-lg font-extrabold",
  };

  if (score == null) {
    return (
      <div className={`inline-flex items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 ${sizeClasses[size]}`}>
        —
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div
        className={`inline-flex items-center justify-center rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]} font-mono`}
      >
        {score}
      </div>
      {label && <span className="text-[11px] font-medium text-muted-foreground">{label}</span>}
    </div>
  );
}

