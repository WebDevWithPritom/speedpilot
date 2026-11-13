"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Sparkles,
  Smartphone,
  Monitor,
  RefreshCw,
} from "lucide-react";

interface AuditScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  agenticBrowsing?: number;
}

interface AuditMetrics {
  lcp: number;
  fcp: number;
  cls: number;
  tbt: number;
  si: number;
}

interface Opportunity {
  id: string;
  title: string;
  description: string;
  score: number | null;
  savings?: string;
}

interface TrialResult {
  url: string;
  device: "MOBILE" | "DESKTOP";
  scores: AuditScores;
  metrics: AuditMetrics;
  topOpportunities: Opportunity[];
  unlockedWithAccount: string[];
}

function getScoreBadge(score: number) {
  if (score >= 90) {
    return {
      text: `${score}`,
      color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
      label: "Good",
    };
  }
  if (score >= 50) {
    return {
      text: `${score}`,
      color: "text-amber-500 border-amber-500/30 bg-amber-500/10",
      label: "Needs Work",
    };
  }
  return {
    text: `${score}`,
    color: "text-red-500 border-red-500/30 bg-red-500/10",
    label: "Poor",
  };
}

export function InstantAuditBar() {
  const [url, setUrl] = useState("");
  const [device, setDevice] = useState<"MOBILE" | "DESKTOP">("MOBILE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrialResult | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const steps = [
    "Connecting to Google Lighthouse lab...",
    "Measuring Largest Contentful Paint (LCP)...",
    "Auditing Accessibility, SEO & best practices...",
    "Synthesizing optimization opportunities...",
  ];

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const res = await fetch("/api/v1/audits/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), device }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok) {
        throw new Error(data.error || "Failed to run audit");
      }

      setResult(data);
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err?.message || "Audit failed. Make sure the URL is public and reachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Test Bar Box */}
      <div className="rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-md p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Input Form */}
        {!result && (
          <form onSubmit={handleAudit} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pb-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Instant 1-Click Speed Test (No Sign-in Required)
              </span>

              <div className="flex items-center gap-1 p-0.5 rounded-lg border border-border bg-secondary/50">
                <button
                  type="button"
                  onClick={() => setDevice("MOBILE")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                    device === "MOBILE"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setDevice("DESKTOP")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                    device === "DESKTOP"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  Desktop
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. vercel.com or https://myshop.com"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Run Free Audit</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Demo Pre-fills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <span>Try an example:</span>
              {["github.com", "nytimes.com", "stripe.com"].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setUrl(`https://${sample}`)}
                  className="px-2 py-0.5 rounded border border-border hover:bg-secondary hover:text-foreground transition cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Loading indicator */}
            {loading && (
              <div className="pt-3 pb-1 space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-medium text-primary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{steps[loadingStep]}</span>
                </div>
                <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500 ease-out"
                    style={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        )}

        {/* Audit Results View */}
        {result && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Audit Complete
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground font-semibold">
                    {result.device}
                  </span>
                </div>
                <h3 className="font-mono text-sm font-bold truncate max-w-md mt-0.5">
                  {result.url}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Test Another URL
              </button>
            </div>

            {/* Scores Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "Performance", score: result.scores.performance },
                { label: "Accessibility", score: result.scores.accessibility },
                { label: "Best Practices", score: result.scores.bestPractices },
                { label: "SEO", score: result.scores.seo },
              ].map((item) => {
                const badge = getScoreBadge(item.score);
                return (
                  <div
                    key={item.label}
                    className={`p-3 rounded-xl border text-center ${badge.color}`}
                  >
                    <div className="text-2xl font-extrabold font-mono tracking-tight">
                      {badge.text}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5 opacity-90">
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-secondary/30 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                  LCP (Speed)
                </div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {(result.metrics.lcp / 1000).toFixed(2)}s
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {result.metrics.lcp <= 2500 ? "Good (≤2.5s)" : "Needs Work"}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-secondary/30 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                  TBT (Blocking)
                </div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {Math.round(result.metrics.tbt)}ms
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {result.metrics.tbt <= 200 ? "Good (≤200ms)" : "High Delay"}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-secondary/30 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                  CLS (Stability)
                </div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {result.metrics.cls.toFixed(3)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {result.metrics.cls <= 0.1 ? "Stable (≤0.1)" : "Shifting"}
                </div>
              </div>
            </div>

            {/* Top Opportunities */}
            {result.topOpportunities.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Top Speed Bottlenecks Detected</span>
                  <span className="text-[10px] text-muted-foreground">
                    {result.topOpportunities.length} high priority
                  </span>
                </div>
                <div className="space-y-1.5">
                  {result.topOpportunities.map((op) => (
                    <div
                      key={op.id}
                      className="p-2.5 rounded-lg border border-border bg-card/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">{op.title}</div>
                        <div className="text-muted-foreground text-[11px] line-clamp-1">
                          {op.description}
                        </div>
                      </div>
                      {op.savings && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary/10 text-primary shrink-0">
                          {op.savings}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sign Up Teaser CTA */}
            <div className="p-4 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Sparkles className="w-4 h-4" />
                <span>Want Framework-Aware AI Code Fixes For This URL?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create a free account to generate instant code diffs (Next.js, React, WordPress),
                save historical benchmarks, and audit your entire sitemap in bulk.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link
                  href={`/signup?url=${encodeURIComponent(result.url)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
                >
                  <span>Create Free Account &amp; Fix Bottlenecks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/login"
                  className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition"
                >
                  Already have an account? Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
