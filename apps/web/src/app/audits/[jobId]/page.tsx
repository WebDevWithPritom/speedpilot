"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Smartphone,
  Monitor,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Download,
  RotateCw,
  AlertCircle,
  Copy,
  Check,
  Code2,
  TrendingUp,
  Briefcase,
  Users,
  CheckCircle2,
  Terminal,
  FileText,
  Zap,
  Trash2,
  Loader2,
} from "lucide-react";
import { MetricBadge } from "@/components/ui/MetricBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMs } from "@/lib/utils";
import { usePersona, Persona, PERSONA_CONFIGS } from "@/lib/persona";
import { DeepSearchModal } from "@/components/ai/DeepSearchModal";

export default function BulkAuditJobResultsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Table filters & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<string>("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeDeepSearchTarget, setActiveDeepSearchTarget] = useState<any>(null);

  // Global Audience Persona
  const { persona, setPersona, personaConfig } = usePersona();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchJobStatus = async () => {
    try {
      const res = await fetch(`/api/v1/audits/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch audit results");
      const json = await res.json();
      setJobData(json.data);
      setLoading(false);
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobStatus();

    // Auto-poll while job is active
    const interval = setInterval(() => {
      if (jobData && (jobData.status === "PROCESSING" || jobData.status === "PENDING" || jobData.status === "QUEUED")) {
        fetchJobStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, jobData?.status]);

  const toggleRow = (executionId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(executionId)) next.delete(executionId);
      else next.add(executionId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading audit telemetry...</p>
      </div>
    );
  }

  if (error || !jobData) {
    return (
      <div className="p-6 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <div className="font-semibold text-sm">Failed to Load Audit Results</div>
          <p className="text-xs mt-0.5">{error || "Audit job record not found."}</p>
        </div>
      </div>
    );
  }

  const executions = jobData.executions || [];

  // Filter & Sort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredExecutions = executions.filter((ex: any) => {
    const matchesSearch = ex.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDevice = deviceFilter === "ALL" || ex.device === deviceFilter;
    return matchesSearch && matchesDevice;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filteredExecutions.sort((a: any, b: any) => {
    let valA = a.lighthouse?.performanceScore ?? -1;
    let valB = b.lighthouse?.performanceScore ?? -1;

    if (sortField === "lcp") {
      valA = a.lighthouse?.lcpMs ?? 999999;
      valB = b.lighthouse?.lcpMs ?? 999999;
    } else if (sortField === "issues") {
      valA = a._count?.issues ?? 0;
      valB = b._count?.issues ?? 0;
    }

    return sortOrder === "asc" ? valA - valB : valB - valA;
  });

  // Computed Persona Metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validExecutions = executions.filter((e: any) => e.status === "COMPLETED" && e.lighthouse);
  const totalCompleted = validExecutions.length || 1;

  // Developer metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avgLcp = Math.round(validExecutions.reduce((acc: number, e: any) => acc + (e.lighthouse?.lcpMs || 0), 0) / totalCompleted);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avgTbt = Math.round(validExecutions.reduce((acc: number, e: any) => acc + (e.lighthouse?.tbtMs || 0), 0) / totalCompleted);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avgCls = (validExecutions.reduce((acc: number, e: any) => acc + (e.lighthouse?.cls || 0), 0) / totalCompleted).toFixed(3);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalIssuesCount = validExecutions.reduce((acc: number, e: any) => acc + (e._count?.issues || 0), 0);

  // Marketer metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cwvPassedCount = validExecutions.filter((e: any) => (e.lighthouse?.lcpMs || 0) <= 2500 && (e.lighthouse?.cls || 0) <= 0.1).length;
  const cwvPassRate = Math.round((cwvPassedCount / totalCompleted) * 100);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avgScore = Math.round(validExecutions.reduce((acc: number, e: any) => acc + (e.lighthouse?.performanceScore || 0), 0) / totalCompleted);
  const potentialLcpSavingsSec = Math.max(0, (avgLcp - 2000) / 1000);
  const estConversionLift = Math.min(12, Math.max(1.2, Number((potentialLcpSavingsSec * 2.8).toFixed(1))));

  // Agency metrics
  const agencyGrade = avgScore >= 90 ? "A" : avgScore >= 75 ? "B" : avgScore >= 50 ? "C" : "F";
  const estBillableHours = Math.max(6, Math.min(48, Math.round(totalIssuesCount * 1.8)));
  const projectedScoreUplift = Math.min(98 - avgScore, Math.max(8, Math.round((100 - avgScore) * 0.45)));
  const quickWinsCount = Math.max(1, Math.round(totalIssuesCount * 0.4));

  // SaaS Team metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedLcp = validExecutions.map((e: any) => e.lighthouse?.lcpMs || 0).sort((a: number, b: number) => a - b);
  const p95Lcp = Math.round(sortedLcp[Math.floor(sortedLcp.length * 0.95)] || avgLcp);
  const mobileFriction = avgTbt > 300 ? "HIGH" : avgTbt > 100 ? "MODERATE" : "OPTIMAL";

  const copyDevCliCommand = () => {
    if (!jobData?.executions?.length) return;
    const sampleUrl = jobData.executions[0]?.url || "https://example.com";
    const script = `# SpeedPilot CLI Telemetry Benchmark
# Run local Lighthouse CI test on sample endpoint:
npx lighthouse-ci collect --url="${sampleUrl}" --numberOfRuns=3

# Measure TTFB & Core Web Vitals via cURL:
curl -o /dev/null -s -w 'Time Connect: %{time_connect}s | TTFB: %{time_starttransfer}s | Total: %{time_total}s\\n' "${sampleUrl}"`;
    navigator.clipboard.writeText(script);
    showToast("CLI Benchmark command copied to clipboard!");
  };

  const copyMarketerSummary = () => {
    const summary = `📊 SpeedPilot Performance & Conversion Executive Brief
Audit Target: ${jobData?.project?.name || "Target Web Properties"}
Total Pages Audited: ${jobData?.progress?.total || 0}
Core Web Vitals Pass Rate: ${cwvPassRate}%
Average Speed Health: ${avgScore}/100

📈 Business & Conversion Impact:
- Projected Conversion Lift: +${estConversionLift}% post-optimization
- Search Visibility Health: ${cwvPassRate >= 75 ? "Optimal (Passes Google CWV ranking requirements)" : "At Risk (Slow LCP is causing mobile user drop-offs and hurts SEO rankings)"}
- Key Bottleneck: ${avgLcp > 2500 ? `High Largest Contentful Paint (LCP ${avgLcp}ms > 2.5s threshold)` : `JavaScript execution delaying interactivity (TBT ${avgTbt}ms)`}

Next Steps: Prioritize image compression & third-party script deferral.
Prepared via SpeedPilot Intelligence`;
    navigator.clipboard.writeText(summary);
    showToast("Marketer Executive Brief copied to clipboard!");
  };

  const copyAgencyDeliverable = () => {
    const proposal = `💼 Client Performance Audit & Optimization Proposal
Client Property: ${jobData?.project?.name || "Client Website"}
Overall Performance Grade: ${agencyGrade} (${avgScore}/100)
Pages Evaluated: ${jobData?.progress?.total || 0}

Scope of Work & Deliverables:
- Estimated Billable Scope: ${estBillableHours} Engineering Hours
- Projected Score Gain: +${projectedScoreUplift} Points on Mobile & Desktop
- High-Priority Quick Wins Identified: ${quickWinsCount} items (Immediate impact with low effort)

Proposed Milestones:
1. Critical CWV Remediation (LCP hero image & CSS render blocking)
2. Third-Party Script Optimization (GTM, Meta Pixel, chat widget deferral)
3. AST Code Patching & Cache Invalidation
4. Final Verification & Post-Optimization Audit Report

Generated via SpeedPilot Agency Suite`;
    navigator.clipboard.writeText(proposal);
    showToast("Agency Client Proposal copied to clipboard!");
  };

  const copySaaSTickets = () => {
    const stories = `## [EPIC-PERF] Core Web Vitals & Onboarding Latency Sprint
Project: ${jobData?.project?.name || "SaaS Web Platform"}
Audited URLs: ${jobData?.progress?.total || 0}
P95 User Latency: ${p95Lcp}ms
Mobile Friction Rating: ${mobileFriction}

### Sprint Story 1: Eliminate Main-Thread Blocking to Reduce Drop-offs
- **Description:** Reduce Total Blocking Time from ${avgTbt}ms to < 100ms.
- **Acceptance Criteria:** Main thread unblocked during customer sign-up flow.
- **Priority:** High

### Sprint Story 2: Optimize Hero Asset Loading for P95 LCP Target
- **Description:** Preload critical above-the-fold assets to achieve LCP < 2.5s across all mobile routes.
- **Acceptance Criteria:** Lighthouse LCP score >= 90 on mobile.

Exported from SpeedPilot SaaS Team Console`;
    navigator.clipboard.writeText(stories);
    showToast("Jira / Linear Sprint Stories copied to clipboard!");
  };

  const handleDeleteAudit = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this audit and all its telemetry data? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/audits/${jobId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete audit");
      }
      router.push("/audits");
    } catch (err: unknown) {
      alert((err as Error).message || "An error occurred while deleting the audit.");
      setDeleting(false);
    }
  };

  const handleDeleteExecution = async (executionId: string, url: string) => {
    const confirmed = window.confirm(`Delete audit execution for "${url}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/audits/executions/${executionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete execution");
      }
      setJobData((prev: any) => {
        if (!prev) return prev;
        const target = (prev.executions || []).find((e: any) => e.id === executionId);
        const isCompleted = target?.status === "COMPLETED";
        const isFailed = target?.status === "FAILED";

        const nextTotal = Math.max(0, (prev.progress?.total ?? 1) - 1);
        const nextCompleted = isCompleted
          ? Math.max(0, (prev.progress?.completed ?? 1) - 1)
          : (prev.progress?.completed ?? 0);
        const nextFailed = isFailed
          ? Math.max(0, (prev.progress?.failed ?? 1) - 1)
          : (prev.progress?.failed ?? 0);
        const nextPct =
          nextTotal > 0
            ? Math.min(100, Math.round(((nextCompleted + nextFailed) / nextTotal) * 100))
            : 0;

        return {
          ...prev,
          executions: (prev.executions || []).filter((e: any) => e.id !== executionId),
          progress: {
            total: nextTotal,
            completed: nextCompleted,
            failed: nextFailed,
            percentage: nextPct,
          },
        };
      });
      showToast("Execution deleted successfully.");
    } catch (err: unknown) {
      alert((err as Error).message || "Error deleting execution");
    }
  };

  const isJobRunning =
    jobData.status === "PROCESSING" || jobData.status === "PENDING" || jobData.status === "QUEUED";

  return (
    <div className="space-y-6">
      {/* Top Banner / Progress */}
      <div className="p-6 rounded-lg border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Bulk Audit Results</h1>
              <StatusBadge status={jobData.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Project: <span className="font-semibold text-foreground">{jobData.project?.name}</span> ({jobData.project?.primaryDomain})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchJobStatus}
              className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-secondary transition flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={() => {
                // Export CSV of results
                const rows = [
                  ["URL", "Device", "Performance", "Accessibility", "Best Practices", "SEO", "LCP (ms)", "CLS", "INP (ms)", "Status"],
                  ...filteredExecutions.map((e: any) => [
                    e.url,
                    e.device,
                    e.lighthouse?.performanceScore ?? "",
                    e.lighthouse?.accessibilityScore ?? "",
                    e.lighthouse?.bestPracticesScore ?? "",
                    e.lighthouse?.seoScore ?? "",
                    e.lighthouse?.lcpMs ?? "",
                    e.lighthouse?.cls ?? "",
                    e.crux?.inpValueMs ?? "",
                    e.status,
                  ]),
                ];
                const csvString = rows
                  .map((r) => r.map((cell: unknown) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
                  .join("\r\n");
                const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `speedpilot_audit_${jobId.slice(0, 8)}.csv`);
                document.body.appendChild(link);
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-secondary transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            <button
              onClick={() => {
                const jsonStr = JSON.stringify(jobData, null, 2);
                const blob = new Blob([jsonStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `speedpilot_audit_${jobId.slice(0, 8)}.json`);
                document.body.appendChild(link);
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-secondary transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>

            <button
              onClick={() => {
                const jsonStr = JSON.stringify(jobData, null, 2);
                navigator.clipboard.writeText(jsonStr);
                setCopiedAll(true);
                setTimeout(() => setCopiedAll(false), 2000);
              }}
              className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-secondary transition flex items-center gap-1.5"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAll ? "Copied!" : "Copy Data"}
            </button>

            <button
              type="button"
              onClick={handleDeleteAudit}
              disabled={deleting}
              className="px-3 py-1.5 rounded border border-border text-xs font-medium text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/40 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {deleting ? "Deleting..." : "Delete Audit"}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Progress: {jobData.progress.completed} of {jobData.progress.total} executions completed
              {jobData.progress.failed > 0 && ` (${jobData.progress.failed} failed)`}
            </span>
            <span className="font-mono font-semibold">{jobData.progress.percentage}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                jobData.progress.failed > 0 ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${jobData.progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Actionable Error Guidance if Failures Occurred */}
        {jobData.progress.failed > 0 && (
          <div className="p-4 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Audit Execution Encountered an External API Constraint
            </div>
            <p className="text-muted-foreground">
              {filteredExecutions.find((e: any) => e.errorMessage)?.errorMessage || "An error occurred during audit execution."}
            </p>
            {filteredExecutions.some((e: any) => e.errorMessage?.includes("429")) && (
              <div className="pt-2 text-[11px] text-foreground border-t border-amber-500/20">
                <strong>Why this happens:</strong> Google limits anonymous/unauthenticated PageSpeed Insights requests per IP address.
                To run unlimited audits without rate-limiting, obtain a free Google PageSpeed API Key from Google Cloud Console and set <code className="font-mono bg-secondary px-1 py-0.5 rounded">GOOGLE_PAGESPEED_API_KEY</code> in your <code className="font-mono bg-secondary px-1 py-0.5 rounded">.env</code> file.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persona Differentiator & Audience Dashboard */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Segmented Persona Selector Header */}
        <div className="px-5 py-3.5 bg-secondary/30 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Audience Lens:
            </span>
            <div className="inline-flex items-center p-0.5 rounded-lg border border-border bg-background shadow-xs">
              {(Object.keys(PERSONA_CONFIGS) as Persona[]).map((pKey) => {
                const cfg = PERSONA_CONFIGS[pKey];
                const isSelected = persona === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => setPersona(pKey)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      isSelected
                        ? "bg-secondary text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {pKey === "DEVELOPER" && <Code2 className="w-3.5 h-3.5 text-blue-500" />}
                    {pKey === "MARKETER" && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                    {pKey === "AGENCY" && <Briefcase className="w-3.5 h-3.5 text-purple-500" />}
                    {pKey === "SAAS_TEAM" && <Users className="w-3.5 h-3.5 text-amber-500" />}
                    <span>{cfg.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-foreground">{personaConfig.label}:</span>
            <span className="hidden sm:inline">{personaConfig.tagline}</span>
          </div>
        </div>

        {/* Dynamic Content based on Active Persona */}
        <div className="p-5 space-y-4">
          {persona === "DEVELOPER" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Avg LCP Target</div>
                  <div className="text-xl font-bold font-mono mt-1">{avgLcp}ms</div>
                  <span className={`inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${avgLcp <= 2500 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                    {avgLcp <= 2500 ? "≤ 2500ms (Good)" : "> 2500ms (Critical)"}
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Total Blocking Time</div>
                  <div className="text-xl font-bold font-mono mt-1">{avgTbt}ms</div>
                  <span className={`inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${avgTbt <= 200 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                    {avgTbt <= 200 ? "≤ 200ms (Low JS Jitter)" : "> 200ms (Main Thread Block)"}
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Cumulative Layout Shift</div>
                  <div className="text-xl font-bold font-mono mt-1">{avgCls}</div>
                  <span className={`inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${Number(avgCls) <= 0.1 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                    {Number(avgCls) <= 0.1 ? "≤ 0.100 (Stable)" : "> 0.100 (Layout Shifts)"}
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Code Issues Detected</div>
                  <div className="text-xl font-bold font-mono mt-1 text-primary">{totalIssuesCount}</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    AST & Bundle Patches Ready
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-foreground">
                  <Terminal className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Developer Sandbox: Ready for CLI telemetry replay & local Lighthouse CI validation.</span>
                </div>
                <button
                  type="button"
                  onClick={copyDevCliCommand}
                  className="px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy CLI Benchmark Command</span>
                </button>
              </div>
            </div>
          )}

          {persona === "MARKETER" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">CWV Pass Rate</div>
                  <div className="text-xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">{cwvPassRate}%</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {cwvPassedCount} of {totalCompleted} Pages Passing
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Est. Conversion Lift</div>
                  <div className="text-xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">+{estConversionLift}%</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Post-Optimization Uplift
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">SEO Search Health</div>
                  <div className="text-xl font-bold font-mono mt-1">{cwvPassRate >= 75 ? "Optimal" : "At Risk"}</div>
                  <span className={`inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${cwvPassRate >= 75 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                    {cwvPassRate >= 75 ? "Passes Google CWV Signals" : "Slow LCP Causes Drop-offs"}
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Speed Score Average</div>
                  <div className="text-xl font-bold font-mono mt-1">{avgScore}/100</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-secondary text-foreground">
                    Lighthouse Benchmark
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Marketing Brief: Plain-English ROI & organic conversion summary ready for stakeholders.</span>
                </div>
                <button
                  type="button"
                  onClick={copyMarketerSummary}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Copy Marketer Executive Brief</span>
                </button>
              </div>
            </div>
          )}

          {persona === "AGENCY" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Client Speed Grade</div>
                  <div className="text-xl font-bold font-mono mt-1 text-purple-600 dark:text-purple-400">Grade {agencyGrade}</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    {avgScore}/100 Avg Baseline
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Billable Dev Scope</div>
                  <div className="text-xl font-bold font-mono mt-1">~{estBillableHours} Hours</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    Engineering Effort
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Target Score Uplift</div>
                  <div className="text-xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">+{projectedScoreUplift} Pts</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Projected Gain: {avgScore + projectedScoreUplift}/100
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Quick Wins Available</div>
                  <div className="text-xl font-bold font-mono mt-1 text-primary">{quickWinsCount} Wins</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    Immediate Impact / Low Effort
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-foreground">
                  <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Agency Suite: Deliverable-ready scope of work and score projection for client proposals.</span>
                </div>
                <button
                  type="button"
                  onClick={copyAgencyDeliverable}
                  className="px-3 py-1.5 rounded-md bg-purple-600 text-white font-medium hover:bg-purple-700 transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Client Proposal Deliverable</span>
                </button>
              </div>
            </div>
          )}

          {persona === "SAAS_TEAM" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">P95 User Latency</div>
                  <div className="text-xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">{p95Lcp}ms</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    Worst-Case User Experience
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Mobile Friction</div>
                  <div className="text-xl font-bold font-mono mt-1">{mobileFriction}</div>
                  <span className={`inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${mobileFriction === "OPTIMAL" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                    Sign-up & Onboarding Flow
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Sprint Tickets Ready</div>
                  <div className="text-xl font-bold font-mono mt-1 text-primary">{totalIssuesCount} Tickets</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    Prioritized for Jira / Linear
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Est. Server TTFB</div>
                  <div className="text-xl font-bold font-mono mt-1">{formatMs(Math.round(avgLcp * 0.25))}</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-secondary text-foreground">
                    Backend Response Baseline
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-foreground">
                  <Users className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>SaaS Team: Ready-to-import Jira / Linear user stories for the upcoming sprint.</span>
                </div>
                <button
                  type="button"
                  onClick={copySaaSTickets}
                  className="px-3 py-1.5 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Export Jira / Linear Sprint Stories</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audited URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Device Segmented Tabs */}
          <div className="inline-flex items-center rounded-lg border border-border p-0.5 bg-secondary/40 text-xs">
            <button
              type="button"
              onClick={() => setDeviceFilter("ALL")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                deviceFilter === "ALL"
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setDeviceFilter("MOBILE")}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                deviceFilter === "MOBILE"
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3 h-3 text-primary" />
              <span>Mobile</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceFilter("DESKTOP")}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                deviceFilter === "DESKTOP"
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="w-3 h-3 text-primary" />
              <span>Desktop</span>
            </button>
          </div>

          {/* Sort By */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="score">Sort: Performance Score</option>
            <option value="lcp">Sort: LCP Time</option>
            <option value="issues">Sort: Issue Count</option>
          </select>

          <button
            onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            className="p-1.5 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition"
            title="Toggle sort direction"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
        {/* Metric Explanation Legend for Marketers & Developers */}
        <div className="px-4 py-2 bg-secondary/20 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Score Ranges:</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 90–100 (Good)</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 50–89 (Needs Work)</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> 0–49 (Poor)</span>
          </div>
          <div className="text-[11px] text-muted-foreground/80">
            Hover column titles for full metric definitions & CWV thresholds
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-medium">
              {/* Category Super-Headers */}
              <tr className="border-b border-border/60 text-[10px] uppercase tracking-wider font-semibold">
                <th colSpan={3} className="py-1.5 px-4 text-foreground/80 bg-secondary/30">
                  Target Page & Device
                </th>
                <th colSpan={5} className="py-1.5 px-3 text-center text-foreground/80 bg-secondary/50 border-x border-border/60">
                  Lighthouse & Agentic Scores (0–100)
                </th>
                <th colSpan={3} className="py-1.5 px-3 text-center text-foreground/80 bg-secondary/30 border-r border-border/60">
                  Core Web Vitals
                </th>
                <th colSpan={2} className="py-1.5 px-4 text-center text-foreground/80 bg-secondary/50">
                  Audit State
                </th>
              </tr>
              {/* Individual Column Headers (Single Line, Compact & Clean) */}
              <tr className="text-xs">
                <th className="py-2.5 px-2 w-8"></th>
                <th className="py-2.5 px-2.5 whitespace-nowrap font-semibold text-foreground">
                  URL
                </th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap font-semibold text-foreground" title="Audit Device Strategy">
                  Device
                </th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap font-semibold text-foreground border-l border-border/40" title="Overall loading speed and rendering performance score (0-100)">
                  Perf
                </th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap font-semibold text-foreground" title="Screen reader usability, color contrast, and ARIA attributes (0-100)">
                  A11y
                </th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap font-semibold text-foreground" title="HTTPS security, modern web standards, and console hygiene (0-100)">
                  Best
                </th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap font-semibold text-foreground" title="Technical SEO indexability, meta tags, and structured data (0-100)">
                  SEO
                </th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap font-semibold text-foreground border-r border-border/40" title="Google Agentic Browsing & WebMCP readiness for AI browsing agents">
                  Agentic
                </th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap font-semibold text-foreground" title="Largest Contentful Paint: Time until main visual content renders. Good: ≤ 2.5s">
                  LCP
                </th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap font-semibold text-foreground" title="Cumulative Layout Shift: Unexpected visual layout jumps. Good: ≤ 0.1">
                  CLS
                </th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap font-semibold text-foreground border-r border-border/40" title="Interaction to Next Paint: Real Chrome user click/tap latency. Good: ≤ 200ms">
                  INP
                </th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap font-semibold text-foreground">
                  Status
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredExecutions.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center text-muted-foreground">
                    No execution results match your search query.
                  </td>
                </tr>
              ) : (
                filteredExecutions.map((ex: any) => {
                  const isExpanded = expandedRows.has(ex.id);
                  const lh = ex.lighthouse;
                  const crux = ex.crux;

                  return (
                    <React.Fragment key={ex.id}>
                      <tr className="hover:bg-secondary/20 transition-colors">
                        <td className="py-2 px-2">
                          <button
                            onClick={() => toggleRow(ex.id)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </td>

                        {/* URL with external icon */}
                        <td className="py-2 px-2.5 font-mono">
                          <div className="flex items-center gap-1.5 max-w-xs truncate" title={ex.url}>
                            <span className="truncate">{ex.url}</span>
                            <a
                              href={ex.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-foreground shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>

                        {/* Device Badge */}
                        <td className="py-2 px-1.5 text-center">
                          {ex.device === "MOBILE" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title="Mobile">
                              <Smartphone className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title="Desktop">
                              <Monitor className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>

                        {/* Scores */}
                        <td className="py-2 px-2 text-center border-l border-border/40">
                          <MetricBadge score={lh?.performanceScore} size="sm" />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <MetricBadge score={lh?.accessibilityScore} size="sm" />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <MetricBadge score={lh?.bestPracticesScore} size="sm" />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <MetricBadge score={lh?.seoScore} size="sm" />
                        </td>
                        <td className="py-2 px-2 text-center border-r border-border/40">
                          {lh?.agenticRatio ? (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                                (lh.agenticScore ?? 0) >= 90
                                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                  : (lh.agenticScore ?? 0) >= 50
                                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                              }`}
                              title={`Agentic Browsing: ${lh.agenticRatio} passed (${lh.agenticScore ?? 0}%)`}
                            >
                              {lh.agenticRatio}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60">—</span>
                          )}
                        </td>

                        {/* Lab Metrics */}
                        <td className="py-2 px-2.5 text-right font-mono font-medium">
                          {formatMs(lh?.lcpMs)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-medium">
                          {lh?.cls != null ? lh.cls.toFixed(3) : "—"}
                        </td>

                        {/* INP Field Data */}
                        <td className="py-2 px-2 text-center border-r border-border/40">
                          {crux?.inpValueMs != null ? (
                            <span className="font-mono text-xs">{crux.inpValueMs}ms</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/70 italic" title="CrUX requires minimum 28-day user sessions">
                              —
                            </span>
                          )}
                        </td>

                        {/* Execution Status */}
                        <td className="py-2 px-2 text-center">
                          <StatusBadge status={ex.status} />
                        </td>

                        {/* Action Link */}
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/audits/executions/${ex.id}`}
                              className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-semibold transition"
                            >
                              Deep Dive
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDeleteExecution(ex.id, ex.url)}
                              title="Delete Execution"
                              className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Opportunity Summary */}
                      {isExpanded && (
                        <tr className="bg-secondary/30">
                          <td colSpan={13} className="py-4 px-8">
                            {ex.status === "FAILED" ? (
                              <div className="p-3.5 rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs space-y-1.5">
                                <div className="font-semibold flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  Execution Error: {ex.errorMessage || "Audit failed during execution"}
                                </div>
                                <p className="text-muted-foreground text-[11px]">
                                  {ex.errorMessage?.includes("429")
                                    ? "Google PageSpeed Insights API rejected the anonymous request due to IP quota limits. Configure GOOGLE_PAGESPEED_API_KEY in .env to remove this restriction."
                                    : ex.url.endsWith(".xml")
                                    ? "Lighthouse can only audit HTML web pages. If you intended to audit a sitemap, please use the XML Sitemap tab to discover the actual pages within it."
                                    : "Ensure the target website is publicly accessible and allows incoming requests from auditing agents."}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    Executive Insights & Diagnostics Overview
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveDeepSearchTarget({
                                          url: ex.url,
                                          techStack: "NEXTJS",
                                          issue: {
                                            code: "render-blocking-resources",
                                            title: "Optimize Critical Rendering Path",
                                            category: "PERFORMANCE",
                                            severity: "HIGH",
                                            displayValue: `Savings: ${formatMs(lh?.tbtMs || 450)}`,
                                          },
                                        })
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-semibold transition shadow-xs"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      Launch AI Deep Search
                                    </button>
                                    <Link
                                      href={`/audits/executions/${ex.id}`}
                                      className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
                                    >
                                      View Full Analysis & AI Code Diffs →
                                    </Link>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
                                  <div className="p-2.5 rounded border border-border bg-card">
                                    <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                                      First Paint (FCP)
                                    </div>
                                    <div className="font-mono font-bold text-sm mt-0.5">{formatMs(lh?.fcpMs)}</div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">When first content appears</p>
                                  </div>

                                  <div className="p-2.5 rounded border border-border bg-card">
                                    <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                                      Main Load (LCP)
                                    </div>
                                    <div className="font-mono font-bold text-sm mt-0.5">{formatMs(lh?.lcpMs)}</div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">When main banner/hero loads</p>
                                  </div>

                                  <div className="p-2.5 rounded border border-border bg-card">
                                    <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                                      Blocking Time (TBT)
                                    </div>
                                    <div className="font-mono font-bold text-sm mt-0.5">{formatMs(lh?.tbtMs)}</div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Main thread JS delays</p>
                                  </div>

                                  <div className="p-2.5 rounded border border-border bg-card">
                                    <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                                      Identified Bottlenecks
                                    </div>
                                    <div className="font-mono font-bold text-sm mt-0.5 text-primary">
                                      {ex._count?.issues ?? 0} Opportunities
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Ready for AI remediation</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Deep Search Modal */}
      {activeDeepSearchTarget && (
        <DeepSearchModal
          isOpen={!!activeDeepSearchTarget}
          onClose={() => setActiveDeepSearchTarget(null)}
          targetUrl={activeDeepSearchTarget.url}
          techStack={activeDeepSearchTarget.techStack || "NEXTJS"}
          issue={activeDeepSearchTarget.issue}
          initialPersona={persona}
        />
      )}

      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

