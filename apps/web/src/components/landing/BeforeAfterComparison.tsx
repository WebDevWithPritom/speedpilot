"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Code2,
  Zap,
} from "lucide-react";

export function BeforeAfterComparison() {
  const [activeTab, setActiveTab] = useState<"after" | "before">("after");

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Proven Performance Impact
          </span>
          <h3 className="text-2xl font-bold tracking-tight">
            See the difference AI-guided remediation makes
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Real benchmark comparison before and after applying SpeedPilot code diffs.
          </p>
        </div>

        {/* Toggle Pills */}
        <div className="inline-flex items-center p-1 rounded-xl border border-border bg-card self-start sm:self-auto shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("before")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "before"
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Before (Unoptimized)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("after")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "after"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>After SpeedPilot (98/100)</span>
          </button>
        </div>
      </div>

      {/* Comparison Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Score Card */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs pb-3 border-b border-border">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                {activeTab === "after" ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span>SpeedPilot Remediated State</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>Default Production State</span>
                  </>
                )}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  activeTab === "after"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/15 text-red-600 dark:text-red-400"
                }`}
              >
                {activeTab === "after" ? "+56 pts Gain" : "Failing CWV"}
              </span>
            </div>

            {/* Score Quad */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              {[
                {
                  label: "Performance",
                  score: activeTab === "after" ? 98 : 42,
                  color:
                    activeTab === "after"
                      ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                      : "text-red-500 border-red-500/30 bg-red-500/10",
                },
                {
                  label: "Accessibility",
                  score: activeTab === "after" ? 100 : 76,
                  color:
                    activeTab === "after"
                      ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                      : "text-amber-500 border-amber-500/30 bg-amber-500/10",
                },
                {
                  label: "Best Practices",
                  score: activeTab === "after" ? 100 : 68,
                  color:
                    activeTab === "after"
                      ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                      : "text-amber-500 border-amber-500/30 bg-amber-500/10",
                },
                {
                  label: "SEO Score",
                  score: activeTab === "after" ? 100 : 81,
                  color:
                    activeTab === "after"
                      ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                      : "text-amber-500 border-amber-500/30 bg-amber-500/10",
                },
              ].map((s) => (
                <div key={s.label} className={`p-3.5 rounded-xl border text-center ${s.color}`}>
                  <div className="text-3xl font-extrabold font-mono tracking-tight">{s.score}</div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Core Web Vitals Row */}
            <div className="grid grid-cols-3 gap-2 pt-4 text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-secondary/30 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">LCP</div>
                <div
                  className={`font-mono font-bold text-sm mt-0.5 ${
                    activeTab === "after" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {activeTab === "after" ? "0.85s" : "4.80s"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {activeTab === "after" ? "Target ≤2.5s" : "Slow render"}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-secondary/30 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">TBT</div>
                <div
                  className={`font-mono font-bold text-sm mt-0.5 ${
                    activeTab === "after" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {activeTab === "after" ? "35ms" : "640ms"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {activeTab === "after" ? "Zero lag" : "Heavy main thread"}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-secondary/30 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">CLS</div>
                <div
                  className={`font-mono font-bold text-sm mt-0.5 ${
                    activeTab === "after" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {activeTab === "after" ? "0.005" : "0.320"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {activeTab === "after" ? "Zero shift" : "Jank on load"}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Estimated Google CWV Pass Rate</span>
            <span
              className={`font-bold font-mono ${
                activeTab === "after" ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {activeTab === "after" ? "99.4% (Pass)" : "28.1% (Fail)"}
            </span>
          </div>
        </div>

        {/* Right: Code Diff Remediation */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-primary" />
                AI-Generated Stack Diff (Next.js / Tailwind)
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                diff --git a/components/Hero.tsx
              </span>
            </div>

            {/* Code Block with Diff Highlights */}
            <div className="rounded-xl border border-border bg-zinc-950 text-zinc-100 p-4 font-mono text-xs overflow-x-auto leading-relaxed shadow-inner">
              <div className="text-zinc-500 text-[11px] pb-2 border-b border-zinc-800">
                @@ -12,8 +12,12 @@ LCP Optimization &amp; Layout Stability @@
              </div>
              <div className="pt-2 space-y-1">
                {activeTab === "before" ? (
                  <>
                    <div className="text-red-400 bg-red-950/40 px-2 py-0.5 rounded -mx-2">
                      - &lt;img src=&quot;/huge-banner.png&quot; className=&quot;w-full&quot; /&gt;
                    </div>
                    <div className="text-red-400 bg-red-950/40 px-2 py-0.5 rounded -mx-2">
                      - &lt;script src=&quot;https://cdn.example.com/analytics.js&quot; /&gt;
                    </div>
                    <div className="text-zinc-400 px-2">
                      &nbsp;&nbsp;&lt;div className=&quot;hero-copy&quot;&gt;...&lt;/div&gt;
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-red-400/60 line-through px-2 text-[11px]">
                      - &lt;img src=&quot;/huge-banner.png&quot; className=&quot;w-full&quot; /&gt;
                    </div>
                    <div className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded -mx-2">
                      + &lt;Image src=&quot;/huge-banner.webp&quot; priority sizes=&quot;100vw&quot;
                      alt=&quot;Banner&quot; width=&#123;1440&#125; height=&#123;600&#125; /&gt;
                    </div>
                    <div className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded -mx-2">
                      + &lt;Script src=&quot;https://cdn.example.com/analytics.js&quot;
                      strategy=&quot;afterInteractive&quot; /&gt;
                    </div>
                    <div className="text-zinc-400 px-2">
                      &nbsp;&nbsp;&lt;div className=&quot;hero-copy&quot;&gt;...&lt;/div&gt;
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Explanation card */}
            <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1.5 text-xs">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Why this fix works:</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {activeTab === "after"
                  ? "Adding Next.js Image priority preloads the LCP candidate with high network priority, converts to WebP/AVIF, and hard-codes aspect ratio bounding boxes to completely eliminate Cumulative Layout Shift (CLS)."
                  : "Unoptimized raw img tags without explicit dimensions force browser layout recalculation upon download, delaying LCP by up to 3.9 seconds and triggering high cumulative layout shift."}
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Applied automatically across your framework codebase.
            </span>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "after" ? "before" : "after")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Toggle to {activeTab === "after" ? "Before" : "After"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
