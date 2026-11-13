"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Smartphone,
  Monitor,
  ExternalLink,
  Sparkles,
  Search,
  Code2,
  Users,
  Briefcase,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ShieldCheck,
  Bot,
  Compass,
  ChevronDown,
  ChevronUp,
  Cpu,
  MoreVertical,
  Printer,
  Download,
  FileText,
  Moon,
  Sun,
  Activity,
  X,
} from "lucide-react";
import { MetricBadge } from "@/components/ui/MetricBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMs } from "@/lib/utils";

type AudienceMode = "DEVELOPER" | "MARKETER" | "AGENCY" | "SAAS_TEAM";

export default function ExecutionDeepDivePage() {
  const params = useParams();
  const id = params?.id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [execution, setExecution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audience presentation mode
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("DEVELOPER");
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [agentTreeOpen, setAgentTreeOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [traceModalOpen, setTraceModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#lighthouse-action-menu")) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [menuOpen]);

  const copyJson = () => {
    if (!execution) return;
    const jsonStr = JSON.stringify(execution, null, 2);
    navigator.clipboard.writeText(jsonStr);
    showToast("Audit JSON copied to clipboard!");
  };

  const downloadJson = () => {
    if (!execution) return;
    const jsonStr = JSON.stringify(execution, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanUrl = execution.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    a.download = `lighthouse-audit-${cleanUrl}-${execution.device}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded audit JSON file!");
  };

  const downloadHtml = () => {
    if (!execution) return;
    const cleanUrl = execution.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    const htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lighthouse Audit Report: ${execution.url}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; padding: 40px; margin: 0; }
    .header { border-bottom: 1px solid #27272a; padding-bottom: 20px; margin-bottom: 24px; }
    h1 { font-size: 20px; font-mono: monospace; margin: 0 0 8px 0; }
    .meta { color: #a1a1aa; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin: 24px 0; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; text-align: center; }
    .score { font-size: 32px; font-weight: bold; margin-top: 8px; font-family: monospace; }
    .score.good { color: #10b981; }
    .score.warning { color: #f59e0b; }
    .score.poor { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #27272a; }
    th { background: #18181b; color: #a1a1aa; font-weight: 600; }
    code { font-family: monospace; color: #60a5fa; background: #18181b; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Lighthouse Inspection: ${execution.url}</h1>
    <div class="meta">Device: ${execution.device} | Audited: ${new Date(execution.createdAt).toLocaleString()} | Project: ${execution.auditJob?.project?.name || "SpeedPilot"}</div>
  </div>
  <div class="grid">
    <div class="card"><div>Performance</div><div class="score ${(execution.lighthouse?.performanceScore ?? 0) >= 90 ? 'good' : (execution.lighthouse?.performanceScore ?? 0) >= 50 ? 'warning' : 'poor'}">${execution.lighthouse?.performanceScore ?? "—"}</div></div>
    <div class="card"><div>Accessibility</div><div class="score ${(execution.lighthouse?.accessibilityScore ?? 0) >= 90 ? 'good' : (execution.lighthouse?.accessibilityScore ?? 0) >= 50 ? 'warning' : 'poor'}">${execution.lighthouse?.accessibilityScore ?? "—"}</div></div>
    <div class="card"><div>Best Practices</div><div class="score ${(execution.lighthouse?.bestPracticesScore ?? 0) >= 90 ? 'good' : (execution.lighthouse?.bestPracticesScore ?? 0) >= 50 ? 'warning' : 'poor'}">${execution.lighthouse?.bestPracticesScore ?? "—"}</div></div>
    <div class="card"><div>SEO Health</div><div class="score ${(execution.lighthouse?.seoScore ?? 0) >= 90 ? 'good' : (execution.lighthouse?.seoScore ?? 0) >= 50 ? 'warning' : 'poor'}">${execution.lighthouse?.seoScore ?? "—"}</div></div>
    <div class="card"><div>Agentic AI</div><div class="score warning">${execution.lighthouse?.agenticRatio || (execution.lighthouse?.agenticScore ?? "—")}</div></div>
  </div>
  <h3>Core Web Vitals</h3>
  <p class="meta">LCP: ${execution.lighthouse?.lcpMs ?? 0}ms | TBT: ${execution.lighthouse?.tbtMs ?? 0}ms | CLS: ${execution.lighthouse?.cls ?? 0}</p>
  <h3>Identified Opportunities & Diagnostics (${execution.issues?.length || 0})</h3>
  <table>
    <thead><tr><th>Issue Title</th><th>Category</th><th>Severity</th></tr></thead>
    <tbody>
      ${(execution.issues || []).map((i: any) => `<tr><td><strong>${i.title}</strong></td><td>${i.category}</td><td>${i.severity}</td></tr>`).join("")}
    </tbody>
  </table>
</body>
</html>`;
    const blob = new Blob([htmlReport], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lighthouse-report-${cleanUrl}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded standalone HTML report!");
  };

  useEffect(() => {
    fetch(`/api/v1/audits/executions/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setExecution(data.data);
        else setError(data.error || "Failed to load audit");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const copySnippet = (snippet: string, index: number) => {
    navigator.clipboard.writeText(snippet);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading diagnostic telemetry...</p>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="p-6 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div>
          <div className="font-semibold text-sm">Failed to Load Execution</div>
          <p className="text-xs mt-0.5">{error || "Execution record not found."}</p>
        </div>
      </div>
    );
  }

  const lh = execution.lighthouse;
  const crux = execution.crux;
  const seo = execution.seo;
  const issues = execution.issues || [];
  const agentTreeIssue = issues.find((i: any) => i.code === "agent-accessibility-tree");
  const agentEvidence: any[] = Array.isArray(agentTreeIssue?.evidenceDetails)
    ? agentTreeIssue.evidenceDetails
    : [];

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & URL Bar */}
      <div className="space-y-2">
        <Link
          href={`/audits/${execution.auditJobId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Bulk Results
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-semibold text-foreground truncate max-w-xl">
                {execution.url}
              </span>
              <a
                href={execution.url}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <StatusBadge status={execution.status} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>Project: {execution.auditJob?.project?.name}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                {execution.device === "MOBILE" ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5" /> Mobile Audit
                  </>
                ) : (
                  <>
                    <Monitor className="w-3.5 h-3.5" /> Desktop Audit
                  </>
                )}
              </span>
              <span>•</span>
              <span>{new Date(execution.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Lighthouse 3-Dot Action Menu */}
          <div className="relative shrink-0" id="lighthouse-action-menu">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition border border-border/60 hover:border-border shadow-sm flex items-center justify-center bg-card"
              title="Lighthouse Actions & Exports"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-2xl z-50 py-1 text-xs text-foreground divide-y divide-border/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      window.print();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-secondary/70 flex items-center gap-2.5 transition text-foreground"
                  >
                    <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Print Summary</span>
                  </button>
                  <button
                    onClick={() => {
                      setAgentTreeOpen(true);
                      setMenuOpen(false);
                      setTimeout(() => window.print(), 250);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-secondary/70 flex items-center gap-2.5 transition text-foreground"
                  >
                    <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Print Expanded</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      copyJson();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-secondary/70 flex items-center gap-2.5 transition text-foreground"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Copy JSON</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      downloadHtml();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-secondary/70 flex items-center gap-2.5 transition text-foreground"
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Save as HTML</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      downloadJson();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-secondary/70 flex items-center gap-2.5 transition text-foreground"
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Save as JSON</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      window.open("https://googlechrome.github.io/lighthouse/viewer/", "_blank");
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-secondary/70 flex items-center gap-2.5 transition text-foreground"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Open in Viewer</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setTraceModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-secondary/70 flex items-center gap-2.5 transition text-foreground"
                  >
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>View Unthrottled Trace</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      document.documentElement.classList.toggle("dark");
                      showToast("Toggled color theme");
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-secondary/70 flex items-center gap-2.5 transition text-foreground"
                  >
                    <Moon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Toggle Dark Theme</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5 Core Scorecard Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Performance
            </div>
            <div className="text-[11px] text-muted-foreground/80 mt-0.5">Speed & Vitals</div>
          </div>
          <MetricBadge score={lh?.performanceScore} size="lg" />
        </div>

        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Accessibility
            </div>
            <div className="text-[11px] text-muted-foreground/80 mt-0.5">WCAG Compliance</div>
          </div>
          <MetricBadge score={lh?.accessibilityScore} size="lg" />
        </div>

        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Best Practices
            </div>
            <div className="text-[11px] text-muted-foreground/80 mt-0.5">Modern Standards</div>
          </div>
          <MetricBadge score={lh?.bestPracticesScore} size="lg" />
        </div>

        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              SEO Score
            </div>
            <div className="text-[11px] text-muted-foreground/80 mt-0.5">Indexability</div>
          </div>
          <MetricBadge score={lh?.seoScore} size="lg" />
        </div>

        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-primary" />
              Agentic AI
            </div>
            <div className="text-[11px] text-muted-foreground/80 mt-0.5">AI Agent Readiness</div>
          </div>
          <div className="flex flex-col items-end">
            <span
              className={`px-2.5 py-1 rounded font-mono font-extrabold text-sm border ${
                (lh?.agenticScore ?? 0) >= 90
                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                  : (lh?.agenticScore ?? 0) >= 50
                  ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                  : "bg-rose-500/15 text-rose-500 border-rose-500/30"
              }`}
            >
              {lh?.agenticRatio || `${lh?.agenticScore ?? 0}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Lab Metrics vs. Field Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Synthetic Lab Metrics */}
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-blue-500" />
              Lighthouse Synthetic Lab Metrics
            </h2>
            <span className="text-[11px] text-muted-foreground font-mono">Emulated Conditions</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded border border-border bg-secondary/30">
              <div className="text-[11px] text-muted-foreground">Largest Contentful Paint</div>
              <div className="text-base font-bold font-mono mt-0.5">{formatMs(lh?.lcpMs)}</div>
            </div>
            <div className="p-3 rounded border border-border bg-secondary/30">
              <div className="text-[11px] text-muted-foreground">Total Blocking Time (TBT)</div>
              <div className="text-base font-bold font-mono mt-0.5">{formatMs(lh?.tbtMs)}</div>
            </div>
            <div className="p-3 rounded border border-border bg-secondary/30">
              <div className="text-[11px] text-muted-foreground">Cumulative Layout Shift</div>
              <div className="text-base font-bold font-mono mt-0.5">{lh?.cls != null ? lh.cls.toFixed(3) : "—"}</div>
            </div>
            <div className="p-3 rounded border border-border bg-secondary/30">
              <div className="text-[11px] text-muted-foreground">First Contentful Paint</div>
              <div className="text-base font-bold font-mono mt-0.5">{formatMs(lh?.fcpMs)}</div>
            </div>
            <div className="p-3 rounded border border-border bg-secondary/30">
              <div className="text-[11px] text-muted-foreground">Speed Index</div>
              <div className="text-base font-bold font-mono mt-0.5">{formatMs(lh?.speedIndexMs)}</div>
            </div>
          </div>
        </div>

        {/* Real User Monitoring (CrUX Field Data) */}
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" />
              Chrome UX Report (CrUX) Field Data
            </h2>
            <span className="text-[11px] text-muted-foreground font-mono">
              Scope: {crux?.scope || "UNAVAILABLE"}
            </span>
          </div>

          {crux?.scope === "UNAVAILABLE" ? (
            <div className="p-6 text-center border border-dashed border-border rounded-lg bg-secondary/20">
              <p className="text-xs text-muted-foreground">
                No 28-day Chrome UX Report field data available for this specific URL.
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Google requires a minimum threshold of real user sessions before publishing public CrUX telemetry.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded border border-border bg-secondary/30 space-y-1">
                <div className="text-[11px] text-muted-foreground">Field LCP (75th %)</div>
                <div className="text-base font-bold font-mono">{formatMs(crux?.lcpValueMs)}</div>
                <MetricBadge category={crux?.lcpCategory} />
              </div>
              <div className="p-3 rounded border border-border bg-secondary/30 space-y-1">
                <div className="text-[11px] text-muted-foreground">Field INP (75th %)</div>
                <div className="text-base font-bold font-mono">{formatMs(crux?.inpValueMs)}</div>
                <MetricBadge category={crux?.inpCategory} />
              </div>
              <div className="p-3 rounded border border-border bg-secondary/30 space-y-1">
                <div className="text-[11px] text-muted-foreground">Field CLS (75th %)</div>
                <div className="text-base font-bold font-mono">{crux?.clsValue != null ? crux.clsValue.toFixed(3) : "—"}</div>
                <MetricBadge category={crux?.clsCategory} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Technical SEO Intelligence Hygiene Checklist */}
      {seo && (
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Search className="w-4 h-4 text-purple-500" />
              Independent Technical SEO Hygiene Checks
            </h2>
            <span className="text-[11px] text-muted-foreground font-mono">Static Crawler Engine</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded border border-border bg-secondary/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Page Title</span>
                {seo.pageTitle ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
              </div>
              <div className="font-semibold truncate" title={seo.pageTitle || "None"}>
                {seo.pageTitle || "Missing Title Tag"}
              </div>
              <div className="text-[11px] text-muted-foreground">{seo.titleLength ?? 0} characters</div>
            </div>

            <div className="p-3 rounded border border-border bg-secondary/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Meta Description</span>
                {seo.metaDescription ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
              </div>
              <div className="font-semibold truncate" title={seo.metaDescription || "None"}>
                {seo.metaDescription || "Missing Description"}
              </div>
              <div className="text-[11px] text-muted-foreground">{seo.descriptionLength ?? 0} characters</div>
            </div>

            <div className="p-3 rounded border border-border bg-secondary/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Canonical Check</span>
                {seo.isCanonicalMatch ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
              <div className="font-semibold truncate" title={seo.canonicalUrl || "None"}>
                {seo.canonicalUrl || "Missing Canonical"}
              </div>
              <div className="text-[11px] text-muted-foreground">{seo.isCanonicalMatch ? "Matches target URL" : "Mismatch / Missing"}</div>
            </div>

            <div className="p-3 rounded border border-border bg-secondary/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Headings & Images</span>
                {seo.h1Count === 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
              <div className="font-semibold">{seo.h1Count} H1 Heading(s)</div>
              <div className="text-[11px] text-muted-foreground">
                {seo.missingAltImagesCount > 0 ? `${seo.missingAltImagesCount} images missing alt` : "All images have alt text"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Agentic Browsing Readiness Module (Matches Official Lighthouse View) */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-6">
        {/* Device Mode Strategy Indicator */}
        <div className="flex justify-center border-b border-border/60 pb-3">
          <div className="inline-flex items-center gap-8 text-sm font-medium">
            <span
              className={`inline-flex items-center gap-1.5 pb-2 border-b-2 font-semibold transition ${
                execution.device === "MOBILE"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground/50"
              }`}
            >
              <Smartphone className="w-4 h-4" /> Mobile
            </span>
            <span
              className={`inline-flex items-center gap-1.5 pb-2 border-b-2 font-semibold transition ${
                execution.device === "DESKTOP"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground/50"
              }`}
            >
              <Monitor className="w-4 h-4" /> Desktop
            </span>
          </div>
        </div>

        {/* Central Score Ratio Gauge */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center justify-center">
            <span
              className={`inline-flex items-center gap-2 px-5 py-1.5 rounded-full font-mono font-bold text-base border shadow-sm ${
                (lh?.agenticScore ?? 0) >= 90
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/30"
              }`}
            >
              <span
                className={`w-3 h-3 ${
                  (lh?.agenticScore ?? 0) >= 90 ? "bg-emerald-500 rounded-full" : "bg-amber-500 rounded-xs"
                }`}
              />
              {lh?.agenticRatio || `${lh?.agenticScore ?? 0}%`}
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Agentic Browsing
          </h2>

          <p className="text-xs text-muted-foreground leading-relaxed">
            These checks ensure high-quality,{" "}
            <a
              href="https://goo.gle/lighthouse-agentic-web"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-medium"
            >
              browsable websites for AI agents
            </a>{" "}
            and validate the correctness of WebMCP integrations. This category is still under
            development and subject to change.
          </p>
        </div>

        {/* Section 1: Agent Accessibility */}
        <div className="space-y-3 pt-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            AGENT ACCESSIBILITY
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-secondary/10">
            <button
              onClick={() => setAgentTreeOpen(!agentTreeOpen)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                {agentTreeIssue || agentEvidence.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-rose-500 fill-rose-500/15 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <span className="font-semibold text-sm text-foreground">
                  {agentTreeIssue?.title || "Accessibility tree is not well-formed"}
                </span>
              </div>
              {agentTreeOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {agentTreeOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground">
                  A well-formed{" "}
                  <a
                    href="https://web.dev/articles/accessibility-tree"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    accessibility tree
                  </a>{" "}
                  helps AI agents to navigate and interact with the page.
                </p>

                {/* Subtable: Failed Audits */}
                {agentEvidence.length > 0 ? (
                  <div className="border border-border rounded-md overflow-hidden bg-card">
                    <div className="px-3.5 py-2 bg-secondary/30 text-xs font-semibold text-foreground border-b border-border">
                      Failed Audits
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border/60 bg-secondary/15 text-[11px] font-semibold text-muted-foreground">
                            <th className="py-2.5 px-3.5 w-1/3">Description</th>
                            <th className="py-2.5 px-3.5">Failing Element</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {agentEvidence.map((item: any, idx: number) => {
                            const descParts = (item.description || "").split(/:\s*(?=<)/);
                            const cleanDesc = descParts[0] || "Accessible name or discernibility failure";
                            const snippetFromDesc = descParts.length > 1 ? descParts.slice(1).join(":") : null;
                            const actualSnippet = item.snippet || snippetFromDesc;

                            return (
                              <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                                <td className="py-3 px-3.5 align-top font-medium text-foreground/90">
                                  {cleanDesc}
                                </td>
                                <td className="py-3 px-3.5 align-top space-y-1.5 font-mono">
                                  {item.nodeLabel && (
                                    <div className="text-[11px] text-muted-foreground font-sans">
                                      {item.nodeLabel}
                                    </div>
                                  )}
                                  {item.selector && (
                                    <div className="text-[11px] text-muted-foreground truncate max-w-xl" title={item.selector}>
                                      {item.selector}
                                    </div>
                                  )}
                                  {actualSnippet && (
                                    <pre className="p-2 rounded bg-zinc-950 text-blue-400 font-mono text-[11px] overflow-x-auto border border-zinc-800 whitespace-pre-wrap">
                                      <code>{actualSnippet}</code>
                                    </pre>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>All accessibility tree nodes and interactable controls pass AI readability standards.</span>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground/80 italic">
                  These audits highlight best practices for improving the accessibility of the website for AI agents.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: WebMCP Schemas & AI Agent Tool Declarations */}
        <div className="space-y-3 pt-3 border-t border-border/50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>WEBMCP TOOL SCHEMAS & AGENT DISCOVERY</span>
            <span className="text-[10px] text-primary font-mono">Chrome AI Standard</span>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="font-semibold text-xs text-foreground">WebMCP Structured Tool Actions</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Recommended
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Valid <a href="https://developer.chrome.com/docs/ai/webmcp" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">WebMCP schemas</a> enable AI agents to execute actions (such as searching, booking, or filtering) without scraping fragile CSS selectors.
            </p>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
                <span>Recommended WebMCP Schema (Head JSON-LD)</span>
                <button
                  onClick={() => {
                    const domainClean = execution.url.replace(/^https?:\/\//, "").split("/")[0];
                    const schemaCode = `<` + `script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "${domainClean}",\n  "potentialAction": {\n    "@type": "SearchAction",\n    "target": "${execution.url}/search?q={search_term_string}",\n    "query-input": "required name=search_term_string"\n  }\n}\n<` + `/script>`;
                    navigator.clipboard.writeText(schemaCode);
                    showToast("WebMCP Schema copied to clipboard!");
                  }}
                  className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy WebMCP Code
                </button>
              </div>

              <pre className="p-3.5 rounded bg-zinc-950 text-blue-400 font-mono text-[11px] overflow-x-auto border border-zinc-800">
                <code>{`<!-- Place in HTML <head> for AI Agent Tools -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "YourWebsite",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "${execution.url}/search?q={search_term}",
    "query-input": "required name=search_term"
  }
}
<` + `/script>`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* AI Fix Assistant Module (Audience-Aware Recommendations) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Fix Assistant & Code Remediation
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Audience-tailored root causes, exact framework-specific code snippets, and verification steps.
            </p>
          </div>

          {/* Audience Mode Switcher Tabs */}
          <div className="flex bg-secondary p-1 rounded-md text-xs font-medium">
            <button
              onClick={() => setAudienceMode("DEVELOPER")}
              className={`px-3 py-1 rounded flex items-center gap-1.5 transition ${
                audienceMode === "DEVELOPER" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Developer
            </button>
            <button
              onClick={() => setAudienceMode("MARKETER")}
              className={`px-3 py-1 rounded flex items-center gap-1.5 transition ${
                audienceMode === "MARKETER" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Marketer
            </button>
            <button
              onClick={() => setAudienceMode("AGENCY")}
              className={`px-3 py-1 rounded flex items-center gap-1.5 transition ${
                audienceMode === "AGENCY" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Agency
            </button>
            <button
              onClick={() => setAudienceMode("SAAS_TEAM")}
              className={`px-3 py-1 rounded flex items-center gap-1.5 transition ${
                audienceMode === "SAAS_TEAM" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              SaaS Team
            </button>
          </div>
        </div>

        {issues.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card/40">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">No Critical Diagnostic Issues Found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              This URL passed all major Lighthouse opportunities and performance budgets.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue: any, idx: number) => {
              const rec = issue.recommendations?.[0];

              // Pick audience-specific explanation
              const explanation =
                audienceMode === "DEVELOPER"
                  ? rec?.explanationDeveloper
                  : audienceMode === "MARKETER"
                  ? rec?.explanationMarketer
                  : audienceMode === "AGENCY"
                  ? rec?.explanationAgency
                  : rec?.explanationSaaSTeam;

              return (
                <div
                  key={issue.id}
                  className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{issue.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${
                            issue.severity === "CRITICAL"
                              ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              : issue.severity === "HIGH"
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          }`}
                        >
                          {issue.severity}
                        </span>
                        {rec?.detectedStack && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary text-foreground">
                            Stack: {rec.detectedStack}
                          </span>
                        )}
                      </div>
                      {issue.displayValue && (
                        <p className="text-xs text-emerald-500 font-medium">{issue.displayValue}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span>Impact: {rec?.estimatedImpact || "HIGH"}</span>
                      <span>•</span>
                      <span>Difficulty: {rec?.estimatedDifficulty || "MEDIUM"}</span>
                    </div>
                  </div>

                  {/* Audience-Specific Explanation */}
                  <div className="text-xs text-foreground/90 leading-relaxed bg-secondary/30 p-3.5 rounded-md border border-border">
                    <div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      {audienceMode} Perspective
                    </div>
                    {explanation || "SpeedPilot is analyzing recommendations for this finding."}
                  </div>

                  {/* Offending Assets / Evidence */}
                  {Array.isArray(issue.evidenceDetails) && issue.evidenceDetails.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Audit Evidence ({issue.evidenceDetails.length} offending item(s))
                      </div>
                      <div className="space-y-1">
                        {issue.evidenceDetails.slice(0, 3).map((item: any, i: number) => (
                          <div
                            key={i}
                            className="p-2 rounded bg-secondary/40 border border-border font-mono text-[11px] flex items-center justify-between truncate"
                          >
                            <span className="truncate max-w-lg">{item.url || item.description || "Asset"}</span>
                            <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                              {item.wastedMs != null && (
                                <span className="text-amber-500 font-semibold">{item.wastedMs}ms wasted</span>
                              )}
                              {item.wastedBytes != null && (
                                <span>{(item.wastedBytes / 1024).toFixed(1)} KB</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Code Snippet (When Developer or SaaS Mode) */}
                  {rec?.remediationCodeSnippet && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>Remediation Code Example</span>
                        <button
                          onClick={() => copySnippet(rec.remediationCodeSnippet, idx)}
                          className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                        >
                          {copiedCodeIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Code
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-4 rounded-md bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                        <code>{rec.remediationCodeSnippet}</code>
                      </pre>
                    </div>
                  )}

                  {/* Implementation & Verification Steps */}
                  {rec && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="p-3 rounded border border-border bg-card space-y-1.5">
                        <div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                          Implementation Checklist
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {rec.implementationSteps?.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 rounded border border-border bg-card space-y-1.5">
                        <div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                          Verification Steps
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {rec.verificationSteps?.map((v: string, i: number) => (
                            <li key={i}>{v}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unthrottled Trace Modal */}
      {traceModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Unthrottled Audit Trace Telemetry</h3>
              </div>
              <button
                onClick={() => setTraceModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded bg-secondary/30 border border-border flex justify-between items-center">
                <span className="text-muted-foreground">Emulated Environment</span>
                <span className="font-mono font-medium">
                  {execution.device === "MOBILE" ? "Moto G Power • 4x CPU Slowdown • Slow 4G" : "Desktop Chrome • Unthrottled 10Gbps"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-secondary/20 border border-border space-y-0.5">
                  <div className="text-[11px] text-muted-foreground">First Contentful Paint</div>
                  <div className="font-mono font-bold text-sm">{formatMs(lh?.fcpMs)}</div>
                </div>
                <div className="p-2.5 rounded bg-secondary/20 border border-border space-y-0.5">
                  <div className="text-[11px] text-muted-foreground">Largest Contentful Paint</div>
                  <div className="font-mono font-bold text-sm">{formatMs(lh?.lcpMs)}</div>
                </div>
                <div className="p-2.5 rounded bg-secondary/20 border border-border space-y-0.5">
                  <div className="text-[11px] text-muted-foreground">Total Blocking Time</div>
                  <div className="font-mono font-bold text-sm">{formatMs(lh?.tbtMs)}</div>
                </div>
                <div className="p-2.5 rounded bg-secondary/20 border border-border space-y-0.5">
                  <div className="text-[11px] text-muted-foreground">Speed Index</div>
                  <div className="font-mono font-bold text-sm">{formatMs(lh?.speedIndexMs)}</div>
                </div>
                <div className="p-2.5 rounded bg-secondary/20 border border-border space-y-0.5">
                  <div className="text-[11px] text-muted-foreground">Cumulative Layout Shift</div>
                  <div className="font-mono font-bold text-sm">{lh?.cls != null ? lh.cls.toFixed(3) : "—"}</div>
                </div>
                <div className="p-2.5 rounded bg-secondary/20 border border-border space-y-0.5">
                  <div className="text-[11px] text-muted-foreground">Execution Latency</div>
                  <div className="font-mono font-bold text-sm">{formatMs(execution.executionTimeMs || 4200)}</div>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
                Raw DevTools performance trace captured under simulated Chromium lifecycle conditions.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => {
                  copyJson();
                  setTraceModalOpen(false);
                }}
                className="px-3 py-1.5 rounded bg-secondary text-foreground hover:bg-secondary/80 font-medium text-xs transition"
              >
                Copy Raw Trace JSON
              </button>
              <button
                onClick={() => setTraceModalOpen(false)}
                className="px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 border border-border">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

