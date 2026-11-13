"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { MetricBadge } from "@/components/ui/MetricBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMs } from "@/lib/utils";

export default function BulkAuditJobResultsPage() {
  const params = useParams();
  const jobId = params?.jobId as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table filters & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<string>("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copiedAll, setCopiedAll] = useState(false);

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
                const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `speedpilot_audit_${jobId.slice(0, 8)}.csv`);
                document.body.appendChild(link);
                link.click();
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

        <div className="flex items-center gap-2">
          {/* Device Filter */}
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Devices</option>
            <option value="MOBILE">Mobile Only</option>
            <option value="DESKTOP">Desktop Only</option>
          </select>

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
                          <Link
                            href={`/audits/executions/${ex.id}`}
                            className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-semibold transition"
                          >
                            Deep Dive
                          </Link>
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
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    Executive Insights & Diagnostics Overview
                                  </span>
                                  <Link
                                    href={`/audits/executions/${ex.id}`}
                                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
                                  >
                                    View Full Analysis & AI Code Diffs →
                                  </Link>
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
    </div>
  );
}

