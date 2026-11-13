"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Smartphone,
  Monitor,
  Swords,
  Trophy,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";
import { formatMs } from "@/lib/utils";

interface ExecutionOption {
  id: string;
  url: string;
  device: string;
  createdAt: string;
  auditJob: {
    project: {
      name: string;
      primaryDomain: string;
    };
  };
  lighthouse?: {
    performanceScore: number;
    seoScore: number;
  };
}

interface JobOption {
  id: string;
  deviceMode: string;
  createdAt: string;
  urlsCount: number;
  project: {
    name: string;
    primaryDomain: string;
  };
}

interface BattleResult {
  success: boolean;
  device: "MOBILE" | "DESKTOP";
  siteA: {
    url: string;
    scores: {
      performance: number;
      seo: number;
      accessibility: number;
      bestPractices: number;
    };
    metrics: {
      fcpMs: number;
      lcpMs: number;
      tbtMs: number;
      cls: number;
      speedIndex: number;
    };
    wins: number;
  };
  siteB: {
    url: string;
    scores: {
      performance: number;
      seo: number;
      accessibility: number;
      bestPractices: number;
    };
    metrics: {
      fcpMs: number;
      lcpMs: number;
      tbtMs: number;
      cls: number;
      speedIndex: number;
    };
    wins: number;
  };
  comparison: {
    overallWinner: "A" | "B" | "TIE";
    perfDelta: number;
    lcpDeltaMs: number;
    tbtDeltaMs: number;
    clsDelta: number;
    seoDelta: number;
    a11yDelta: number;
    verdict: string;
  };
}

export default function ComparisonsPage() {
  const [compareMode, setCompareMode] = useState<"BATTLE" | "EXECUTION" | "JOB">("BATTLE");

  // Historical / Job state
  const [executions, setExecutions] = useState<ExecutionOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [baselineId, setBaselineId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [baselineJobId, setBaselineJobId] = useState<string>("");
  const [targetJobId, setTargetJobId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Live Competitor Battle state
  const [battleUrlA, setBattleUrlA] = useState("");
  const [battleUrlB, setBattleUrlB] = useState("");
  const [battleDevice, setBattleDevice] = useState<"MOBILE" | "DESKTOP">("MOBILE");
  const [battleLoading, setBattleLoading] = useState(false);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [battleError, setBattleError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch recent completed audits for dropdowns
    fetch("/api/v1/audits")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allExecs: ExecutionOption[] = [];
          const allJobs: JobOption[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.data.forEach((job: any) => {
            const completed = (job.executions || []).filter((ex: any) => ex.status === "COMPLETED");
            if (completed.length > 0) {
              allJobs.push({
                id: job.id,
                deviceMode: job.deviceMode,
                createdAt: job.createdAt,
                urlsCount: completed.length,
                project: job.project,
              });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            completed.forEach((ex: any) => {
              allExecs.push({
                ...ex,
                auditJob: { project: job.project },
              });
            });
          });
          setExecutions(allExecs);
          setJobs(allJobs);
          if (allExecs.length >= 2) {
            setBaselineId(allExecs[1]?.id || "");
            setTargetId(allExecs[0]?.id || "");
          }
          if (allJobs.length >= 2) {
            setBaselineJobId(allJobs[1]?.id || "");
            setTargetJobId(allJobs[0]?.id || "");
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleCompare = async () => {
    const isJobMode = compareMode === "JOB";
    if (isJobMode ? !baselineJobId || !targetJobId : !baselineId || !targetId) {
      setError(`Please select both a baseline and a target ${isJobMode ? "audit job" : "execution"}.`);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload = isJobMode
        ? { baselineJobId, targetJobId }
        : { baselineExecutionId: baselineId, targetExecutionId: targetId };

      const res = await fetch("/api/v1/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to compute comparison");
      setComparisonResult(data.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchBattle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!battleUrlA.trim() || !battleUrlB.trim()) {
      setBattleError("Please enter both your website URL and competitor website URL.");
      return;
    }

    setBattleLoading(true);
    setBattleError(null);

    try {
      const res = await fetch("/api/v1/comparisons/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlA: battleUrlA.trim(),
          urlB: battleUrlB.trim(),
          device: battleDevice,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute battle comparison");
      }
      setBattleResult(data);
    } catch (err: unknown) {
      setBattleError((err as Error).message);
    } finally {
      setBattleLoading(false);
    }
  };

  const renderDelta = (delta: number, inverse = false) => {
    const isPositiveGood = !inverse;
    const isGood = isPositiveGood ? delta > 0 : delta < 0;
    const isBad = isPositiveGood ? delta < 0 : delta > 0;

    if (delta === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-mono text-muted-foreground">
          <Minus className="w-3 h-3" /> 0
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold ${
          isGood ? "text-emerald-500" : isBad ? "text-rose-500" : "text-muted-foreground"
        }`}
      >
        {delta > 0 ? (
          <ArrowUpRight className="w-3.5 h-3.5" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5" />
        )}
        {delta > 0 ? `+${delta}` : delta}
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 50) return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    return "text-rose-500 border-rose-500/30 bg-rose-500/10";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-500" />
          Benchmark Comparisons & Competitor Battles
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Benchmark your website against industry competitors head-to-head, or analyze before-and-after optimization runs.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => { setCompareMode("BATTLE"); setError(null); }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition ${
            compareMode === "BATTLE"
              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          Competitor Battle (URL vs URL)
        </button>
        <button
          type="button"
          onClick={() => { setCompareMode("EXECUTION"); setError(null); }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition ${
            compareMode === "EXECUTION"
              ? "bg-card text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Single Audit Diff
        </button>
        <button
          type="button"
          onClick={() => { setCompareMode("JOB"); setError(null); }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition ${
            compareMode === "JOB"
              ? "bg-card text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Site-Wide Bulk Job Diff
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: COMPETITOR BATTLE (URL vs URL)                        */}
      {/* ============================================================ */}
      {compareMode === "BATTLE" && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-gradient-to-br from-card via-card to-secondary/20 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Swords className="w-4 h-4 text-primary" />
                  Head-to-Head Competitor Performance Battle
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pit your URL directly against any competitor. Runs real Google PageSpeed audits concurrently and calculates who wins Core Web Vitals.
                </p>
              </div>

              {/* Device Mode Toggle */}
              <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setBattleDevice("MOBILE")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                    battleDevice === "MOBILE"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setBattleDevice("DESKTOP")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                    battleDevice === "DESKTOP"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
              </div>
            </div>

            <form onSubmit={handleLaunchBattle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center justify-between">
                    <span>1. Your Website URL</span>
                    <span className="text-[10px] text-primary uppercase font-bold">Your Champion</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://mysite.com"
                    value={battleUrlA}
                    onChange={(e) => setBattleUrlA(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center justify-between">
                    <span>2. Competitor Website URL</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">The Challenger</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://competitor.com"
                    value={battleUrlB}
                    onChange={(e) => setBattleUrlB(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {battleError && (
                <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{battleError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={battleLoading || !battleUrlA.trim() || !battleUrlB.trim()}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow flex items-center gap-2 disabled:opacity-50"
              >
                {battleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Auditing Both Sites Concurrently (Takes ~20-30s)...
                  </>
                ) : (
                  <>
                    <Swords className="w-4 h-4" />
                    Launch Competitor Battle
                  </>
                )}
              </button>
            </form>
          </div>

          {/* BATTLE RESULTS */}
          {battleResult && (
            <div className="space-y-6">
              {/* Winner Callout Banner */}
              <div
                className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  battleResult.comparison.overallWinner === "A"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
                    : battleResult.comparison.overallWinner === "B"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                    : "bg-secondary/40 border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-full shrink-0 ${
                      battleResult.comparison.overallWinner === "A"
                        ? "bg-emerald-500 text-white"
                        : battleResult.comparison.overallWinner === "B"
                        ? "bg-amber-500 text-white"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {battleResult.comparison.overallWinner === "A" ? (
                      <Trophy className="w-5 h-5" />
                    ) : battleResult.comparison.overallWinner === "B" ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Minus className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-base font-bold">
                      {battleResult.comparison.overallWinner === "A"
                        ? "🏆 VICTORY: Your Website Outperforms The Competitor!"
                        : battleResult.comparison.overallWinner === "B"
                        ? "⚠️ COMPETITOR LEADS: Your Rival Holds the Performance Edge"
                        : "🤝 IT'S A TIE: Both Sites Are Evenly Matched"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {battleResult.comparison.verdict}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-md bg-background border border-border">
                    {battleResult.device} AUDIT
                  </span>
                </div>
              </div>

              {/* Head-to-Head Cards */}
              <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                {/* Site A (Your Champion) */}
                <div className="md:col-span-5 p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Your Website</span>
                      <div className="font-mono text-xs font-semibold truncate max-w-[240px]" title={battleResult.siteA.url}>
                        {battleResult.siteA.url}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-primary/10 text-primary border border-primary/20">
                      {battleResult.siteA.wins} Wins
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-mono ${getScoreColor(battleResult.siteA.scores.performance)}`}>
                      <span className="text-3xl font-extrabold">{battleResult.siteA.scores.performance}</span>
                      <span className="text-[10px] uppercase font-sans font-medium">Perf</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 flex-1 text-center">
                      <div className="p-2 rounded-lg bg-secondary/30 border border-border">
                        <div className="text-[10px] text-muted-foreground uppercase">SEO</div>
                        <div className="text-sm font-bold font-mono mt-0.5">{battleResult.siteA.scores.seo}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-secondary/30 border border-border">
                        <div className="text-[10px] text-muted-foreground uppercase">A11y</div>
                        <div className="text-sm font-bold font-mono mt-0.5">{battleResult.siteA.scores.accessibility}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-secondary/30 border border-border">
                        <div className="text-[10px] text-muted-foreground uppercase">BP</div>
                        <div className="text-sm font-bold font-mono mt-0.5">{battleResult.siteA.scores.bestPractices}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 grid grid-cols-3 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">LCP</span>
                      <strong>{formatMs(battleResult.siteA.metrics.lcpMs)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">TBT</span>
                      <strong>{formatMs(battleResult.siteA.metrics.tbtMs)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">CLS</span>
                      <strong>{battleResult.siteA.metrics.cls}</strong>
                    </div>
                  </div>
                </div>

                {/* VS Badge */}
                <div className="md:col-span-1 flex flex-col items-center justify-center py-2">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border text-xs font-black text-muted-foreground shadow-xs">
                    VS
                  </div>
                </div>

                {/* Site B (Competitor) */}
                <div className="md:col-span-5 p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Competitor</span>
                      <div className="font-mono text-xs font-semibold truncate max-w-[240px]" title={battleResult.siteB.url}>
                        {battleResult.siteB.url}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-secondary text-muted-foreground border border-border">
                      {battleResult.siteB.wins} Wins
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-mono ${getScoreColor(battleResult.siteB.scores.performance)}`}>
                      <span className="text-3xl font-extrabold">{battleResult.siteB.scores.performance}</span>
                      <span className="text-[10px] uppercase font-sans font-medium">Perf</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 flex-1 text-center">
                      <div className="p-2 rounded-lg bg-secondary/30 border border-border">
                        <div className="text-[10px] text-muted-foreground uppercase">SEO</div>
                        <div className="text-sm font-bold font-mono mt-0.5">{battleResult.siteB.scores.seo}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-secondary/30 border border-border">
                        <div className="text-[10px] text-muted-foreground uppercase">A11y</div>
                        <div className="text-sm font-bold font-mono mt-0.5">{battleResult.siteB.scores.accessibility}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-secondary/30 border border-border">
                        <div className="text-[10px] text-muted-foreground uppercase">BP</div>
                        <div className="text-sm font-bold font-mono mt-0.5">{battleResult.siteB.scores.bestPractices}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 grid grid-cols-3 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">LCP</span>
                      <strong>{formatMs(battleResult.siteB.metrics.lcpMs)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">TBT</span>
                      <strong>{formatMs(battleResult.siteB.metrics.tbtMs)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">CLS</span>
                      <strong>{battleResult.siteB.metrics.cls}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Battle Matrix Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="p-4 bg-secondary/30 border-b border-border font-semibold text-xs flex items-center justify-between">
                  <span>Core Web Vitals & Lighthouse Battle Breakdown</span>
                  <span className="text-[11px] text-muted-foreground font-normal">Direct Side-by-Side Delib</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/20 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Signal / Metric</th>
                        <th className="py-3 px-4">Your Site</th>
                        <th className="py-3 px-4">Competitor</th>
                        <th className="py-3 px-4 text-center">Winner</th>
                        <th className="py-3 px-4 text-right">Net Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {/* Performance */}
                      <tr>
                        <td className="py-3 px-4 font-sans font-semibold">Performance Score</td>
                        <td className="py-3 px-4 font-bold">{battleResult.siteA.scores.performance}</td>
                        <td className="py-3 px-4 text-muted-foreground">{battleResult.siteB.scores.performance}</td>
                        <td className="py-3 px-4 text-center">
                          {battleResult.comparison.perfDelta > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> You
                            </span>
                          ) : battleResult.comparison.perfDelta < 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                              Competitor
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Tie</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">{renderDelta(battleResult.comparison.perfDelta)}</td>
                      </tr>

                      {/* LCP */}
                      <tr>
                        <td className="py-3 px-4 font-sans font-semibold">Largest Contentful Paint (LCP)</td>
                        <td className="py-3 px-4 font-bold">{formatMs(battleResult.siteA.metrics.lcpMs)}</td>
                        <td className="py-3 px-4 text-muted-foreground">{formatMs(battleResult.siteB.metrics.lcpMs)}</td>
                        <td className="py-3 px-4 text-center">
                          {battleResult.comparison.lcpDeltaMs < 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> You (Faster)
                            </span>
                          ) : battleResult.comparison.lcpDeltaMs > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                              Competitor
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Tie</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">{renderDelta(battleResult.comparison.lcpDeltaMs, true)}</td>
                      </tr>

                      {/* TBT */}
                      <tr>
                        <td className="py-3 px-4 font-sans font-semibold">Total Blocking Time (TBT)</td>
                        <td className="py-3 px-4 font-bold">{formatMs(battleResult.siteA.metrics.tbtMs)}</td>
                        <td className="py-3 px-4 text-muted-foreground">{formatMs(battleResult.siteB.metrics.tbtMs)}</td>
                        <td className="py-3 px-4 text-center">
                          {battleResult.comparison.tbtDeltaMs < 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> You
                            </span>
                          ) : battleResult.comparison.tbtDeltaMs > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                              Competitor
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Tie</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">{renderDelta(battleResult.comparison.tbtDeltaMs, true)}</td>
                      </tr>

                      {/* CLS */}
                      <tr>
                        <td className="py-3 px-4 font-sans font-semibold">Cumulative Layout Shift (CLS)</td>
                        <td className="py-3 px-4 font-bold">{battleResult.siteA.metrics.cls}</td>
                        <td className="py-3 px-4 text-muted-foreground">{battleResult.siteB.metrics.cls}</td>
                        <td className="py-3 px-4 text-center">
                          {battleResult.comparison.clsDelta < 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> You
                            </span>
                          ) : battleResult.comparison.clsDelta > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                              Competitor
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Tie</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">{renderDelta(battleResult.comparison.clsDelta, true)}</td>
                      </tr>

                      {/* SEO */}
                      <tr>
                        <td className="py-3 px-4 font-sans font-semibold">Technical SEO Score</td>
                        <td className="py-3 px-4 font-bold">{battleResult.siteA.scores.seo}</td>
                        <td className="py-3 px-4 text-muted-foreground">{battleResult.siteB.scores.seo}</td>
                        <td className="py-3 px-4 text-center">
                          {battleResult.comparison.seoDelta > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> You
                            </span>
                          ) : battleResult.comparison.seoDelta < 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                              Competitor
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Tie</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">{renderDelta(battleResult.comparison.seoDelta)}</td>
                      </tr>

                      {/* Accessibility */}
                      <tr>
                        <td className="py-3 px-4 font-sans font-semibold">Accessibility (A11y)</td>
                        <td className="py-3 px-4 font-bold">{battleResult.siteA.scores.accessibility}</td>
                        <td className="py-3 px-4 text-muted-foreground">{battleResult.siteB.scores.accessibility}</td>
                        <td className="py-3 px-4 text-center">
                          {battleResult.comparison.a11yDelta > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> You
                            </span>
                          ) : battleResult.comparison.a11yDelta < 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                              Competitor
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Tie</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">{renderDelta(battleResult.comparison.a11yDelta)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Fix Callout Banner */}
              <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold flex items-center gap-1.5 text-primary">
                    <Sparkles className="w-4 h-4" />
                    Crush Your Competitor with Autonomous AI Fixes
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Commercial rivals like DebugBear charge $150+/mo just to show you charts. SpeedPilot generates exact Next.js, React & WordPress git diff patches to fix every failed metric.
                  </p>
                </div>
                <Link
                  href="/audits/new"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow flex items-center gap-1.5 shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" /> Run AI Audit & Generate Fixes <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2 & 3: HISTORICAL AUDIT & BULK JOB DIFFS                 */}
      {/* ============================================================ */}
      {compareMode !== "BATTLE" && (
        <>
          {/* Selectors Card */}
          <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">Select Audits to Compare</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  1. Baseline {compareMode === "JOB" ? "Audit Job" : "Execution"} (Before / Baseline)
                </label>
                {compareMode === "JOB" ? (
                  <select
                    value={baselineJobId}
                    onChange={(e) => setBaselineJobId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select Baseline Bulk Job...</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.project?.name} ({j.urlsCount} URLs, {j.deviceMode}) — {new Date(j.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={baselineId}
                    onChange={(e) => setBaselineId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select Baseline Execution...</option>
                    {executions.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.auditJob?.project?.name} — {e.url} ({e.device})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  2. Target {compareMode === "JOB" ? "Audit Job" : "Execution"} (After / Current)
                </label>
                {compareMode === "JOB" ? (
                  <select
                    value={targetJobId}
                    onChange={(e) => setTargetJobId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select Target Bulk Job...</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.project?.name} ({j.urlsCount} URLs, {j.deviceMode}) — {new Date(j.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select Target Execution...</option>
                    {executions.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.auditJob?.project?.name} — {e.url} ({e.device})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs">
                {error}
              </div>
            )}

            <button
              onClick={handleCompare}
              disabled={loading || (compareMode === "JOB" ? !baselineJobId || !targetJobId : !baselineId || !targetId)}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-3.5 h-3.5" />
              )}
              Compute Comparison Diffs
            </button>
          </div>

          {/* Comparison Results View */}
          {comparisonResult && (
            <div className="space-y-6">
              {/* Executive Delta Scorecards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card shadow-sm">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Performance Lift
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono">
                      {comparisonResult.target.scores?.performanceScore ?? "—"}
                    </span>
                    {renderDelta(comparisonResult.deltas.performance)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Baseline: {comparisonResult.baseline.scores?.performanceScore ?? "—"}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card shadow-sm">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                    SEO Score Shift
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono">
                      {comparisonResult.target.scores?.seoScore ?? "—"}
                    </span>
                    {renderDelta(comparisonResult.deltas.seo)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Baseline: {comparisonResult.baseline.scores?.seoScore ?? "—"}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card shadow-sm">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                    LCP Improvement
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono">
                      {formatMs(comparisonResult.target.scores?.lcpMs)}
                    </span>
                    {renderDelta(comparisonResult.deltas.lcpMs, true)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Baseline: {formatMs(comparisonResult.baseline.scores?.lcpMs)}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card shadow-sm">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Total Blocking Time
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono">
                      {formatMs(comparisonResult.target.scores?.tbtMs)}
                    </span>
                    {renderDelta(comparisonResult.deltas.tbtMs, true)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Baseline: {formatMs(comparisonResult.baseline.scores?.tbtMs)}
                  </div>
                </div>
              </div>

              {/* Side-by-Side Detailed Metrics Table */}
              <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-medium">
                    <tr>
                      <th className="py-3 px-4">Metric Benchmark</th>
                      <th className="py-3 px-4">Baseline (Before)</th>
                      <th className="py-3 px-4">Target (After)</th>
                      <th className="py-3 px-4 text-right">Net Shift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-3 px-4 font-semibold">Performance Score</td>
                      <td className="py-3 px-4 font-mono">{comparisonResult.baseline.scores?.performanceScore ?? "—"}</td>
                      <td className="py-3 px-4 font-mono font-bold">{comparisonResult.target.scores?.performanceScore ?? "—"}</td>
                      <td className="py-3 px-4 text-right">{renderDelta(comparisonResult.deltas.performance)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold">Largest Contentful Paint (LCP)</td>
                      <td className="py-3 px-4 font-mono">{formatMs(comparisonResult.baseline.scores?.lcpMs)}</td>
                      <td className="py-3 px-4 font-mono font-bold">{formatMs(comparisonResult.target.scores?.lcpMs)}</td>
                      <td className="py-3 px-4 text-right">{renderDelta(comparisonResult.deltas.lcpMs, true)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold">Total Blocking Time (TBT)</td>
                      <td className="py-3 px-4 font-mono">{formatMs(comparisonResult.baseline.scores?.tbtMs)}</td>
                      <td className="py-3 px-4 font-mono font-bold">{formatMs(comparisonResult.target.scores?.tbtMs)}</td>
                      <td className="py-3 px-4 text-right">{renderDelta(comparisonResult.deltas.tbtMs, true)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold">Cumulative Layout Shift (CLS)</td>
                      <td className="py-3 px-4 font-mono">{comparisonResult.baseline.scores?.cls ?? "—"}</td>
                      <td className="py-3 px-4 font-mono font-bold">{comparisonResult.target.scores?.cls ?? "—"}</td>
                      <td className="py-3 px-4 text-right">{renderDelta(comparisonResult.deltas.cls, true)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold">SEO Health Score</td>
                      <td className="py-3 px-4 font-mono">{comparisonResult.baseline.scores?.seoScore ?? "—"}</td>
                      <td className="py-3 px-4 font-mono font-bold">{comparisonResult.target.scores?.seoScore ?? "—"}</td>
                      <td className="py-3 px-4 text-right">{renderDelta(comparisonResult.deltas.seo)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Visual Category Score Bar Comparison */}
              <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lighthouse Category Score Visual Diff
                  </h3>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-muted-foreground/40" /> Baseline
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-primary" /> Target
                    </span>
                  </div>
                </div>
                <div className="space-y-3 text-xs">
                  {[
                    { label: "Performance", base: comparisonResult.baseline.scores?.performanceScore ?? 0, target: comparisonResult.target.scores?.performanceScore ?? 0 },
                    { label: "Accessibility", base: comparisonResult.baseline.scores?.accessibilityScore ?? 0, target: comparisonResult.target.scores?.accessibilityScore ?? 0 },
                    { label: "Best Practices", base: comparisonResult.baseline.scores?.bestPracticesScore ?? 0, target: comparisonResult.target.scores?.bestPracticesScore ?? 0 },
                    { label: "SEO", base: comparisonResult.baseline.scores?.seoScore ?? 0, target: comparisonResult.target.scores?.seoScore ?? 0 },
                  ].map((row) => (
                    <div key={row.label} className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="font-sans font-medium text-foreground">{row.label}</span>
                        <span>{row.base} → <strong>{row.target}</strong></span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-muted-foreground/40 rounded-full" style={{ width: `${Math.min(100, Math.max(0, row.base))}%` }} />
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full ${row.target >= 90 ? "bg-emerald-500" : row.target >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                            style={{ width: `${Math.min(100, Math.max(0, row.target))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historical Timeline (Single URL Mode) */}
              {Array.isArray(comparisonResult.history) && comparisonResult.history.length >= 2 && (
                <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Historical Performance Trend ({comparisonResult.history.length} Runs)
                  </h3>
                  <div className="flex items-end gap-3 h-36 pt-4 border-b border-border pb-2 overflow-x-auto">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {comparisonResult.history.map((pt: any) => (
                      <div key={pt.id} className="flex flex-col items-center gap-1 min-w-[56px] flex-1">
                        <span className="text-[10px] font-mono font-bold text-foreground">{pt.performanceScore}</span>
                        <div className="w-full max-w-[36px] bg-secondary rounded-t h-20 flex items-end overflow-hidden">
                          <div
                            className={`w-full rounded-t ${
                              pt.performanceScore >= 90 ? "bg-emerald-500" : pt.performanceScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ height: `${Math.max(8, pt.performanceScore)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(pt.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Site-Wide URL-by-URL Breakdown (Bulk Job Mode) */}
              {comparisonResult.mode === "JOB" && Array.isArray(comparisonResult.urlPairs) && (
                <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                  <div className="px-4 py-3 bg-secondary/40 border-b border-border text-xs font-semibold">
                    Site-Wide Page ROI Breakdown ({comparisonResult.urlPairs.length} URLs)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/20 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="py-2.5 px-4">URL</th>
                          <th className="py-2.5 px-3">Device</th>
                          <th className="py-2.5 px-3 text-right">Before Perf</th>
                          <th className="py-2.5 px-3 text-right">After Perf</th>
                          <th className="py-2.5 px-3 text-right">LCP Shift</th>
                          <th className="py-2.5 px-4 text-right">Net Lift</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {comparisonResult.urlPairs.map((pair: any, idx: number) => (
                          <tr key={idx} className="hover:bg-secondary/20">
                            <td className="py-2.5 px-4 font-mono truncate max-w-xs" title={pair.url}>{pair.url}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{pair.device}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{pair.beforePerf ?? "—"}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">{pair.afterPerf ?? "—"}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                              {pair.beforeLcp != null ? formatMs(pair.beforeLcp) : "—"} → {pair.afterLcp != null ? formatMs(pair.afterLcp) : "—"}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {pair.perfDelta != null ? renderDelta(pair.perfDelta) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Regressions vs Resolved Issues Breakdown (Single Execution Mode) */}
              {comparisonResult.mode !== "JOB" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                    <div className="font-semibold text-xs flex items-center gap-1.5 text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                      Resolved Issues ({comparisonResult.resolvedIssues?.length || 0})
                    </div>
                    {!comparisonResult.resolvedIssues?.length ? (
                      <p className="text-xs text-muted-foreground italic">No previously flagged issues were resolved.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {comparisonResult.resolvedIssues.map((issue: any) => (
                          <div key={issue.id} className="p-2 rounded bg-secondary/30 border border-border text-xs">
                            <div className="font-medium text-foreground">{issue.title}</div>
                            <div className="text-[11px] text-emerald-500 mt-0.5">Resolved in target run</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                    <div className="font-semibold text-xs flex items-center gap-1.5 text-rose-500">
                      <AlertTriangle className="w-4 h-4" />
                      New Regressions ({comparisonResult.newRegressions?.length || 0})
                    </div>
                    {!comparisonResult.newRegressions?.length ? (
                      <p className="text-xs text-muted-foreground italic">Zero regressions detected! Code changes did not degrade performance.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {comparisonResult.newRegressions.map((issue: any) => (
                          <div key={issue.id} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-xs">
                            <div className="font-medium text-rose-500">{issue.title}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">New bottleneck introduced in target run</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
