"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  TrendingUp,
  Send,
  Terminal,
  ArrowRight,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { MetricBadge } from "@/components/ui/MetricBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMs } from "@/lib/utils";
import { usePersona, Persona as AudienceMode } from "@/lib/persona";
import { getClientAIConfig } from "@/lib/ai-config";
import { DeepSearchModal } from "@/components/ai/DeepSearchModal";
import { CodeDiffViewer } from "@/components/remediation/CodeDiffViewer";

const EXTERNAL_AI_PROVIDERS = [
  { id: "chatgpt", label: "ChatGPT", prefill: true, buildUrl: (q: string) => `https://chatgpt.com/?q=${encodeURIComponent(q)}` },
  { id: "claude", label: "Claude", prefill: true, buildUrl: (q: string) => `https://claude.ai/new?q=${encodeURIComponent(q)}` },
  { id: "gemini", label: "Gemini", prefill: false, buildUrl: () => `https://gemini.google.com/app` },
  { id: "perplexity", label: "Perplexity", prefill: true, buildUrl: (q: string) => `https://www.perplexity.ai/?q=${encodeURIComponent(q)}` },
  { id: "grok", label: "Grok", prefill: true, buildUrl: (q: string) => `https://grok.com/?q=${encodeURIComponent(q)}` },
  { id: "deepseek", label: "DeepSeek", prefill: false, buildUrl: () => `https://chat.deepseek.com/` },
] as const;

export default function ExecutionDeepDivePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [execution, setExecution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audience presentation mode (synced globally across app)
  const { persona: audienceMode, setPersona: changeAudienceMode } = usePersona();
  const [activeDeepSearchIssue, setActiveDeepSearchIssue] = useState<any>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [agentTreeOpen, setAgentTreeOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [traceModalOpen, setTraceModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [synthesizingIssueId, setSynthesizingIssueId] = useState<string | null>(null);
  const [synthesizingAll, setSynthesizingAll] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [pastedCode, setPastedCode] = useState("");
  const [sourceFilename, setSourceFilename] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const synthesizeIssueFix = async (issueId: string) => {
    setSynthesizingIssueId(issueId);
    try {
      const aiConfig = getClientAIConfig();
      const res = await fetch(`/api/v1/audits/issues/${issueId}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...aiConfig,
          githubUrl: githubRepoUrl.trim() || undefined,
          pastedCode: pastedCode.trim() || undefined,
          sourceFilename: sourceFilename.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate AI fix");

      setExecution((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          issues: (prev.issues || []).map((iss: any) =>
            iss.id === issueId ? { ...iss, recommendations: [json.data] } : iss
          ),
        };
      });
      const ctxNote = json.codeOrigin && json.codeOrigin !== "NONE" ? ` (+ ${json.codeOrigin}: ${json.codeFilename})` : "";
      showToast(`AI Fix generated via ${json.source}${ctxNote}`);
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setSynthesizingIssueId(null);
    }
  };

  const synthesizeAllIssues = async () => {
    if (!execution?.issues?.length || synthesizingAll) return;
    setSynthesizingAll(true);
    const targets = execution.issues.slice(0, 15);
    for (const iss of targets) {
      await synthesizeIssueFix(iss.id);
    }
    setSynthesizingAll(false);
    showToast(`Completed AI synthesis for ${targets.length} issue(s)`);
  };

  const buildIssuePrompt = (issue: any, shortForUrl = false) => {
    const stack = issue.recommendations?.[0]?.detectedStack || "UNKNOWN";
    const evList = (issue.evidenceDetails || [])
      .slice(0, shortForUrl ? 5 : 10)
      .map((e: any) => `- ${e.url || e.selector || e.description || "flagged item"}${e.wastedMs ? ` (${e.wastedMs}ms)` : ""}`)
      .join("\n");
    const codeSuffix =
      !shortForUrl && pastedCode.trim()
        ? `\n\nMy source code (${sourceFilename.trim() || "snippet"}):\n\`\`\`\n${pastedCode.trim().slice(0, 3500)}\n\`\`\``
        : "";
    return [
      `Fix this Google PageSpeed / Lighthouse issue on ${execution?.url} (${execution?.device}, Stack: ${stack}).`,
      `Issue: [${issue.code}] ${issue.title}${issue.displayValue ? ` — ${issue.displayValue}` : ""}`,
      evList ? `Flagged evidence:\n${evList}` : "",
      `Give exact copy-paste code using modern coding standards (tell me exact preload/preconnect/prefetch/defer/Cache-Control/WCAG tags only for these real files).${codeSuffix}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const askExternalAI = (issue: any, provider?: (typeof EXTERNAL_AI_PROVIDERS)[number]) => {
    const fullPrompt = buildIssuePrompt(issue, false);
    navigator.clipboard?.writeText(fullPrompt).catch(() => {});
    if (!provider) {
      showToast("Prompt copied to clipboard — paste into any AI chat!");
      return;
    }
    const urlPrompt = buildIssuePrompt(issue, true).slice(0, 1800);
    window.open(provider.buildUrl(urlPrompt), "_blank", "noopener,noreferrer");
    showToast(
      provider.prefill
        ? `Opened ${provider.label} with prompt pre-filled (and copied to clipboard)`
        : `Prompt copied! Paste cleanly in the ${provider.label} tab`
    );
  };

  const handleSwitchDevice = async (targetDevice: "MOBILE" | "DESKTOP") => {
    if (!execution || execution.device === targetDevice) return;
    if (execution.siblingExecution?.id) {
      router.push(`/audits/executions/${execution.siblingExecution.id}`);
      return;
    }

    // If sibling audit hasn't been run yet, trigger it on-demand for this URL
    setLoading(true);
    try {
      showToast(`Initiating ${targetDevice} audit for this URL...`);
      const customGoogleKey = typeof window !== "undefined" ? localStorage.getItem("sp_google_key") || "" : "";
      const aiConfig = getClientAIConfig();
      const res = await fetch("/api/v1/audits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(customGoogleKey ? { "x-custom-google-key": customGoogleKey } : {}),
          ...(aiConfig.apiKey ? { "x-custom-ai-key": aiConfig.apiKey } : {}),
          ...(aiConfig.provider ? { "x-custom-ai-provider": aiConfig.provider } : {}),
          ...(aiConfig.model ? { "x-custom-ai-model": aiConfig.model } : {}),
          ...(aiConfig.baseUrl ? { "x-custom-ai-base-url": aiConfig.baseUrl } : {}),
        },
        body: JSON.stringify({
          projectId: execution.auditJob?.project?.id,
          deviceMode: targetDevice,
          urls: [execution.url],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start companion audit");
      router.push(`/audits/${data.jobId}`);
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
      setLoading(false);
    }
  };

  const copyDevBrief = (issue: any, rec: any, idx: number) => {
    const brief = `### 🚀 Performance Fix Brief (for Engineering)
**Target URL:** ${execution.url}
**Device Strategy:** ${execution.device}
**Detected Stack:** ${rec?.detectedStack || "Web Standard"}
**Bottleneck:** ${issue.title} (${issue.severity})
**Business Impact:** ${rec?.explanationMarketer || issue.displayValue || "Performance degradation"}
**Recommended Fix Checklist:**
${rec?.implementationSteps?.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") || "Inspect asset delivery."}

Generated by SpeedPilot Intelligence`;
    navigator.clipboard.writeText(brief);
    setCopiedCodeIndex(idx);
    showToast("Developer Brief copied to clipboard!");
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const copyAgencyProposal = (issue: any, rec: any, idx: number) => {
    const proposal = `### 💼 Client Optimization Deliverable
**Client Target:** ${execution.url}
**Finding:** ${issue.title}
**Executive Summary:** ${rec?.explanationAgency || rec?.explanationMarketer}
**Priority:** ${rec?.estimatedImpact || "HIGH"}
**Estimated Scope:** ${rec?.estimatedDifficulty === "LOW" ? "1 - 2 Dev Hours (Quick Win)" : rec?.estimatedDifficulty === "MEDIUM" ? "2 - 4 Dev Hours" : "4 - 8 Dev Hours (Architecture Refactor)"}
**Projected PageSpeed Gain:** +8 to +15 Points
**Key Deliverables:**
${rec?.implementationSteps?.map((s: string, i: number) => `- ${s}`).join("\n") || "- Refactor asset delivery"}

Prepared via SpeedPilot Agency Suite`;
    navigator.clipboard.writeText(proposal);
    setCopiedCodeIndex(idx);
    showToast("Client Proposal deliverable copied!");
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const copyJiraTicket = (issue: any, rec: any, idx: number) => {
    const ticket = `## [PERF] ${issue.title} on ${execution.url}

**User Story:**
As a user visiting ${execution.url} on ${execution.device}, I want the main content to load without latency so that I can interact immediately.

**Problem Statement:**
${rec?.explanationSaaSTeam || rec?.explanationDeveloper}

**Technical Details:**
- **Severity:** ${issue.severity}
- **Impact Metric:** ${rec?.estimatedImpact || "High"}
- **Detected Stack:** ${rec?.detectedStack || "Standard"}

**Acceptance Criteria:**
${rec?.implementationSteps?.map((s: string) => `- [ ] ${s}`).join("\n") || "- [ ] Eliminate blocking resources"}
- [ ] Verify Core Web Vitals pass in staging Lighthouse CI

Generated by SpeedPilot SaaS Engine`;
    navigator.clipboard.writeText(ticket);
    setCopiedCodeIndex(idx);
    showToast("Jira/Linear ticket copied!");
    setTimeout(() => setCopiedCodeIndex(null), 2000);
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
  const agentScoreVal = lh?.agenticScore ?? 0;
  const isAgentScoreFailing = lh?.agenticScore == null || agentScoreVal < 50;
  const hasAgentTreeFailure = Boolean(agentTreeIssue) || agentEvidence.length > 0 || isAgentScoreFailing;
  const webmcpIssues = issues.filter((i: any) =>
    ["webmcp-form-coverage", "webmcp-registered-tools", "webmcp-schema-validity", "llms-txt", "ard-schema"].includes(i.code)
  );
  const isWebMcpMissing = webmcpIssues.length > 0 || isAgentScoreFailing;

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

      {/* Official Lighthouse Dual-Device Strategy Bar (Mobile <-> Desktop) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSwitchDevice("MOBILE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              execution.device === "MOBILE"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile</span>
            {execution.device === "MOBILE" && lh?.performanceScore != null && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary-foreground/20 text-primary-foreground">
                {lh.performanceScore}
              </span>
            )}
            {execution.device !== "MOBILE" && execution.siblingExecution?.lighthouse?.performanceScore != null && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-background text-foreground border border-border">
                {execution.siblingExecution.lighthouse.performanceScore}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchDevice("DESKTOP")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              execution.device === "DESKTOP"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Desktop</span>
            {execution.device === "DESKTOP" && lh?.performanceScore != null && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary-foreground/20 text-primary-foreground">
                {lh.performanceScore}
              </span>
            )}
            {execution.device !== "DESKTOP" && execution.siblingExecution?.lighthouse?.performanceScore != null && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-background text-foreground border border-border">
                {execution.siblingExecution.lighthouse.performanceScore}
              </span>
            )}
          </button>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          {execution.siblingExecution ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Both Mobile & Desktop Audits Available
            </span>
          ) : (
            <span className="text-muted-foreground">
              Click the inactive tab to run a companion test for this URL
            </span>
          )}
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
            <div className={`p-3 rounded border space-y-1 ${seo.pageTitle ? "border-border bg-secondary/20" : "border-rose-500/40 bg-rose-500/5"}`}>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Page Title</span>
                {seo.pageTitle ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
              </div>
              <div className={`font-semibold truncate ${!seo.pageTitle ? "text-rose-500" : ""}`} title={seo.pageTitle || "None"}>
                {seo.pageTitle || "Missing Title Tag"}
              </div>
              <div className="text-[11px] text-muted-foreground">{seo.titleLength ?? 0} characters</div>
            </div>

            <div className={`p-3 rounded border space-y-1 ${seo.metaDescription ? "border-border bg-secondary/20" : "border-rose-500/40 bg-rose-500/5"}`}>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Meta Description</span>
                {seo.metaDescription ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
              </div>
              <div className={`font-semibold truncate ${!seo.metaDescription ? "text-rose-500" : ""}`} title={seo.metaDescription || "None"}>
                {seo.metaDescription || "Missing Description"}
              </div>
              <div className="text-[11px] text-muted-foreground">{seo.descriptionLength ?? 0} characters</div>
            </div>

            <div className={`p-3 rounded border space-y-1 ${seo.canonicalUrl ? "border-border bg-secondary/20" : "border-rose-500/40 bg-rose-500/5"}`}>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Canonical Check</span>
                {seo.isCanonicalMatch ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : !seo.canonicalUrl ? (
                  <XCircle className="w-4 h-4 text-rose-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div className={`font-semibold truncate ${!seo.canonicalUrl ? "text-rose-500" : ""}`} title={seo.canonicalUrl || "None"}>
                {seo.canonicalUrl || "Missing Canonical"}
              </div>
              <div className="text-[11px] text-muted-foreground">{seo.isCanonicalMatch ? "Matches target URL" : !seo.canonicalUrl ? "Missing tag" : "Canonical mismatch"}</div>
            </div>

            <div className={`p-3 rounded border space-y-1 ${seo.h1Count === 0 ? "border-rose-500/40 bg-rose-500/5" : "border-border bg-secondary/20"}`}>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Headings & Images</span>
                {seo.h1Count === 1 && seo.missingAltImagesCount === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : seo.h1Count === 0 ? (
                  <XCircle className="w-4 h-4 text-rose-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div className={`font-semibold ${seo.h1Count === 0 ? "text-rose-500" : ""}`}>
                {seo.h1Count === 0 ? "Missing H1 Heading" : `${seo.h1Count} H1 Heading(s)`}
              </div>
              <div className={`text-[11px] ${seo.missingAltImagesCount > 0 ? "text-rose-500 font-medium" : "text-muted-foreground"}`}>
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
            <button
              type="button"
              onClick={() => handleSwitchDevice("MOBILE")}
              className={`inline-flex items-center gap-1.5 pb-2 border-b-2 font-semibold transition ${
                execution.device === "MOBILE"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground/60 hover:text-foreground"
              }`}
            >
              <Smartphone className="w-4 h-4" /> Mobile
            </button>
            <button
              type="button"
              onClick={() => handleSwitchDevice("DESKTOP")}
              className={`inline-flex items-center gap-1.5 pb-2 border-b-2 font-semibold transition ${
                execution.device === "DESKTOP"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground/60 hover:text-foreground"
              }`}
            >
              <Monitor className="w-4 h-4" /> Desktop
            </button>
          </div>
        </div>

        {/* Central Score Ratio Gauge */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center justify-center">
            <span
              className={`inline-flex items-center gap-2 px-5 py-1.5 rounded-full font-mono font-bold text-base border shadow-sm ${
                agentScoreVal >= 90
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : agentScoreVal >= 50
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                  : "bg-rose-500/10 text-rose-500 border-rose-500/30"
              }`}
            >
              {agentScoreVal >= 90 ? (
                <span className="w-3 h-3 bg-emerald-500 rounded-full" />
              ) : agentScoreVal >= 50 ? (
                <span className="w-3 h-3 bg-amber-500 rounded-xs" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500 fill-rose-500/15" />
              )}
              {lh?.agenticRatio || `${agentScoreVal}%`}
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
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>AGENT ACCESSIBILITY</span>
            {hasAgentTreeFailure ? (
              <span className="text-[10px] font-semibold text-rose-500">Action Required</span>
            ) : (
              <span className="text-[10px] font-semibold text-emerald-500">Verified</span>
            )}
          </div>

          <div
            className={`border rounded-lg overflow-hidden transition-colors ${
              hasAgentTreeFailure
                ? "border-rose-500/40 bg-rose-500/[0.03]"
                : "border-emerald-500/30 bg-emerald-500/[0.02]"
            }`}
          >
            <button
              onClick={() => setAgentTreeOpen(!agentTreeOpen)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-secondary/20 transition-colors gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {hasAgentTreeFailure ? (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <span className={`font-semibold text-sm truncate ${hasAgentTreeFailure ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                  {agentTreeIssue?.title ||
                    (hasAgentTreeFailure
                      ? "Accessibility tree is not well-formed or missing"
                      : "Accessibility tree is well-formed")}
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    hasAgentTreeFailure
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  }`}
                >
                  {hasAgentTreeFailure ? "Failed / Missing" : "Passed"}
                </span>
                {agentTreeOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
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
                  <div className="border border-rose-500/30 rounded-md overflow-hidden bg-card">
                    <div className="px-3.5 py-2 bg-rose-500/10 text-xs font-semibold text-rose-500 border-b border-rose-500/20 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Failed Audits ({agentEvidence.length})</span>
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
                ) : hasAgentTreeFailure ? (
                  <div className="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Agentic accessibility checks did not pass ({agentScoreVal}% readiness). Ensure semantic HTML landmarks, explicit ARIA labels, and accessible form controls are present.
                    </span>
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

          <div
            className={`p-4 rounded-lg border space-y-3 ${
              isWebMcpMissing
                ? "border-rose-500/40 bg-rose-500/[0.03]"
                : "border-emerald-500/30 bg-card"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bot className={`w-4 h-4 ${isWebMcpMissing ? "text-rose-500" : "text-primary"}`} />
                <span className="font-semibold text-xs text-foreground">WebMCP Structured Tool Actions</span>
              </div>
              {isWebMcpMissing ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/30">
                  <XCircle className="w-3 h-3" /> Missing / Not Detected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Active & Valid
                </span>
              )}
            </div>

            {webmcpIssues.length > 0 && (
              <div className="space-y-1.5">
                {webmcpIssues.map((wi: any) => (
                  <div
                    key={wi.id || wi.code}
                    className="px-3 py-2 rounded bg-rose-500/10 border border-rose-500/25 text-xs text-rose-500 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{wi.title}</span>
                    </div>
                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-rose-500/15">
                      Missing
                    </span>
                  </div>
                ))}
              </div>
            )}

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
          <div>
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Fix Assistant & Strategy Engine
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select your persona to adapt all insights, ROI models, code snippets, and handoff deliverables.
            </p>
          </div>

          {/* Audience Mode Switcher Tabs */}
          <div className="flex flex-wrap items-center bg-secondary/60 p-1 rounded-lg text-xs font-medium border border-border gap-1">
            <button
              type="button"
              onClick={() => changeAudienceMode("DEVELOPER")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                audienceMode === "DEVELOPER"
                  ? "bg-card text-foreground shadow-sm font-semibold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Developer</span>
            </button>
            <button
              type="button"
              onClick={() => changeAudienceMode("MARKETER")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                audienceMode === "MARKETER"
                  ? "bg-card text-foreground shadow-sm font-semibold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Marketer</span>
            </button>
            <button
              type="button"
              onClick={() => changeAudienceMode("AGENCY")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                audienceMode === "AGENCY"
                  ? "bg-card text-foreground shadow-sm font-semibold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-purple-500" />
              <span>Agency</span>
            </button>
            <button
              type="button"
              onClick={() => changeAudienceMode("SAAS_TEAM")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                audienceMode === "SAAS_TEAM"
                  ? "bg-card text-foreground shadow-sm font-semibold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>SaaS Team</span>
            </button>
          </div>
        </div>

        {/* Persona Role Banner */}
        <div className="px-4 py-2.5 rounded-lg bg-secondary/30 border border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
              Active Persona:
            </span>
            <span className="font-medium text-foreground">
              {audienceMode === "DEVELOPER" && "Developer Mode — Simple Plain-English Fix Guide, Copy-Paste Code & Check Steps"}
              {audienceMode === "MARKETER" && "Marketer Mode — How Speed Affects Traffic & Sales + 1-Click Dev Brief"}
              {audienceMode === "AGENCY" && "Agency Mode — Client Summary, Time Estimate & Copy-Ready Proposal"}
              {audienceMode === "SAAS_TEAM" && "SaaS Team Mode — User Impact, Speed Targets & Ready-to-Paste Jira/Linear Ticket"}
            </span>
          </div>
          {issues.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setContextOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-secondary text-foreground border border-border text-[11px] font-semibold hover:bg-secondary/80 transition"
              >
                <Code2 className="w-3 h-3" />
                <span>{contextOpen ? "Hide Code Context" : "Add GitHub / Code Context"}</span>
              </button>
              <button
                type="button"
                onClick={synthesizeAllIssues}
                disabled={synthesizingAll}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${synthesizingAll ? "animate-spin" : ""}`} />
                <span>{synthesizingAll ? "Synthesizing AI Fixes..." : "Synthesize All AI Fixes"}</span>
              </button>
            </div>
          )}
        </div>

        {contextOpen && (
          <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground">
                Optional Source Code / Public GitHub Context (Boosts Fix Accuracy to ~90%+)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Sent only when you click Generate / Synthesize All
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="url"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo or .../blob/main/app/layout.tsx"
                className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-xs font-mono"
              />
              <input
                type="text"
                value={sourceFilename}
                onChange={(e) => setSourceFilename(e.target.value)}
                placeholder="Filename hint if pasting code (e.g. functions.php, app/layout.tsx)"
                className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-xs font-mono"
              />
            </div>
            <textarea
              rows={4}
              value={pastedCode}
              onChange={(e) => setPastedCode(e.target.value)}
              placeholder="Or paste your local file / <head> / next.config.mjs / functions.php here (ideal for private/local codebases)..."
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs font-mono"
            />
          </div>
        )}

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

              return (
                <div
                  key={issue.id}
                  className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4"
                >
                  {/* Common Issue Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary text-foreground border border-border">
                            Stack: {rec.detectedStack}
                          </span>
                        )}
                      </div>
                      {issue.displayValue && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Potential Savings: {issue.displayValue}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>Impact: {rec?.estimatedImpact || "HIGH"}</span>
                      <span>•</span>
                      <span>Difficulty: {rec?.estimatedDifficulty || "MEDIUM"}</span>
                      <button
                        type="button"
                        onClick={() => synthesizeIssueFix(issue.id)}
                        disabled={synthesizingIssueId === issue.id || synthesizingAll}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-semibold border transition ${
                          !rec
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                            : "bg-secondary hover:bg-secondary/80 text-foreground border-border"
                        } disabled:opacity-50`}
                      >
                        <RefreshCw className={`w-3 h-3 ${synthesizingIssueId === issue.id ? "animate-spin" : ""}`} />
                        {synthesizingIssueId === issue.id
                          ? "Generating..."
                          : rec
                          ? "Regenerate AI Fix"
                          : "Generate AI Fix"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDeepSearchIssue(issue)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-sans font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 transition shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Deep Search
                      </button>
                    </div>
                  </div>

                  {/* Ask Free Web AI Providers (Zero API Keys Required) */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] bg-secondary/25 px-3 py-2 rounded-lg border border-border/70">
                    <span className="font-semibold text-muted-foreground mr-1">
                      Ask Free Web AI (No Key):
                    </span>
                    {EXTERNAL_AI_PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => askExternalAI(issue, p)}
                        title={p.prefill ? `Open ${p.label} with pre-filled prompt` : `Copy prompt & open ${p.label}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-card hover:bg-secondary text-foreground border border-border transition font-medium"
                      >
                        <span>{p.label}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => askExternalAI(issue)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition ml-auto"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy Prompt</span>
                    </button>
                  </div>

                  {/* 1. DEVELOPER VIEW */}
                  {audienceMode === "DEVELOPER" && (
                    <div className="space-y-4">
                      <div className="text-xs text-foreground/90 leading-relaxed bg-blue-500/5 p-4 rounded-lg border border-blue-500/20 space-y-2">
                        <div className="font-semibold text-[11px] text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5" />
                          What&apos;s Slow &amp; How to Fix It (Plain-English Dev Guide)
                        </div>
                        <p>
                          {rec?.explanationDeveloper ||
                            "This asset is slowing down how fast the page appears on screen. Click 'Generate AI Fix' above for tailored copy-paste code, or check the offending file list below."}
                        </p>
                      </div>

                      {/* 1-Click Git Diff & AST Remediation Patch Studio */}
                      <CodeDiffViewer
                        issueTitle={issue.title}
                        issueKey={issue.id}
                        detectedStack={rec?.detectedStack || "NEXT_JS"}
                        rawSnippet={rec?.remediationCodeSnippet || ""}
                        url={execution.url}
                        evidenceUrl={issue.evidenceDetails?.[0]?.url}
                        potentialSavings={issue.displayValue}
                      />

                      {/* Developer Implementation & Verification Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
                          <div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                            Step-by-Step Fix Checklist
                          </div>
                          <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                            {rec?.implementationSteps?.map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            )) || <li>Open the slow file listed below and defer or compress it so it loads after the page draws.</li>}
                          </ul>
                        </div>

                        <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
                          <div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                            How to Verify Your Fix Worked
                          </div>
                          <div className="p-2.5 rounded bg-zinc-950 font-mono text-[11px] text-emerald-400 border border-zinc-800 break-all select-all">
                            npx lighthouse-ci collect --url=&quot;{execution.url}&quot;
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] pt-1">
                            {rec?.verificationSteps?.map((v: string, i: number) => (
                              <li key={i}>{v}</li>
                            )) || <li>Re-run this URL in SpeedPilot after deploying and confirm the warning disappears.</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. MARKETER VIEW */}
                  {audienceMode === "MARKETER" && (
                    <div className="space-y-4">
                      {/* Plain English Business Summary */}
                      <div className="text-xs text-foreground/90 leading-relaxed bg-emerald-500/5 p-4 rounded-lg border border-emerald-500/20 space-y-2">
                        <div className="font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Plain-English Business Impact
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {rec?.explanationMarketer || "This issue slows down your website, causing visitors to bounce before content is readable."}
                        </p>
                      </div>

                      {/* Marketing ROI & Google Ranking Signals Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-lg border border-border bg-secondary/30 space-y-1">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            Conversion Impact
                          </div>
                          <div className="text-sm font-bold text-foreground">+3% to +7%</div>
                          <p className="text-[11px] text-muted-foreground">Projected conversion lift on mobile checkout</p>
                        </div>

                        <div className="p-3.5 rounded-lg border border-border bg-secondary/30 space-y-1">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Search className="w-3.5 h-3.5 text-blue-500" />
                            Google SEO Ranking
                          </div>
                          <div className="text-sm font-bold text-foreground">Page Experience Signal</div>
                          <p className="text-[11px] text-muted-foreground">Affects mobile search rank & Core Web Vitals pass</p>
                        </div>

                        <div className="p-3.5 rounded-lg border border-border bg-secondary/30 space-y-1">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-amber-500" />
                            Bounce Rate Risk
                          </div>
                          <div className="text-sm font-bold text-amber-500">~{issue.displayValue || "Moderate"} Delay</div>
                          <p className="text-[11px] text-muted-foreground">Mobile visitors abandon pages taking &gt; 3 seconds</p>
                        </div>
                      </div>

                      {/* Marketer Action Steps */}
                      {Array.isArray(rec?.implementationSteps) && rec.implementationSteps.length > 0 && (
                        <div className="p-3.5 rounded-lg border border-border bg-secondary/20 text-xs space-y-1.5">
                          <div className="font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Recommended Growth &amp; CMS Solutions
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {rec.implementationSteps.map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 1-Click Developer Handoff Brief */}
                      <div className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-primary" />
                            Copy Developer Handoff Brief
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Copy a ready-to-send brief to paste into Slack, Teams, or email for your web developer.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyDevBrief(issue, rec, idx)}
                          className="px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition flex items-center gap-1.5 shrink-0"
                        >
                          {copiedCodeIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Brief Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Dev Brief
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. AGENCY VIEW */}
                  {audienceMode === "AGENCY" && (
                    <div className="space-y-4">
                      <div className="text-xs text-foreground/90 leading-relaxed bg-purple-500/5 p-4 rounded-lg border border-purple-500/20 space-y-2">
                        <div className="font-semibold text-[11px] text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          Client-Ready Executive Deliverable
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {rec?.explanationAgency || "Recommended high-impact deliverable to present in client optimization proposals."}
                        </p>
                      </div>

                      {/* Effort vs Impact Matrix */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-lg border border-border bg-card space-y-0.5">
                          <span className="text-muted-foreground text-[10px] uppercase font-semibold">Priority</span>
                          <div className="font-bold text-foreground">{rec?.estimatedImpact || "HIGH"}</div>
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-card space-y-0.5">
                          <span className="text-muted-foreground text-[10px] uppercase font-semibold">Billable Dev Hours</span>
                          <div className="font-bold text-foreground">
                            {rec?.estimatedDifficulty === "LOW" ? "1 - 2 Hours" : rec?.estimatedDifficulty === "MEDIUM" ? "2 - 4 Hours" : "4 - 8 Hours"}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-card space-y-0.5">
                          <span className="text-muted-foreground text-[10px] uppercase font-semibold">Projected Score Lift</span>
                          <div className="font-bold text-emerald-500">+8 to +15 Pts</div>
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-card space-y-0.5">
                          <span className="text-muted-foreground text-[10px] uppercase font-semibold">Scope Classification</span>
                          <div className="font-bold text-foreground">
                            {rec?.estimatedDifficulty === "LOW" ? "Quick Win" : "Core Refactor"}
                          </div>
                        </div>
                      </div>

                      {/* Scope Deliverables List */}
                      {Array.isArray(rec?.implementationSteps) && rec.implementationSteps.length > 0 && (
                        <div className="p-3.5 rounded-lg border border-border bg-secondary/20 text-xs space-y-1.5">
                          <div className="font-semibold text-[11px] text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                            Client Scope &amp; Remediation Deliverables
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {rec.implementationSteps.map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 1-Click Client Proposal Deliverable */}
                      <div className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                            Client Proposal Snippet
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Copy this deliverable formatted for client proposals, pitch decks, and invoices.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyAgencyProposal(issue, rec, idx)}
                          className="px-3.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
                        >
                          {copiedCodeIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Proposal Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Proposal
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. SAAS / PRODUCT TEAM VIEW */}
                  {audienceMode === "SAAS_TEAM" && (
                    <div className="space-y-4">
                      <div className="text-xs text-foreground/90 leading-relaxed bg-amber-500/5 p-4 rounded-lg border border-amber-500/20 space-y-2">
                        <div className="font-semibold text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          Product Experience & Activation Bottleneck
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {rec?.explanationSaaSTeam || "Product friction point impacting new user onboarding latency."}
                        </p>
                      </div>

                      {/* Metric Target Attribution */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-lg border border-border bg-card space-y-0.5">
                          <span className="text-muted-foreground text-[10px] uppercase font-semibold">Affected Metric</span>
                          <div className="font-bold text-foreground">LCP &amp; Interaction Speed</div>
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-card space-y-0.5">
                          <span className="text-muted-foreground text-[10px] uppercase font-semibold">Savings Target</span>
                          <div className="font-bold text-emerald-500">~{issue.displayValue || "500ms"}</div>
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-card space-y-0.5">
                          <span className="text-muted-foreground text-[10px] uppercase font-semibold">CI Regression Risk</span>
                          <div className="font-bold text-foreground">High on Mobile Deployments</div>
                        </div>
                      </div>

                      {/* Sprint Acceptance & Regression Verification */}
                      {Array.isArray(rec?.verificationSteps) && rec.verificationSteps.length > 0 && (
                        <div className="p-3.5 rounded-lg border border-border bg-secondary/20 text-xs space-y-1.5">
                          <div className="font-semibold text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            CI/CD Guardrails &amp; Release Verification Criteria
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {rec.verificationSteps.map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 1-Click Jira / Linear Ticket Export */}
                      <div className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-amber-500" />
                            Agile Sprint Ticket (Jira / Linear)
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Copy a formatted user story with problem statement and acceptance criteria ready for sprint backlog.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyJiraTicket(issue, rec, idx)}
                          className="px-3.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
                        >
                          {copiedCodeIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Ticket Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Jira / Linear Ticket
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Offending Assets / Evidence (Shared across personas) */}
                  {Array.isArray(issue.evidenceDetails) && issue.evidenceDetails.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Diagnostic Evidence ({issue.evidenceDetails.length} item(s))
                      </div>
                      <div className="space-y-1">
                        {issue.evidenceDetails.slice(0, 3).map((item: any, i: number) => (
                          <div
                            key={i}
                            className="p-2 rounded bg-secondary/30 border border-border font-mono text-[11px] flex items-center justify-between truncate"
                          >
                            <span className="truncate max-w-lg">{item.url || item.description || "Resource"}</span>
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

      {/* AI Deep Search Modal */}
      {activeDeepSearchIssue && (
        <DeepSearchModal
          isOpen={!!activeDeepSearchIssue}
          onClose={() => setActiveDeepSearchIssue(null)}
          targetUrl={execution.url}
          techStack={execution.seo?.detectedTechStack || activeDeepSearchIssue.recommendations?.[0]?.detectedStack || "NEXTJS"}
          issue={activeDeepSearchIssue}
          initialPersona={audienceMode}
        />
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

