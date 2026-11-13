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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-medium">
              <tr>
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4">URL</th>
                <th className="py-3 px-3 text-center">Device</th>
                <th className="py-3 px-3 text-center">Perf</th>
                <th className="py-3 px-3 text-center">A11y</th>
                <th className="py-3 px-3 text-center">Best</th>
                <th className="py-3 px-3 text-center">SEO</th>
                <th className="py-3 px-3 text-right">LCP (Lab)</th>
                <th className="py-3 px-3 text-right">CLS</th>
                <th className="py-3 px-3 text-center">INP (Field)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredExecutions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-muted-foreground">
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
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleRow(ex.id)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </td>

                        {/* URL with external icon */}
                        <td className="py-3 px-4 font-mono">
                          <div className="flex items-center gap-1.5 max-w-sm truncate" title={ex.url}>
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
                        <td className="py-3 px-3 text-center">
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
                        <td className="py-3 px-3 text-center">
                          <MetricBadge score={lh?.performanceScore} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <MetricBadge score={lh?.accessibilityScore} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <MetricBadge score={lh?.bestPracticesScore} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <MetricBadge score={lh?.seoScore} size="sm" />
                        </td>

                        {/* Lab Metrics */}
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          {formatMs(lh?.lcpMs)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          {lh?.cls != null ? lh.cls.toFixed(3) : "—"}
                        </td>

                        {/* INP Field Data */}
                        <td className="py-3 px-3 text-center">
                          {crux?.inpValueMs != null ? (
                            <span className="font-mono text-xs">{crux.inpValueMs}ms</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/70 italic" title="CrUX requires minimum 28-day user sessions">
                              No Field Data
                            </span>
                          )}
                        </td>

                        {/* Execution Status */}
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={ex.status} />
                        </td>

                        {/* Action Link */}
                        <td className="py-3 px-4 text-right">
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
                          <td colSpan={12} className="py-3 px-8">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                                  Diagnostic Opportunities & AI Suggestions
                                </span>
                                <Link
                                  href={`/audits/executions/${ex.id}`}
                                  className="text-primary hover:underline text-[11px] font-medium"
                                >
                                  View Full Analysis & AI Code Diffs →
                                </Link>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                <div className="p-2.5 rounded border border-border bg-card">
                                  <div className="text-muted-foreground text-[11px]">Total Blocking Time (TBT)</div>
                                  <div className="font-mono font-bold text-sm mt-0.5">{formatMs(lh?.tbtMs)}</div>
                                </div>
                                <div className="p-2.5 rounded border border-border bg-card">
                                  <div className="text-muted-foreground text-[11px]">First Contentful Paint (FCP)</div>
                                  <div className="font-mono font-bold text-sm mt-0.5">{formatMs(lh?.fcpMs)}</div>
                                </div>
                                <div className="p-2.5 rounded border border-border bg-card">
                                  <div className="text-muted-foreground text-[11px]">Identified Issues</div>
                                  <div className="font-mono font-bold text-sm mt-0.5">{ex._count?.issues ?? 0} found</div>
                                </div>
                              </div>
                            </div>
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

