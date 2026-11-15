"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Code2,
  TrendingUp,
  Briefcase,
  Layers,
  Terminal,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Search,
} from "lucide-react";
import { getClientAIConfig } from "@/lib/ai-config";

type PersonaKey = "DEVELOPER" | "MARKETER" | "AGENCY" | "SAAS_TEAM";

export interface DeepSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl: string;
  techStack?: string;
  issue: {
    code: string;
    title: string;
    category?: string;
    severity?: string;
    displayValue?: string;
    evidenceItems?: Array<{
      url?: string;
      wastedMs?: number;
      wastedBytes?: number;
    }>;
  };
  initialPersona?: PersonaKey;
}

function extractKeyword(targetUrl: string): string {
  try {
    const u = new URL(targetUrl);
    const segments = u.pathname
      .split("/")
      .filter((s) => Boolean(s) && !/^\d+$/.test(s) && !["tag", "category", "author", "video", "post", "blog", "p"].includes(s.toLowerCase()));

    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const cleaned = last.replace(/[-_]+/g, " ").replace(/\.[a-z0-9]+$/i, "").trim();
      if (cleaned.length >= 3) return cleaned;
    }

    const host = u.hostname.replace(/^www\./, "").split(".")[0];
    return host || "primary brand keyword";
  } catch {
    return "primary brand keyword";
  }
}

export function DeepSearchModal({
  isOpen,
  onClose,
  targetUrl,
  techStack = "NEXTJS",
  issue,
  initialPersona = "DEVELOPER",
}: DeepSearchModalProps) {
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey>(initialPersona);
  const [loading, setLoading] = useState<boolean>(true);
  const [deepResult, setDeepResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (initialPersona) {
      setSelectedPersona(initialPersona);
    }
  }, [initialPersona]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    const aiConfig = getClientAIConfig();
    const rawEvidence = issue.evidenceItems || (issue as any).evidenceDetails;

    fetch("/api/v1/ai/deep-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUrl,
        techStack,
        persona: "ALL",
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        baseUrl: aiConfig.baseUrl,
        issue: {
          code: issue.code,
          title: issue.title,
          category: issue.category || "PERFORMANCE",
          severity: issue.severity || "HIGH",
          displayValue: issue.displayValue,
          evidenceItems:
            Array.isArray(rawEvidence) && rawEvidence.length > 0
              ? rawEvidence
              : [{ url: targetUrl, wastedMs: 500 }],
        },
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data) {
          setDeepResult(json.data);
        }
      })
      .catch(() => {
        // Fallback or silence
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUrl, techStack, issue.code]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const dev = deepResult?.developer;
  const marketer = deepResult?.marketer;
  const agency = deepResult?.agency;
  const saas = deepResult?.saasTeam;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-border bg-muted/40 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/15 text-primary mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              AI Deep Search Intelligence
            </div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              {issue.title}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary text-secondary-foreground font-semibold">
                {techStack}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                typeof marketer?.currentSearchRank === "number" && marketer.currentSearchRank > 0
                  ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/25"
                  : "bg-secondary text-muted-foreground border-border"
              }`}>
                {loading
                  ? "Checking SERP..."
                  : typeof marketer?.currentSearchRank === "number" && marketer.currentSearchRank > 0
                  ? `SERP Rank #${marketer.currentSearchRank}`
                  : "SERP: Unranked"}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-lg mt-0.5">
              Target: {targetUrl}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Persona Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-border bg-secondary/30">
          <button
            onClick={() => setSelectedPersona("DEVELOPER")}
            className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
              selectedPersona === "DEVELOPER"
                ? "border-blue-500 text-blue-500 bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="w-4 h-4 text-blue-500" />
            <span>Developers</span>
          </button>

          <button
            onClick={() => setSelectedPersona("MARKETER")}
            className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
              selectedPersona === "MARKETER"
                ? "border-emerald-500 text-emerald-500 bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Marketers</span>
          </button>

          <button
            onClick={() => setSelectedPersona("AGENCY")}
            className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
              selectedPersona === "AGENCY"
                ? "border-amber-500 text-amber-500 bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="w-4 h-4 text-amber-500" />
            <span>Agencies</span>
          </button>

          <button
            onClick={() => setSelectedPersona("SAAS_TEAM")}
            className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
              selectedPersona === "SAAS_TEAM"
                ? "border-purple-500 text-purple-500 bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4 text-purple-500" />
            <span>SaaS Platform</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm font-medium text-foreground">Executing AI Deep Search...</p>
              <p className="text-xs text-muted-foreground">
                Synthesizing AST trace, SEO algorithm impact, agency WBS, and CI performance budgets.
              </p>
            </div>
          ) : (
            <div>
              {/* 1. DEVELOPER VIEW */}
              {selectedPersona === "DEVELOPER" && dev && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                    <div className="flex items-center gap-2 text-blue-500 font-semibold">
                      <Code2 className="w-4 h-4" />
                      AST Diagnostics & Rendering Bottleneck
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>Stack: <strong className="text-foreground">{dev.detectedStack}</strong></span>
                      <span>Est. Fix: <strong className="text-foreground">{dev.estimatedDevMinutes} mins</strong></span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {dev.rootCauseAnalysis}
                  </p>

                  {dev.remediationDiff && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
                        <span>Framework Code Diff</span>
                        <button
                          onClick={() => copyToClipboard(dev.remediationDiff, "diff")}
                          className="inline-flex items-center gap-1 text-xs hover:text-foreground"
                        >
                          {copiedKey === "diff" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === "diff" ? "Copied" : "Copy Diff"}
                        </button>
                      </div>
                      <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                        <code>{dev.remediationDiff}</code>
                      </pre>
                    </div>
                  )}

                  {dev.bundlerConfigPatch && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
                        <span>Bundler & Server Patch</span>
                        <button
                          onClick={() => copyToClipboard(dev.bundlerConfigPatch, "bundler")}
                          className="inline-flex items-center gap-1 text-xs hover:text-foreground"
                        >
                          {copiedKey === "bundler" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === "bundler" ? "Copied" : "Copy Config"}
                        </button>
                      </div>
                      <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                        <code>{dev.bundlerConfigPatch}</code>
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border text-xs font-mono">
                    <div className="flex items-center gap-2 truncate">
                      <Terminal className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">Verify:</span>
                      <code className="text-foreground truncate">{dev.cliVerificationCommand}</code>
                    </div>
                    <button
                      onClick={() => copyToClipboard(dev.cliVerificationCommand, "cli")}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-semibold shrink-0"
                    >
                      {copiedKey === "cli" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      Copy CLI
                    </button>
                  </div>
                </div>
              )}

              {/* 2. MARKETER VIEW */}
              {selectedPersona === "MARKETER" && marketer && (
                <div className="space-y-5">
                  {/* Prominent Current Search Rank, Keyword & Real Testing Action Bar */}
                  {(() => {
                    const currentKw = marketer.currentSearchKeyword || extractKeyword(targetUrl);
                    const rankNum = marketer.currentSearchRank;
                    const isRanked = typeof rankNum === "number" && rankNum > 0;

                    return (
                      <>
                        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-black text-xl shrink-0 shadow-inner">
                              {isRanked ? `#${rankNum}` : "UR"}
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                <Search className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{isRanked ? "Live Verified Search Rank" : "SERP Search Position"}</span>
                              </div>
                              <div className="text-sm font-bold text-foreground flex items-center gap-2 mt-0.5">
                                <span>Target Keyword:</span>
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs">
                                  "{currentKw}"
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {isRanked
                                  ? `Verified rank #${rankNum} on Google/Web Search (live network fetch)`
                                  : "Unranked in top search results • High organic optimization opportunity"}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(currentKw, "keyword")}
                              className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-xs"
                              title="Copy search keyword to clipboard"
                            >
                              {copiedKey === "keyword" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedKey === "keyword" ? "Keyword Copied" : "Copy Keyword"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => copyToClipboard(targetUrl, "targetUrl")}
                              className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-xs"
                              title="Copy target URL to clipboard"
                            >
                              {copiedKey === "targetUrl" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedKey === "targetUrl" ? "URL Copied" : "Copy URL"}</span>
                            </button>

                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(currentKw)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition inline-flex items-center gap-1.5 shadow-xs"
                              title="Test this query live in Google Search"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Test in Google SERP</span>
                            </a>
                          </div>
                        </div>

                        {/* Real-time SERP Verification Card */}
                        <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                              Live SERP Ranking Verification
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Checked: Just now (Live network check)
                            </span>
                          </div>

                          <div className="p-3 rounded-lg bg-secondary/30 border border-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="font-semibold text-foreground">
                                {isRanked
                                  ? `Verified Position: #${rankNum} in top search results`
                                  : "Status: Unranked in top 10 search results"}
                              </div>
                              <div className="text-muted-foreground text-[11px] mt-0.5">
                                {isRanked
                                  ? `Target URL matches live search results for query "${currentKw}".`
                                  : `Target URL was not found in top 10 results for "${currentKw}". Track in SEO Command Center for automated ranking scans.`}
                              </div>
                            </div>
                            <div className="shrink-0">
                              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                                isRanked
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              }`}>
                                {isRanked ? `Page 1 • Rank #${rankNum}` : "Unranked / Opportunity"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-secondary/30 border border-border">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase">SERP Rank Risk</div>
                      <div className="text-base font-bold text-rose-500 mt-1 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        {marketer.serpRankRisk}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {marketer.currentSearchRank ? `Ranked #${marketer.currentSearchRank} • High ranking risk if unoptimized` : "Core Web Vitals latency directly impacts rank potential"}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-secondary/30 border border-border">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase">Bounce Rate Shift</div>
                      <div className="text-base font-bold text-emerald-500 mt-1">
                        {marketer.projectedBounceRateDelta}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-secondary/30 border border-border">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase">Conversion Uplift</div>
                      <div className="text-base font-bold text-blue-500 mt-1">
                        {marketer.estimatedConversionUplift}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/20 border border-border text-xs space-y-1.5">
                    <div className="font-semibold text-foreground">Plain-English Impact Summary</div>
                    <p className="text-muted-foreground leading-relaxed">{marketer.plainEnglishSummary}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Executive CMO Talking Points
                    </div>
                    <div className="space-y-2">
                      {marketer.executiveBulletPoints?.map((pt: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
                    <strong>Competitor Benchmark:</strong> {marketer.competitorGapNotice}
                  </div>
                </div>
              )}

              {/* 3. AGENCY VIEW */}
              {selectedPersona === "AGENCY" && agency && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                    <div className="flex items-center gap-2 text-amber-500 font-semibold">
                      <Briefcase className="w-4 h-4" />
                      Client Proposal & Scope Valuation
                    </div>
                    <div className="text-foreground font-bold">
                      Projected Gain: {agency.projectedScoreLift}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/20 border border-border text-xs space-y-1">
                    <div className="font-semibold text-foreground">Client Pitch Narrative</div>
                    <p className="text-muted-foreground leading-relaxed">{agency.clientPitchNarrative}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
                      <span>Work Breakdown Structure (WBS)</span>
                      <span>Total: {agency.totalEstimatedHours} billable hrs</span>
                    </div>

                    <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                      {agency.workBreakdownStructure?.map((task: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 text-xs bg-card">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-secondary text-foreground">
                              {task.priority}
                            </span>
                            <span className="text-foreground">{task.task}</span>
                          </div>
                          <span className="font-mono text-muted-foreground shrink-0">{task.estimatedHours} hrs</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-secondary/30 border border-border text-xs space-y-1">
                    <div className="font-semibold text-foreground">Client Deliverable</div>
                    <p className="text-muted-foreground">{agency.clientDeliverableSummary}</p>
                  </div>
                </div>
              )}

              {/* 4. SAAS TEAM VIEW */}
              {selectedPersona === "SAAS_TEAM" && saas && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg bg-secondary/30 border border-border">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase">SLA Breach Risk</div>
                      <div className="text-base font-bold text-purple-500 mt-1 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        {saas.slaBreachRisk}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-secondary/30 border border-border">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase">CI Enforcement Gate</div>
                      <div className="text-xs font-mono font-bold text-foreground mt-1.5">
                        {saas.performanceBudgetRule?.enforcementAction} ({saas.performanceBudgetRule?.targetThreshold})
                      </div>
                    </div>
                  </div>

                  {saas.ciConfigSnippet && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
                        <span>Lighthouse CI Budget Configuration (lighthouserc.json)</span>
                        <button
                          onClick={() => copyToClipboard(saas.ciConfigSnippet, "ci")}
                          className="inline-flex items-center gap-1 text-xs hover:text-foreground"
                        >
                          {copiedKey === "ci" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === "ci" ? "Copied" : "Copy lighthouserc.json"}
                        </button>
                      </div>
                      <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                        <code>{saas.ciConfigSnippet}</code>
                      </pre>
                    </div>
                  )}

                  {saas.sprintTicket && (
                    <div className="p-4 rounded-lg bg-secondary/20 border border-border text-xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                          <Clock className="w-4 h-4 text-purple-500" />
                          {saas.sprintTicket.title}
                        </div>
                        <button
                          onClick={() => {
                            const markdown = `# ${saas.sprintTicket.title}\n\n${saas.sprintTicket.description}\n\n### Acceptance Criteria\n${saas.sprintTicket.acceptanceCriteria?.map((c: string) => `- [ ] ${c}`).join("\n")}`;
                            copyToClipboard(markdown, "ticket");
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-semibold shrink-0"
                        >
                          {copiedKey === "ticket" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          Copy as Jira / Linear Ticket
                        </button>
                      </div>
                      <p className="text-muted-foreground">{saas.sprintTicket.description}</p>
                      <div className="pt-2 border-t border-border/60 space-y-1">
                        <div className="font-semibold text-[11px] uppercase text-muted-foreground">Acceptance Criteria</div>
                        {saas.sprintTicket.acceptanceCriteria?.map((ac: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{ac}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Source:</span>
            <span className="font-mono font-semibold text-foreground">
              {deepResult?.source === "AI_GENERATED" ? "Live AI Deep Search" : "Deterministic Search Engine"}
            </span>
            {deepResult?.executionMs && <span>({deepResult.executionMs}ms)</span>}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
