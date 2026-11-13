"use client";

import { useState } from "react";
import {
  Sparkles,
  Code2,
  TrendingUp,
  Briefcase,
  Layers,
  Terminal,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { getClientAIConfig } from "@/lib/ai-config";

type PersonaKey = "DEVELOPER" | "MARKETER" | "AGENCY" | "SAAS_TEAM";

const PRESET_ISSUES = [
  {
    code: "render-blocking-resources",
    title: "Eliminate render-blocking resources",
    severity: "HIGH" as const,
    wastedMs: 820,
    wastedBytes: 48000,
  },
  {
    code: "largest-contentful-paint-element",
    title: "Largest Contentful Paint element",
    severity: "HIGH" as const,
    wastedMs: 1400,
    wastedBytes: 320000,
  },
  {
    code: "unminified-css",
    title: "Minify CSS",
    severity: "MEDIUM" as const,
    wastedMs: 250,
    wastedBytes: 18000,
  },
];

export function DeepSearchExplorer() {
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey>("DEVELOPER");
  const [techStack, setTechStack] = useState<string>("NEXTJS");
  const [targetUrl, setTargetUrl] = useState<string>("https://my-store.example.com");
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deepResult, setDeepResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentIssue = PRESET_ISSUES[selectedIssueIndex];

  const handleRunSearch = async () => {
    setIsLoading(true);
    try {
      const aiConfig = getClientAIConfig();
      const res = await fetch("/api/v1/ai/deep-search", {
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
            code: currentIssue.code,
            title: currentIssue.title,
            category: "PERFORMANCE",
            severity: currentIssue.severity,
            evidenceItems: [
              {
                url: `${targetUrl}/static/css/bundle.css`,
                wastedMs: currentIssue.wastedMs,
                wastedBytes: currentIssue.wastedBytes,
              },
            ],
          },
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setDeepResult(json.data);
      }
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Top Banner */}
      <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 via-background to-secondary/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Multi-Persona AI Deep Search
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Deep Search Diagnostic Engine
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Simulate specialized root-cause and impact analysis for Developers, Marketers, Agencies, and SaaS Teams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSearch}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Running Deep Search..." : "Execute Deep Search"}
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/60">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Target URL
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full text-xs font-mono px-3 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Tech Stack
            </label>
            <select
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="NEXTJS">Next.js (App Router)</option>
              <option value="WORDPRESS">WordPress</option>
              <option value="WOOCOMMERCE">WooCommerce</option>
              <option value="SHOPIFY">Shopify</option>
              <option value="REACT">React SPA</option>
              <option value="LARAVEL">Laravel</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Audit Issue
            </label>
            <select
              value={selectedIssueIndex}
              onChange={(e) => setSelectedIssueIndex(Number(e.target.value))}
              className="w-full text-xs px-3 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PRESET_ISSUES.map((issue, idx) => (
                <option key={issue.code} value={idx}>
                  {issue.title} (~{issue.wastedMs}ms)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Persona Selection Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border bg-muted/30">
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
          <span>SaaS Platforms</span>
        </button>
      </div>

      {/* Persona Content Area */}
      <div className="p-6">
        {!deepResult ? (
          <div className="py-12 text-center text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Click &quot;Execute Deep Search&quot; above</p>
            <p className="text-xs mt-1">
              SpeedPilot will run the deep search engine across all 4 platforms and surface actionable intelligence.
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
                    Technical Root Cause & AST Analysis
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>Stack: <strong className="text-foreground">{dev.detectedStack}</strong></span>
                    <span>Est. Fix: <strong className="text-foreground">{dev.estimatedDevMinutes} mins</strong></span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground leading-relaxed">
                  {dev.rootCauseAnalysis}
                </div>

                {dev.remediationDiff && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
                      <span>Framework Code Diff</span>
                      <button
                        onClick={() => copyToClipboard(dev.remediationDiff, "diff")}
                        className="inline-flex items-center gap-1 text-xs hover:text-foreground"
                      >
                        {copiedKey === "diff" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === "diff" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                      <code>{dev.remediationDiff}</code>
                    </pre>
                  </div>
                )}

                {dev.bundlerConfigPatch && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Bundler & Server Configuration Patch
                    </div>
                    <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                      <code>{dev.bundlerConfigPatch}</code>
                    </pre>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border text-xs font-mono">
                  <Terminal className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">Verification:</span>
                  <code className="text-foreground">{dev.cliVerificationCommand}</code>
                </div>
              </div>
            )}

            {/* 2. MARKETER VIEW */}
            {selectedPersona === "MARKETER" && marketer && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase">SERP Rank Risk</div>
                    <div className="text-lg font-bold text-rose-500 mt-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      {marketer.serpRankRisk}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase">Bounce Rate Shift</div>
                    <div className="text-lg font-bold text-emerald-500 mt-1">
                      {marketer.projectedBounceRateDelta}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase">Conversion Uplift</div>
                    <div className="text-lg font-bold text-blue-500 mt-1">
                      {marketer.estimatedConversionUplift}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-secondary/30 border border-border text-xs space-y-2">
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
                  <strong>Competitor Insight:</strong> {marketer.competitorGapNotice}
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

                <div className="p-4 rounded-lg bg-secondary/30 border border-border text-xs space-y-1">
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

                <div className="p-3.5 rounded-lg bg-secondary/40 border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground">Client Deliverable</div>
                  <p className="text-muted-foreground">{agency.clientDeliverableSummary}</p>
                </div>
              </div>
            )}

            {/* 4. SAAS TEAM VIEW */}
            {selectedPersona === "SAAS_TEAM" && saas && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase">SLA Breach Risk</div>
                    <div className="text-lg font-bold text-purple-500 mt-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      {saas.slaBreachRisk}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-card border border-border">
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
                        {copiedKey === "ci" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                      <code>{saas.ciConfigSnippet}</code>
                    </pre>
                  </div>
                )}

                {saas.sprintTicket && (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border text-xs space-y-2">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <Clock className="w-4 h-4 text-purple-500" />
                      {saas.sprintTicket.title}
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

                <div className="p-3.5 rounded-lg bg-secondary/20 border border-border text-xs text-muted-foreground">
                  <strong>Synthetic vs. RUM Note:</strong> {saas.syntheticVsRumNote}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
