"use client";

import React, { useState } from "react";
import {
  Search,
  Globe,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Smartphone,
  Monitor,
  Sparkles,
  Link2,
  FileCode2,
  Share2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  BarChart2,
  FileText,
  Tag,
  ArrowUpRight,
  Copy,
  Check,
  Wand2,
  Code2,
} from "lucide-react";
import type { SEOResultData } from "@speedpilot/shared";

interface IssueItem {
  code: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  displayValue: string;
  evidence: string;
}

interface InspectionPayload {
  url: string;
  httpStatus: number;
  inspection: {
    seoData: SEOResultData;
    issues: IssueItem[];
  };
}

interface HistoricalSEOItem {
  id: string;
  url: string;
  device: string;
  httpStatus: number;
  isHttps: boolean;
  pageTitle: string | null;
  titleLength: number | null;
  metaDescription: string | null;
  descriptionLength: number | null;
  canonicalUrl: string | null;
  isCanonicalMatch: boolean;
  robotsDirectives: string | null;
  h1Count: number;
  missingAltImagesCount: number;
  hasOpenGraph: boolean;
  hasStructuredData: boolean;
  createdAt: string;
}

interface AIPatchPayload {
  recommendedTitle: string;
  recommendedDescription: string;
  jsonLdSchema: string;
  htmlCodeSnippet: string;
  explanation: string;
}

export function SEOClient({ initialResults }: { initialResults: HistoricalSEOItem[] }) {
  const [targetUrl, setTargetUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [compLoading, setCompLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"spider" | "content-serp" | "health-matrix">("spider");
  const [serpDevice, setSerpDevice] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [patchLoading, setPatchLoading] = useState(false);
  const [aiPatch, setAiPatch] = useState<AIPatchPayload | null>(null);

  // Active inspected URL state
  const [inspectedData, setInspectedData] = useState<InspectionPayload | null>(null);
  const [competitorData, setCompetitorData] = useState<InspectionPayload | null>(null);

  const handleInspect = async (urlToInspect?: string) => {
    const raw = urlToInspect || targetUrl;
    if (!raw.trim()) {
      setError("Please enter a valid website URL.");
      return;
    }

    setError(null);
    setLoading(true);
    setAiPatch(null);

    try {
      const res = await fetch("/api/v1/seo/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to inspect URL.");
      }

      setInspectedData(data);
      setTargetUrl(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!competitorUrl.trim()) return;
    setCompLoading(true);

    try {
      const res = await fetch("/api/v1/seo/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: competitorUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to inspect competitor URL.");
      }

      setCompetitorData(data);
    } catch (err: any) {
      alert(`Domain comparison failed: ${err.message}`);
    } finally {
      setCompLoading(false);
    }
  };

  const handleGeneratePatch = async () => {
    if (!inspectedData) return;
    setPatchLoading(true);

    try {
      const res = await fetch("/api/v1/seo/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: inspectedData.url,
          pageTitle: inspectedData.inspection.seoData.pageTitle,
          metaDescription: inspectedData.inspection.seoData.metaDescription,
          h1Text: inspectedData.inspection.seoData.h1Text,
          topKeywords: inspectedData.inspection.seoData.topKeywords,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to synthesize AI patch.");
      }

      setAiPatch(data.patch);
    } catch (err: any) {
      alert(`Patch generation error: ${err.message}`);
    } finally {
      setPatchLoading(false);
    }
  };

  const currentSeo = inspectedData?.inspection.seoData;
  const currentIssues = inspectedData?.inspection.issues || [];

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Search className="w-6 h-6 text-purple-500" />
            Universal SEO & Technical Spider Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autonomous spider crawl, live Google SERP simulation, and domain health gap analysis with generative AI code remediation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Enterprise Technical & Content Suite
          </span>
        </div>
      </div>

      {/* URL Live Inspector Bar */}
      <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Enter any target URL (e.g. https://stripe.com or techcrunch.com)..."
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInspect()}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => handleInspect()}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Inspect Live URL</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Example Suggestions */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
          <span className="font-medium">Quick Test:</span>
          {["https://github.com", "https://news.ycombinator.com", "https://stripe.com"].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                setTargetUrl(u);
                handleInspect(u);
              }}
              className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition text-[11px] font-mono"
            >
              {u.replace("https://", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Active Inspected URL View */}
      {inspectedData && currentSeo && (
        <div className="space-y-6">
          {/* Top Quick Score Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Technical Domain Health</p>
                <div className="text-2xl font-bold mt-1 text-emerald-500">
                  {currentSeo.ahrefsHealthScore ?? 85}/100
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Weighted hygiene rulebook</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">On-Page Content Score</p>
                <div className="text-2xl font-bold mt-1 text-purple-500">
                  {currentSeo.semrushScore ?? 80}/100
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Content & meta signals</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                <Tag className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Search Indexability Verdict</p>
                <div className="text-lg font-bold mt-1 flex items-center gap-1.5">
                  {currentSeo.isIndexable ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Indexable
                    </span>
                  ) : (
                    <span className="text-rose-500 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Blocked
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[150px]">
                  {currentSeo.indexabilityReason || "Ready for Google"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                <Link2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Content Depth</p>
                <div className="text-2xl font-bold mt-1 text-foreground">
                  {currentSeo.wordCount?.toLocaleString() ?? 0}{" "}
                  <span className="text-xs font-normal text-muted-foreground">words</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  ~{currentSeo.readingTimeMin ?? 1} min read
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Generative AI Fix Synthesis CTA Bar */}
          <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Wand2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">Generative SEO Remediation Engine</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Synthesize an optimized Title (&lt;600px), high-CTR Meta Description, and valid Organization JSON-LD Schema instantly.
                </p>
              </div>
            </div>
            <button
              onClick={handleGeneratePatch}
              disabled={patchLoading}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50"
            >
              {patchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Generate AI Code Patch</span>
            </button>
          </div>

          {/* AI Patch Drawer */}
          {aiPatch && (
            <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-semibold text-foreground">Synthesized Technical SEO Fix Patch</h3>
                </div>
                <button
                  onClick={() => copyText(aiPatch.htmlCodeSnippet)}
                  className="px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs flex items-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied to Clipboard!" : "Copy HTML Code Block"}</span>
                </button>
              </div>

              <p className="text-xs text-muted-foreground">{aiPatch.explanation}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-secondary/30 border border-border rounded-lg space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Recommended High-CTR Title
                  </span>
                  <div className="font-medium text-foreground text-sm">{aiPatch.recommendedTitle}</div>
                  <span className="text-[11px] text-emerald-500 font-mono">
                    {aiPatch.recommendedTitle.length} chars (~{Math.round(aiPatch.recommendedTitle.length * 9.5)}px / 600px)
                  </span>
                </div>

                <div className="p-3 bg-secondary/30 border border-border rounded-lg space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Recommended Meta Description
                  </span>
                  <div className="font-medium text-foreground text-xs leading-relaxed">{aiPatch.recommendedDescription}</div>
                  <span className="text-[11px] text-emerald-500 font-mono">
                    {aiPatch.recommendedDescription.length} chars (Target: 120-160)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Drop-in Head Code Patch:</span>
                <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-zinc-800">
                  {aiPatch.htmlCodeSnippet}
                </pre>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="border-b border-border flex items-center gap-2">
            <button
              onClick={() => setActiveTab("spider")}
              className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === "spider"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link2 className="w-4 h-4 text-emerald-500" />
              <span>Deep Spider & Crawl Architecture</span>
            </button>

            <button
              onClick={() => setActiveTab("content-serp")}
              className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === "content-serp"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Tag className="w-4 h-4 text-purple-500" />
              <span>SERP Simulator & Content Intelligence</span>
            </button>

            <button
              onClick={() => setActiveTab("health-matrix")}
              className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === "health-matrix"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart2 className="w-4 h-4 text-blue-500" />
              <span>Domain Health & Competitor Matrix</span>
            </button>
          </div>

          {/* TAB 1: SPIDER & CRAWL ARCHITECTURE */}
          {activeTab === "spider" && (
            <div className="space-y-6">
              {/* Architecture & Links Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    <span>Link Equity & Crawl</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Internal Links:</span>
                      <span className="font-semibold">{currentSeo.internalLinksCount ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">External Links:</span>
                      <span className="font-semibold">{currentSeo.externalLinksCount ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Nofollow Links:</span>
                      <span className="font-semibold">{currentSeo.nofollowLinksCount ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Protocol & SSL:</span>
                      <span className={`font-semibold ${currentSeo.isHttps ? "text-emerald-500" : "text-rose-500"}`}>
                        {currentSeo.isHttps ? "HTTPS Valid" : "Insecure HTTP"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-primary" />
                    <span>Headings Structure</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">H1 Headings:</span>
                      <span className={`font-semibold ${currentSeo.h1Count === 1 ? "text-emerald-500" : "text-amber-500"}`}>
                        {currentSeo.h1Count} {currentSeo.h1Count === 1 ? "(Optimal)" : "(Check)"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">H2 Subheadings:</span>
                      <span className="font-semibold">{currentSeo.h2Count ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">H3 Subheadings:</span>
                      <span className="font-semibold">{currentSeo.h3Count ?? 0}</span>
                    </div>
                    <div className="py-1 truncate">
                      <span className="text-muted-foreground block text-[11px]">Primary H1 Text:</span>
                      <span className="font-medium text-foreground text-xs truncate block" title={currentSeo.h1Text || "None"}>
                        {currentSeo.h1Text || "None"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>Media & Image SEO</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Total Images Detected:</span>
                      <span className="font-semibold">{currentSeo.totalImagesCount ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Missing Alt Attributes:</span>
                      <span className={`font-semibold ${currentSeo.missingAltImagesCount === 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {currentSeo.missingAltImagesCount}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">OpenGraph Social Meta:</span>
                      <span className={`font-semibold ${currentSeo.hasOpenGraph ? "text-emerald-500" : "text-amber-500"}`}>
                        {currentSeo.hasOpenGraph ? "Configured" : "Missing"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Structured Schema JSON-LD:</span>
                      <span className={`font-semibold ${currentSeo.hasStructuredData ? "text-emerald-500" : "text-amber-500"}`}>
                        {currentSeo.hasStructuredData ? "Present" : "None"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Issues Table */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Technical Crawl Issues ({currentIssues.length})</span>
                  </h3>
                  <span className="text-xs text-muted-foreground">Autonomous Crawler Diagnostic Rulebook</span>
                </div>

                {currentIssues.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    Clean crawl! 0 technical SEO errors detected.
                  </div>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                    {currentIssues.map((issue, idx) => (
                      <div key={idx} className="p-3 hover:bg-secondary/20 transition flex items-start gap-3 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${
                            issue.severity === "CRITICAL"
                              ? "bg-rose-500/15 text-rose-500 border border-rose-500/20"
                              : issue.severity === "HIGH"
                              ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                              : "bg-blue-500/15 text-blue-500 border border-blue-500/20"
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">{issue.title}</div>
                          <div className="text-muted-foreground mt-0.5">{issue.displayValue}</div>
                          <div className="text-[11px] font-mono text-muted-foreground/80 mt-1 bg-secondary/50 p-1.5 rounded">
                            {issue.evidence}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SERP SIMULATOR & CONTENT INTELLIGENCE */}
          {activeTab === "content-serp" && (
            <div className="space-y-6">
              {/* Google SERP Preview Simulator */}
              <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <span>Live Google SERP Snippet Simulator</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Visualizes how Google displays this page in real search results.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg">
                    <button
                      onClick={() => setSerpDevice("desktop")}
                      className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                        serpDevice === "desktop"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Desktop</span>
                    </button>
                    <button
                      onClick={() => setSerpDevice("mobile")}
                      className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                        serpDevice === "mobile"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile</span>
                    </button>
                  </div>
                </div>

                {/* Pixel Width Meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      Title Pixel Width:{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {currentSeo.serpSnippetPreview?.pixelWidthEstimate ?? 0}px / 600px
                      </span>
                    </span>
                    <span
                      className={`font-semibold ${
                        currentSeo.serpSnippetPreview?.isTitleTruncated ? "text-rose-500" : "text-emerald-500"
                      }`}
                    >
                      {currentSeo.serpSnippetPreview?.isTitleTruncated ? "⚠️ Truncated in Google SERP" : "✓ Within 600px Limit"}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        currentSeo.serpSnippetPreview?.isTitleTruncated ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          ((currentSeo.serpSnippetPreview?.pixelWidthEstimate ?? 300) / 600) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Realistic Google SERP Mockup Box */}
                <div
                  className={`border border-border/80 rounded-xl p-4 bg-background font-sans shadow-sm ${
                    serpDevice === "mobile" ? "max-w-md mx-auto" : "max-w-2xl"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                      G
                    </div>
                    <div className="text-[12px] text-muted-foreground font-normal truncate">
                      {currentSeo.serpSnippetPreview?.previewUrlDisplay}
                    </div>
                  </div>
                  <div className="text-base text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium leading-snug">
                    {currentSeo.pageTitle || "Missing Page Title"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                    {currentSeo.serpSnippetPreview?.snippet || "No snippet available."}
                  </div>
                </div>
              </div>

              {/* Keyword Density & Placement */}
              <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-500" />
                      <span>Top Keywords & Heading Placement (TF-IDF Analyzer)</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Identifies dominant keywords and verifies presence in Title & H1 tags.
                    </p>
                  </div>
                </div>

                {!currentSeo.topKeywords || currentSeo.topKeywords.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Insufficient body content to calculate keyword densities.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-medium">
                        <tr>
                          <th className="py-2.5 px-3">Keyword</th>
                          <th className="py-2.5 px-3">Occurrences</th>
                          <th className="py-2.5 px-3">Density %</th>
                          <th className="py-2.5 px-3">Found in Title</th>
                          <th className="py-2.5 px-3">Found in H1</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {currentSeo.topKeywords.map((kw, i) => (
                          <tr key={i} className="hover:bg-secondary/20">
                            <td className="py-2.5 px-3 font-semibold text-foreground font-mono">{kw.word}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{kw.count} times</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                  kw.densityPercent > 3.5
                                    ? "bg-rose-500/15 text-rose-500"
                                    : "bg-emerald-500/15 text-emerald-500"
                                }`}
                              >
                                {kw.densityPercent}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {kw.inTitle ? (
                                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Yes
                                </span>
                              ) : (
                                <span className="text-muted-foreground flex items-center gap-1">✕ Missing</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {kw.inH1 ? (
                                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Yes
                                </span>
                              ) : (
                                <span className="text-muted-foreground flex items-center gap-1">✕ Missing</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DOMAIN HEALTH & COMPETITOR MATRIX */}
          {activeTab === "health-matrix" && (
            <div className="space-y-6">
              {/* Structured Data & OpenGraph Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-blue-500" />
                    <span>Schema Rich Results & Types</span>
                  </h3>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Detected JSON-LD Structured Data Schema types for Google rich snippets:
                    </p>
                    {currentSeo.schemaTypes && currentSeo.schemaTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {currentSeo.schemaTypes.map((type, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          >
                            @{type}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-xs">
                        No schema types detected. Use the AI Generator above to auto-create valid JSON-LD schema.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-purple-500" />
                    <span>OpenGraph & Twitter Card Preview</span>
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">og:title:</span>
                      <span className="font-medium truncate max-w-[200px]" title={currentSeo.openGraphData?.ogTitle || "None"}>
                        {currentSeo.openGraphData?.ogTitle || "None"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">twitter:card:</span>
                      <span className="font-semibold font-mono">
                        {currentSeo.openGraphData?.twitterCard || "None"}
                      </span>
                    </div>
                    <div className="py-1">
                      <span className="text-muted-foreground block text-[11px]">og:image URL:</span>
                      <span className="font-mono text-[11px] truncate block text-primary" title={currentSeo.openGraphData?.ogImage || "None"}>
                        {currentSeo.openGraphData?.ogImage || "None"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Head-to-Head Competitor Gap Analyzer */}
              <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span>Head-to-Head Domain Gap Analyzer</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Benchmark your page side-by-side against any competitor domain or rival page.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter competitor URL (e.g. https://competitor.com)..."
                    value={competitorUrl}
                    onChange={(e) => setCompetitorUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    onClick={handleCompare}
                    disabled={compLoading || !competitorUrl.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center gap-2 disabled:opacity-50 shrink-0"
                  >
                    {compLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart2 className="w-3.5 h-3.5" />}
                    <span>Compare Against Domain</span>
                  </button>
                </div>

                {competitorData && (
                  <div className="border border-border rounded-xl overflow-hidden mt-4">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-medium">
                        <tr>
                          <th className="py-3 px-4">Metric / Signal</th>
                          <th className="py-3 px-4 text-primary font-semibold truncate max-w-xs">
                            Your Page: {inspectedData.url.replace(/^https?:\/\//, "").slice(0, 25)}...
                          </th>
                          <th className="py-3 px-4 text-emerald-500 font-semibold truncate max-w-xs">
                            Competitor: {competitorData.url.replace(/^https?:\/\//, "").slice(0, 25)}...
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-muted-foreground">Technical Domain Health</td>
                          <td className="py-2.5 px-4 font-bold text-foreground">
                            {currentSeo.ahrefsHealthScore ?? 85}/100
                          </td>
                          <td className="py-2.5 px-4 font-bold text-emerald-500">
                            {competitorData.inspection.seoData.ahrefsHealthScore ?? 85}/100
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-muted-foreground">On-Page Content Score</td>
                          <td className="py-2.5 px-4 font-bold text-foreground">
                            {currentSeo.semrushScore ?? 80}/100
                          </td>
                          <td className="py-2.5 px-4 font-bold text-purple-500">
                            {competitorData.inspection.seoData.semrushScore ?? 80}/100
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-muted-foreground">Indexability Verdict</td>
                          <td className="py-2.5 px-4">
                            <span className={currentSeo.isIndexable ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                              {currentSeo.isIndexable ? "✓ Indexable" : "✕ Blocked"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={competitorData.inspection.seoData.isIndexable ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                              {competitorData.inspection.seoData.isIndexable ? "✓ Indexable" : "✕ Blocked"}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-muted-foreground">Word Count & Depth</td>
                          <td className="py-2.5 px-4 font-mono font-semibold">
                            {currentSeo.wordCount?.toLocaleString() ?? 0} words
                          </td>
                          <td className="py-2.5 px-4 font-mono font-semibold">
                            {competitorData.inspection.seoData.wordCount?.toLocaleString() ?? 0} words
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-muted-foreground">Internal Links</td>
                          <td className="py-2.5 px-4 font-mono">
                            {currentSeo.internalLinksCount ?? 0}
                          </td>
                          <td className="py-2.5 px-4 font-mono">
                            {competitorData.inspection.seoData.internalLinksCount ?? 0}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-muted-foreground">Schema Types Detected</td>
                          <td className="py-2.5 px-4 font-semibold text-primary">
                            {currentSeo.schemaTypes?.join(", ") || "None"}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-emerald-500">
                            {competitorData.inspection.seoData.schemaTypes?.join(", ") || "None"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historical Audits Database Table */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <span>Audited Project Crawls ({initialResults.length})</span>
          </h2>
          <span className="text-xs text-muted-foreground">Click any audited URL to inspect in the suite</span>
        </div>

        {initialResults.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-border rounded-xl bg-card/40">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-semibold text-sm">No Technical SEO Records Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Enter any URL above or run a bulk audit to analyze your pages.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-medium">
                  <tr>
                    <th className="py-3 px-4">Audited Destination</th>
                    <th className="py-3 px-3">Title Length</th>
                    <th className="py-3 px-3">Meta Description</th>
                    <th className="py-3 px-3">Canonical</th>
                    <th className="py-3 px-3">H1 Count</th>
                    <th className="py-3 px-3">Alt Missing</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {initialResults.map((s) => (
                    <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4 font-mono max-w-xs truncate" title={s.url}>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{s.url}</span>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {s.pageTitle ? (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            {s.titleLength} chars
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Missing
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {s.metaDescription ? (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            {s.descriptionLength} chars
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Missing
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {s.canonicalUrl ? (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              s.isCanonicalMatch ? "text-emerald-500" : "text-amber-500"
                            }`}
                          >
                            {s.isCanonicalMatch ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                            {s.isCanonicalMatch ? "Matches" : "Mismatched"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span className={s.h1Count === 1 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                          {s.h1Count}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span className={s.missingAltImagesCount === 0 ? "text-emerald-500" : "text-rose-500 font-semibold"}>
                          {s.missingAltImagesCount}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetUrl(s.url);
                            handleInspect(s.url);
                          }}
                          className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs inline-flex items-center gap-1 transition"
                        >
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
