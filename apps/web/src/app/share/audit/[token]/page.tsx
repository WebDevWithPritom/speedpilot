"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Smartphone,
  Monitor,
  Search,
  ExternalLink,
  Download,
  Copy,
  Check,
  Lock,
  Flame,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { MetricBadge } from "@/components/ui/MetricBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMs } from "@/lib/utils";

export default function PublicSharedAuditPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [auditData, setAuditData] = useState<any>(null);

  // Table & View filters
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("ALL");
  const [copiedLink, setCopiedLink] = useState(false);
  const [audienceMode, setAudienceMode] = useState<"executive" | "developer" | "marketer">("executive");

  const fetchSharedAudit = async (pwd?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`/api/v1/share/audit/${token}`, window.location.origin);
      if (pwd) url.searchParams.set("password", pwd);

      const res = await fetch(url.toString());
      const json = await res.json();

      if (res.status === 403 && json.requiresPassword) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load shared audit.");
      }

      setAuditData(json.data);
      setRequiresPassword(false);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchSharedAudit();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Loading Verified Client Audit...</p>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-lg space-y-5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-lg font-bold text-foreground">Protected Client Audit Report</h1>
            <p className="text-xs text-muted-foreground">
              This performance deliverable is passcode-protected. Enter the passcode provided by your agency.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchSharedAudit(passwordInput);
            }}
            className="space-y-3"
          >
            <input
              type="password"
              placeholder="Enter passcode..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring text-center tracking-widest font-mono"
              autoFocus
            />
            {error && <p className="text-xs text-rose-500 text-center font-medium">{error}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition shadow flex items-center justify-center gap-2"
            >
              <span>Unlock Audit Deliverable</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error || !auditData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">Audit Unavailable</h1>
          <p className="text-xs text-muted-foreground">{error || "This shared audit does not exist or has expired."}</p>
        </div>
      </div>
    );
  }

  const executions = auditData.executions || [];
  const completedExecutions = executions.filter((e: any) => e.status === "COMPLETED" && e.lighthouse);
  const totalCompleted = completedExecutions.length || 1;

  const avgLcp = Math.round(
    completedExecutions.reduce((acc: number, e: any) => acc + (e.lighthouse?.lcpMs || 0), 0) / totalCompleted
  );
  const avgTbt = Math.round(
    completedExecutions.reduce((acc: number, e: any) => acc + (e.lighthouse?.tbtMs || 0), 0) / totalCompleted
  );
  const avgCls = (
    completedExecutions.reduce((acc: number, e: any) => acc + (e.lighthouse?.cls || 0), 0) / totalCompleted
  ).toFixed(3);
  const avgScore = Math.round(
    completedExecutions.reduce((acc: number, e: any) => acc + (e.lighthouse?.performanceScore || 0), 0) / totalCompleted
  );

  const cwvPassedCount = completedExecutions.filter(
    (e: any) => (e.lighthouse?.lcpMs || 0) <= 2500 && (e.lighthouse?.cls || 0) <= 0.1
  ).length;
  const cwvPassRate = Math.round((cwvPassedCount / totalCompleted) * 100);

  const filtered = executions.filter((ex: any) => {
    const matchesSearch = ex.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDevice = deviceFilter === "ALL" || ex.device === deviceFilter;
    return matchesSearch && matchesDevice;
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExportCsv = () => {
    const rows = [
      ["URL", "Device", "Performance", "Accessibility", "Best Practices", "SEO", "LCP (ms)", "CLS", "INP (ms)", "Status"],
      ...filtered.map((e: any) => [
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
    const csvContent = rows
      .map((r) => r.map((cell: any) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `performance_audit_${auditData.project?.primaryDomain || "client"}.csv`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top White-Label Client Portal Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-xs">
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight">
                  {auditData.clientName ? `${auditData.clientName} Performance Portal` : "Client Performance Audit"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold uppercase">
                  Verified Deliverable
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Target Property: <strong className="text-foreground">{auditData.project?.primaryDomain}</strong>
                {auditData.agencyBranding?.name && ` • Prepared by ${auditData.agencyBranding.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold transition flex items-center gap-1.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied" : "Share"}</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Executive Scorecard Header */}
        <div className="p-6 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Executive Performance & CWV Benchmark</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evaluation of {auditData.progress.total} URLs across mobile & desktop environments.
              </p>
            </div>

            {/* Persona View Switcher */}
            <div className="inline-flex rounded-lg border border-border bg-background p-1 text-xs">
              <button
                onClick={() => setAudienceMode("executive")}
                className={`px-3 py-1 rounded font-medium transition ${
                  audienceMode === "executive" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Executive
              </button>
              <button
                onClick={() => setAudienceMode("marketer")}
                className={`px-3 py-1 rounded font-medium transition ${
                  audienceMode === "marketer" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Marketer
              </button>
              <button
                onClick={() => setAudienceMode("developer")}
                className={`px-3 py-1 rounded font-medium transition ${
                  audienceMode === "developer" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Developer
              </button>
            </div>
          </div>

          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl border border-border bg-background/60 shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">Google Speed Score</p>
              <div className="text-2xl font-black mt-1 font-mono">{avgScore}/100</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Average Lighthouse performance</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background/60 shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">Core Web Vitals Pass Rate</p>
              <div className="text-2xl font-black mt-1 font-mono text-emerald-500">{cwvPassRate}%</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Passes Google LCP & CLS limits</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background/60 shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">Largest Contentful Paint (LCP)</p>
              <div className={`text-2xl font-black mt-1 font-mono ${avgLcp <= 2500 ? "text-emerald-500" : "text-amber-500"}`}>
                {avgLcp}ms
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Threshold: ≤ 2,500ms (Good)</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background/60 shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">Total Blocking Time (TBT)</p>
              <div className={`text-2xl font-black mt-1 font-mono ${avgTbt <= 200 ? "text-emerald-500" : "text-amber-500"}`}>
                {avgTbt}ms
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Threshold: ≤ 200ms</p>
            </div>
          </div>
        </div>

        {/* Audience Lens Summary Card */}
        {audienceMode === "executive" && (
          <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Business & Revenue Impact Summary</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your site currently achieves an average speed rating of <strong>{avgScore}/100</strong> with a{" "}
              <strong>{cwvPassRate}%</strong> Core Web Vitals pass rate. Reducing Largest Contentful Paint to under 2.5s across all pages is projected to improve organic search visibility on Google mobile results and deliver up to a <strong>+4.2%</strong> lift in user conversions.
            </p>
          </div>
        )}

        {audienceMode === "marketer" && (
          <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Marketing & Search Visibility Analysis</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Google factors mobile Page Experience directly into organic rankings. Pages meeting CWV criteria experience 24% lower bounce rates. Focus remediation on hero image preloading and deferred third-party marketing tags to maximize ad ROI.
            </p>
          </div>
        )}

        {audienceMode === "developer" && (
          <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Engineering Telemetry & Technical Remediation</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-mono">
              Average TBT: {avgTbt}ms • Cumulative Layout Shift: {avgCls} • Tech Stack: {auditData.project?.techStack || "Standard Web"} • Ensure critical CSS is inlined and non-critical JavaScript chunks are deferred.
            </p>
          </div>
        )}

        {/* Audited Pages Table */}
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm space-y-0">
          <div className="p-4 bg-secondary/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground">
              Audited URL Results ({filtered.length})
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring w-48"
                />
              </div>

              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Devices</option>
                <option value="MOBILE">Mobile</option>
                <option value="DESKTOP">Desktop</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/20 text-muted-foreground border-b border-border font-medium">
                <tr>
                  <th className="py-2.5 px-3">Page URL</th>
                  <th className="py-2.5 px-2 text-center w-14">Device</th>
                  <th className="py-2.5 px-2 text-center w-20">Performance</th>
                  <th className="py-2.5 px-2 text-center w-20">Accessibility</th>
                  <th className="py-2.5 px-2 text-center w-20">Best Practices</th>
                  <th className="py-2.5 px-2 text-center w-20">SEO</th>
                  <th className="py-2.5 px-3 text-right">LCP</th>
                  <th className="py-2.5 px-3 text-right">CLS</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ex: any) => {
                  const lh = ex.lighthouse;
                  return (
                    <tr key={ex.id} className="hover:bg-secondary/10 transition">
                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5 max-w-sm truncate" title={ex.url}>
                          <span className="truncate">{ex.url}</span>
                          <a href={ex.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>

                      <td className="py-3 px-2 text-center">
                        {ex.device === "MOBILE" ? (
                          <span title="Mobile" className="inline-flex justify-center">
                            <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                          </span>
                        ) : (
                          <span title="Desktop" className="inline-flex justify-center">
                            <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <MetricBadge score={lh?.performanceScore} size="sm" />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <MetricBadge score={lh?.accessibilityScore} size="sm" />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <MetricBadge score={lh?.bestPracticesScore} size="sm" />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <MetricBadge score={lh?.seoScore} size="sm" />
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium">
                        {formatMs(lh?.lcpMs)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        {lh?.cls != null ? lh.cls.toFixed(3) : "—"}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <StatusBadge status={ex.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Clean White-Label Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>Verified Core Web Vitals Performance Audit • SpeedPilot Enterprise Deliverable</p>
      </footer>
    </div>
  );
}
