import { Layers, Plus, ArrowRightLeft, Sparkles } from "lucide-react";

export const revalidate = 0;

export default function ComparisonsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-500" />
            Before vs. After & Competitor Comparisons
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare performance benchmarks before and after optimization deployments, or benchmark against public competitors.
          </p>
        </div>

        <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm">
          <ArrowRightLeft className="w-4 h-4" />
          New Comparison Matrix
        </button>
      </div>

      <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
        <ArrowRightLeft className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-sm">No Comparisons Recorded</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
          Select two audit runs to generate a side-by-side metric comparison diff with score changes, CWV shifts, and resolved issues.
        </p>
      </div>
    </div>
  );
}

