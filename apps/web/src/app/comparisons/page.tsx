"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { MetricBadge } from "@/components/ui/MetricBadge";
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

export default function ComparisonsPage() {
  const [executions, setExecutions] = useState<ExecutionOption[]>([]);
  const [baselineId, setBaselineId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch recent completed audits
    fetch("/api/v1/audits")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allExecs: ExecutionOption[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.data.forEach((job: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (job.executions || []).forEach((ex: any) => {
              if (ex.status === "COMPLETED") {
                allExecs.push({
                  ...ex,
                  auditJob: { project: job.project },
                });
              }
            });
          });
          setExecutions(allExecs);
          if (allExecs.length >= 2) {
            setBaselineId(allExecs[1]?.id || "");
            setTargetId(allExecs[0]?.id || "");
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleCompare = async () => {
    if (!baselineId || !targetId) {
      setError("Please select both a baseline and a target audit execution.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baselineExecutionId: baselineId,
          targetExecutionId: targetId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to compare executions");
      setComparisonResult(data.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderDelta = (delta: number, inverse = false) => {
    // For scores: positive is good
    // For time/CLS (inverse): negative is good
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-500" />
          Benchmark Comparisons & Regression Matrix
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare before-and-after audit snapshots to verify optimization impact or benchmark against competitors.
        </p>
      </div>

      {/* Selectors Card */}
      <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">Select Audits to Compare</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              1. Baseline Audit (Before / Competitor)
            </label>
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
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              2. Target Audit (After / Current)
            </label>
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
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs">
            {error}
          </div>
        )}

        <button
          onClick={handleCompare}
          disabled={loading || !baselineId || !targetId}
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

          {/* Regressions vs Resolved Issues Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
              <div className="font-semibold text-xs flex items-center gap-1.5 text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
                Resolved Issues ({comparisonResult.resolvedIssues.length})
              </div>
              {comparisonResult.resolvedIssues.length === 0 ? (
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
                New Regressions ({comparisonResult.newRegressions.length})
              </div>
              {comparisonResult.newRegressions.length === 0 ? (
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
        </div>
      )}
    </div>
  );
}
