"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getClientAIConfig } from "@/lib/ai-config";
import {
  Zap,
  Upload,
  Globe,
  FileText,
  Smartphone,
  Monitor,
  Layers,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Compass,
  Bot,
  Link2,
  Sparkles,
  ShoppingCart,
  Package,
  BookOpen,
  Filter,
  Check,
  CheckSquare,
  Square,
  Search,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  FolderKanban,
  RefreshCw,
  Key,
} from "lucide-react";
import { parseBulkUrlString, validateAndNormalizeUrl } from "@speedpilot/shared";

type InputTab = "ai_recon" | "single" | "textarea" | "csv" | "sitemap" | "agentic";

interface ChildSitemap {
  url: string;
  fileName: string;
  label: string;
  description: string;
  isRecommended: boolean;
  urlCount: number;
  urls: string[];
}

export default function NewAuditPage() {
  const router = useRouter();

  // Mode and form states (Defaults to AI Deep Recon!)
  const [activeTab, setActiveTab] = useState<InputTab>("ai_recon");
  const [singleUrl, setSingleUrl] = useState("");
  const [textareaContent, setTextareaContent] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [sitemapMaxUrls, setSitemapMaxUrls] = useState<number | string>(500);
  const [sitemapLoading, setSitemapLoading] = useState(false);
  const [sitemapDiscovered, setSitemapDiscovered] = useState<string[]>([]);
  const [isSitemapIndex, setIsSitemapIndex] = useState(false);
  const [childSitemaps, setChildSitemaps] = useState<ChildSitemap[]>([]);
  const [selectedChildUrls, setSelectedChildUrls] = useState<Set<string>>(new Set());

  // AI Deep Recon state
  const [reconInput, setReconInput] = useState("");
  const [reconMaxPages, setReconMaxPages] = useState(35);
  const [reconMaxDepth, setReconMaxDepth] = useState(2);
  const [reconProbeHighValue, setReconProbeHighValue] = useState(true);
  const [reconLoading, setReconLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reconData, setReconData] = useState<any>(null);
  const [selectedReconUrls, setSelectedReconUrls] = useState<Set<string>>(new Set());
  const [reconCategoryFilter, setReconCategoryFilter] = useState<string>("ALL");
  const [reconSearchFilter, setReconSearchFilter] = useState("");

  // Agentic autonomous crawler state
  const [agenticRootUrl, setAgenticRootUrl] = useState("");
  const [agenticMaxPages, setAgenticMaxPages] = useState(25);
  const [agenticMaxDepth, setAgenticMaxDepth] = useState(2);
  const [agenticLoading, setAgenticLoading] = useState(false);
  const [agenticDiscovered, setAgenticDiscovered] = useState<string[]>([]);
  const [agenticPages, setAgenticPages] = useState<Array<{ url: string; title: string | null; depth: number }>>([]);
  const [agenticBrokenLinks, setAgenticBrokenLinks] = useState<Array<{ targetUrl: string; statusCode?: number }>>([]);

  const [deviceMode, setDeviceMode] = useState<"MOBILE" | "DESKTOP" | "BOTH">("BOTH");

  // Project state
  const [projects, setProjects] = useState<Array<{ id: string; name: string; primaryDomain: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCustomGoogleKey, setHasCustomGoogleKey] = useState(false);

  useEffect(() => {
    try {
      setHasCustomGoogleKey(!!localStorage.getItem("sp_google_key"));
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetch("/api/v1/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setProjects(data.data);
          if (data.data.length > 0) {
            setSelectedProjectId(data.data[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  // Handle CSV file selection
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setTextareaContent(text);
        setActiveTab("textarea");
      }
    };
    reader.readAsText(file);
  };

  // Discover URLs from Sitemap
  const handleDiscoverSitemap = async () => {
    if (!sitemapUrl) return;
    setSitemapLoading(true);
    setError(null);
    setChildSitemaps([]);
    setSelectedChildUrls(new Set());
    setIsSitemapIndex(false);

    try {
      const res = await fetch("/api/v1/sitemaps/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl, maxUrls: sitemapMaxUrls }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse sitemap");
      }

      const isIndex = Boolean(data.isSitemapIndex);
      setIsSitemapIndex(isIndex);

      if (isIndex && data.childSitemaps && data.childSitemaps.length > 0) {
        setChildSitemaps(data.childSitemaps);
        // Default to selecting all child sitemaps that contain pages
        const activeSet = new Set<string>(
          data.childSitemaps.filter((c: ChildSitemap) => c.urlCount > 0).map((c: ChildSitemap) => c.url)
        );
        setSelectedChildUrls(activeSet);

        // Aggregate URLs from active sitemaps
        const combinedUrls = data.childSitemaps
          .filter((c: ChildSitemap) => activeSet.has(c.url))
          .flatMap((c: ChildSitemap) => c.urls);
        setSitemapDiscovered(Array.from(new Set(combinedUrls)));
      } else {
        setSitemapDiscovered(data.urls || []);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSitemapLoading(false);
    }
  };

  // Toggle individual child sitemap selection
  const handleToggleChildSitemap = (childUrl: string) => {
    const nextSet = new Set(selectedChildUrls);
    if (nextSet.has(childUrl)) {
      nextSet.delete(childUrl);
    } else {
      nextSet.add(childUrl);
    }
    setSelectedChildUrls(nextSet);

    const combinedUrls = childSitemaps
      .filter((c) => nextSet.has(c.url))
      .flatMap((c) => c.urls);
    setSitemapDiscovered(Array.from(new Set(combinedUrls)));
  };

  // Quick select actions
  const selectAllChildSitemaps = () => {
    const allSet = new Set(childSitemaps.map((c) => c.url));
    setSelectedChildUrls(allSet);
    const combinedUrls = childSitemaps.flatMap((c) => c.urls);
    setSitemapDiscovered(Array.from(new Set(combinedUrls)));
  };

  const selectRecommendedChildSitemaps = () => {
    const recSet = new Set(childSitemaps.filter((c) => c.isRecommended).map((c) => c.url));
    setSelectedChildUrls(recSet);
    const combinedUrls = childSitemaps.filter((c) => recSet.has(c.url)).flatMap((c) => c.urls);
    setSitemapDiscovered(Array.from(new Set(combinedUrls)));
  };

  // Run AI Autonomous Recon
  const handleRunAIRecon = async () => {
    if (!reconInput) return;
    setReconLoading(true);
    setError(null);
    setReconData(null);
    setSelectedReconUrls(new Set());

    try {
      const res = await fetch("/api/v1/crawl/recon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainOrUrl: reconInput,
          maxPages: reconMaxPages,
          maxDepth: reconMaxDepth,
          probeHighValueRoutes: reconProbeHighValue,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "AI Recon crawl failed");
      }

      setReconData(json.data);
      // Auto-select recommended audit URLs by default!
      const initialSelected = new Set<string>(json.recommendedUrls || json.urls || []);
      setSelectedReconUrls(initialSelected);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setReconLoading(false);
    }
  };

  const handleTryDemo = (demoDomain: string) => {
    setReconInput(demoDomain);
  };

  const toggleReconUrl = (url: string) => {
    const next = new Set(selectedReconUrls);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setSelectedReconUrls(next);
  };

  const selectAllReconUrls = () => {
    if (!reconData?.pages) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSelectedReconUrls(new Set(reconData.pages.map((p: any) => p.url)));
  };

  const selectReconCategory = (cat: string) => {
    if (!reconData?.pages) return;
    const filtered = reconData.pages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.category === cat)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p.url);
    setSelectedReconUrls(new Set(filtered));
  };

  const selectCriticalAndHighRecon = () => {
    if (!reconData?.pages) return;
    const filtered = reconData.pages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.businessImpact === "CRITICAL" || p.businessImpact === "HIGH")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p.url);
    setSelectedReconUrls(new Set(filtered));
  };

  const clearReconSelection = () => {
    setSelectedReconUrls(new Set());
  };

  // Run autonomous Agentic Crawler
  const handleRunAgenticCrawl = async () => {
    if (!agenticRootUrl) return;
    setAgenticLoading(true);
    setError(null);
    setAgenticPages([]);
    setAgenticDiscovered([]);
    setAgenticBrokenLinks([]);

    try {
      const res = await fetch("/api/v1/crawl/agentic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rootUrl: agenticRootUrl,
          maxPages: agenticMaxPages,
          maxDepth: agenticMaxDepth,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Agentic crawl failed");
      }

      setAgenticPages(json.data.pages || []);
      setAgenticDiscovered(json.urls || []);
      setAgenticBrokenLinks(json.data.brokenLinks || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setAgenticLoading(false);
    }
  };

  // Submit Audit
  const handleSubmitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Gather URLs based on tab
      let targetUrls: string[] = [];
      if (activeTab === "ai_recon") {
        if (selectedReconUrls.size === 0) {
          throw new Error("Please select at least 1 discovered page to audit, or run AI Deep Recon first.");
        }
        targetUrls = Array.from(selectedReconUrls);
      } else if (activeTab === "single") {
        const norm = validateAndNormalizeUrl(singleUrl);
        if (!norm.isValid || !norm.normalizedUrl) {
          throw new Error(norm.error || "Please enter a valid website URL.");
        }
        if (norm.normalizedUrl.endsWith(".xml") || norm.normalizedUrl.includes("sitemap")) {
          throw new Error(
            "The URL entered is an XML sitemap file. Please use the 'XML Sitemap' tab so SpeedPilot can discover and audit the actual HTML web pages within it."
          );
        }
        targetUrls = [norm.normalizedUrl];
      } else if (activeTab === "textarea" || activeTab === "csv") {
        const parsed = parseBulkUrlString(textareaContent);
        if (parsed.validUrls.length === 0) {
          throw new Error("No valid URLs found in the text input.");
        }
        targetUrls = parsed.validUrls.filter((u) => !u.endsWith(".xml"));
        if (targetUrls.length === 0) {
          throw new Error("The submitted URLs appear to be XML sitemap files. Please use the 'XML Sitemap' tab.");
        }
      } else if (activeTab === "sitemap") {
        if (sitemapDiscovered.length === 0) {
          throw new Error("Please click 'Discover URLs' first so SpeedPilot can extract the web pages from the sitemap.");
        }
        targetUrls = sitemapDiscovered;
      } else if (activeTab === "agentic") {
        if (agenticDiscovered.length === 0) {
          throw new Error("Please run the Agentic Crawler first by clicking 'Launch Agentic Crawl'.");
        }
        targetUrls = agenticDiscovered;
      }

      // 2. Ensure or create project
      let targetProjectId = selectedProjectId;
      if (!targetProjectId || targetProjectId === "new") {
        const domain = new URL(targetUrls[0]).hostname;
        const res = await fetch("/api/v1/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newProjectName || domain,
            primaryDomain: domain,
            techStack: "UNKNOWN",
          }),
        });
        const projData = await res.json();
        if (!res.ok) throw new Error(projData.error || "Failed to create project");
        targetProjectId = projData.data.id;
      }

      // 3. Trigger audit (forward BYOK keys and AI model settings from local storage if available)
      const customGoogleKey = typeof window !== "undefined" ? localStorage.getItem("sp_google_key") || "" : "";
      const aiConfig = getClientAIConfig();

      const auditRes = await fetch("/api/v1/audits", {
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
          projectId: targetProjectId,
          deviceMode,
          urls: targetUrls,
        }),
      });

      const auditData = await auditRes.json();
      if (!auditRes.ok) {
        if (auditData.code === "TIER_LIMIT_REACHED") {
          throw new Error(
            `${auditData.error} You can configure your free Google API key anytime in Settings.`
          );
        }
        throw new Error(auditData.error || "Failed to trigger audit job");
      }

      // 4. Redirect to Results Screen
      router.push(`/audits/${auditData.jobId}`);
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Top Banner: Studio Header & Project Bar */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Audit Studio
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              SSRF Guard Active
            </span>
            <Link
              href="/settings"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                hasCustomGoogleKey
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              }`}
              title="Click to configure or change your free Google & AI API keys in Settings"
            >
              <Key className="w-3 h-3" />
              <span>{hasCustomGoogleKey ? "Custom Google Key: Active" : "Add Your Free Google API Key"}</span>
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Launch Performance Audit
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Autonomously discover conversion funnels, benchmark Lighthouse & Core Web Vitals, and generate AI-driven performance remediations.
          </p>
        </div>

        {/* Project Selector Box */}
        <div className="bg-secondary/50 rounded-xl p-3 border border-border flex flex-col gap-2 shrink-0 sm:min-w-[280px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              Target Project
            </span>
            <button
              type="button"
              onClick={() => setSelectedProjectId("new")}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              + New Project
            </button>
          </div>

          {selectedProjectId === "new" ? (
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Enter new project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-primary/30 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setSelectedProjectId(projects[0]?.id || "")}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                ← Cancel & select existing
              </button>
            </div>
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-background border border-border text-xs font-semibold text-foreground rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.primaryDomain})
                </option>
              ))}
              <option value="new">+ Create New Project</option>
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmitAudit} className="space-y-6">
        {/* Step 2: URL Discovery / Input Method Navigation */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Discovery & URL Input Method</h2>
              <p className="text-[11px] text-muted-foreground">
                Choose how you want SpeedPilot to acquire the URLs for this audit job.
              </p>
            </div>

            {/* Clean Segmented Tab Control */}
            <div className="inline-flex items-center p-1 rounded-xl bg-secondary/80 border border-border text-xs font-medium gap-1 shadow-xs overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab("ai_recon")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "ai_recon"
                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>AI Deep Recon</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                  RECOMMENDED
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("single")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "single"
                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Single URL</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("textarea")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "textarea"
                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Batch List</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("csv")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "csv"
                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>CSV Upload</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("sitemap")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "sitemap"
                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>XML Sitemap</span>
              </button>
            </div>
          </div>

          {/* AI Deep Recon Tab (Featured) */}
          {activeTab === "ai_recon" && (
            <div className="space-y-5">
              {/* Command Box */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-foreground tracking-tight">
                        Autonomous Site Reconnaissance & Funnel Discovery
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-xl">
                      Enter any brand or client domain. SpeedPilot auto-probes sitemaps, navigates internal links, detects the tech stack, and classifies pages by revenue and conversion impact.
                    </p>
                  </div>

                  {/* Scan Limit Selector */}
                  <div className="flex items-center gap-2 bg-secondary/60 p-1.5 rounded-xl border border-border text-xs shrink-0">
                    <span className="text-[10px] font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                      Discovery Scope:
                    </span>
                    <select
                      value={reconMaxPages}
                      onChange={(e) => setReconMaxPages(Number(e.target.value))}
                      className="bg-card text-xs font-semibold px-2.5 py-1 rounded-lg border border-border focus:outline-none cursor-pointer"
                    >
                      <option value={20}>20 Pages (Fast)</option>
                      <option value={35}>35 Pages (Standard)</option>
                      <option value={50}>50 Pages (Deep)</option>
                      <option value={100}>100 Pages (Comprehensive)</option>
                    </select>
                  </div>
                </div>

                {/* Primary Command Input Bar */}
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1">
                  <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Globe className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="text"
                      placeholder="Enter target domain or URL (e.g. nike.com, vercel.com, techcrunch.com)"
                      value={reconInput}
                      onChange={(e) => setReconInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRunAIRecon();
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm font-mono placeholder:font-sans placeholder:text-muted-foreground/60 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRunAIRecon}
                    disabled={reconLoading || !reconInput}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 shrink-0 cursor-pointer active:scale-[0.99]"
                  >
                    {reconLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Scanning Architecture...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-current" />
                        <span>Launch AI Recon</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Demo Chips & Quick Toggles */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px] text-muted-foreground border-t border-border/50">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground/80">Try Example:</span>
                    {["nike.com", "vercel.com", "techcrunch.com", "linear.app"].map((demoDomain) => (
                      <button
                        key={demoDomain}
                        type="button"
                        onClick={() => handleTryDemo(demoDomain)}
                        className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground font-mono text-[11px] border border-border transition cursor-pointer"
                      >
                        {demoDomain}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition select-none">
                    <input
                      type="checkbox"
                      checked={reconProbeHighValue}
                      onChange={(e) => setReconProbeHighValue(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Auto-probe high-value conversion endpoints (/pricing, /checkout, /cart, /signup)</span>
                  </label>
                </div>
              </div>

              {/* Recon Results Dashboard */}
              {reconData && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Overview Telemetry Bar */}
                  <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Target Domain:</span>
                        <span className="font-bold text-foreground font-mono bg-secondary px-2 py-0.5 rounded-md border border-border">
                          {reconData.domain}
                        </span>
                      </div>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Detected Stack:</span>
                        <span className="font-semibold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                          {reconData.detectedStack}
                        </span>
                      </div>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Layers className="w-3.5 h-3.5 text-emerald-500" />
                        <span>
                          {reconData.sitemapFound ? "Sitemap Detected & Parsed" : "Direct Spider Crawled"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-mono font-bold text-xs shadow-xs">
                        {selectedReconUrls.size} of {reconData.totalPagesDiscovered} Pages Selected
                      </span>
                    </div>
                  </div>

                  {/* Intent Category Filter Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setReconCategoryFilter("CHECKOUT_FUNNEL");
                        selectReconCategory("CHECKOUT_FUNNEL");
                      }}
                      className={`p-3.5 rounded-xl border text-left space-y-1.5 transition cursor-pointer ${
                        reconCategoryFilter === "CHECKOUT_FUNNEL"
                          ? "ring-2 ring-rose-500 border-rose-500 bg-rose-500/10 shadow-sm"
                          : "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="font-bold text-sm font-mono">{reconData.categoryCounts.CHECKOUT_FUNNEL || 0}</span>
                      </div>
                      <div className="text-xs font-bold text-foreground">Checkout & Funnels</div>
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-semibold">Critical Risk</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReconCategoryFilter("LANDING_PAGE");
                        selectReconCategory("LANDING_PAGE");
                      }}
                      className={`p-3.5 rounded-xl border text-left space-y-1.5 transition cursor-pointer ${
                        reconCategoryFilter === "LANDING_PAGE"
                          ? "ring-2 ring-amber-500 border-amber-500 bg-amber-500/10 shadow-sm"
                          : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <Zap className="w-4 h-4" />
                        <span className="font-bold text-sm font-mono">{reconData.categoryCounts.LANDING_PAGE || 0}</span>
                      </div>
                      <div className="text-xs font-bold text-foreground">Landing Pages</div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-semibold">High Impact</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReconCategoryFilter("CATALOG_PRODUCT");
                        selectReconCategory("CATALOG_PRODUCT");
                      }}
                      className={`p-3.5 rounded-xl border text-left space-y-1.5 transition cursor-pointer ${
                        reconCategoryFilter === "CATALOG_PRODUCT"
                          ? "ring-2 ring-purple-500 border-purple-500 bg-purple-500/10 shadow-sm"
                          : "border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                        <Package className="w-4 h-4" />
                        <span className="font-bold text-sm font-mono">{reconData.categoryCounts.CATALOG_PRODUCT || 0}</span>
                      </div>
                      <div className="text-xs font-bold text-foreground">Products & Catalog</div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-semibold">High Traffic</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReconCategoryFilter("CONTENT_SEO");
                        selectReconCategory("CONTENT_SEO");
                      }}
                      className={`p-3.5 rounded-xl border text-left space-y-1.5 transition cursor-pointer ${
                        reconCategoryFilter === "CONTENT_SEO"
                          ? "ring-2 ring-blue-500 border-blue-500 bg-blue-500/10 shadow-sm"
                          : "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                        <BookOpen className="w-4 h-4" />
                        <span className="font-bold text-sm font-mono">{reconData.categoryCounts.CONTENT_SEO || 0}</span>
                      </div>
                      <div className="text-xs font-bold text-foreground">Content & SEO</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold">Organic Inbound</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReconCategoryFilter("UTILITY_LEGAL");
                        selectReconCategory("UTILITY_LEGAL");
                      }}
                      className={`p-3.5 rounded-xl border text-left space-y-1.5 transition cursor-pointer ${
                        reconCategoryFilter === "UTILITY_LEGAL"
                          ? "ring-2 ring-foreground/40 border-foreground/40 bg-secondary shadow-sm"
                          : "border-border bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-muted-foreground">
                        <Layers className="w-4 h-4" />
                        <span className="font-bold text-sm font-mono">{reconData.categoryCounts.UTILITY_LEGAL || 0}</span>
                      </div>
                      <div className="text-xs font-bold text-foreground">Utility & Legal</div>
                      <div className="text-[10px] text-muted-foreground font-mono font-semibold">Standard</div>
                    </button>
                  </div>

                  {/* Filter and Quick Selection Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                        Quick Select:
                      </span>
                      <button
                        type="button"
                        onClick={selectCriticalAndHighRecon}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 font-semibold transition text-[11px] cursor-pointer"
                      >
                        Critical & High Risk
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (reconData?.recommendedAuditUrls) {
                            setSelectedReconUrls(new Set(reconData.recommendedAuditUrls));
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 font-medium transition text-[11px] cursor-pointer"
                      >
                        Top 15 Recommended
                      </button>
                      <button
                        type="button"
                        onClick={selectAllReconUrls}
                        className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 font-medium transition text-[11px] cursor-pointer"
                      >
                        Select All ({reconData.totalPagesDiscovered})
                      </button>
                      <button
                        type="button"
                        onClick={clearReconSelection}
                        className="px-2.5 py-1 rounded-lg border border-border hover:bg-secondary font-medium transition text-[11px] text-muted-foreground cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={reconCategoryFilter}
                        onChange={(e) => setReconCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-input bg-background text-xs font-medium cursor-pointer"
                      >
                        <option value="ALL">All Categories</option>
                        <option value="CHECKOUT_FUNNEL">Checkout & Funnels</option>
                        <option value="LANDING_PAGE">Landing Pages</option>
                        <option value="CATALOG_PRODUCT">Products & Catalog</option>
                        <option value="CONTENT_SEO">Content & SEO</option>
                        <option value="UTILITY_LEGAL">Utility & Legal</option>
                      </select>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search URLs..."
                          value={reconSearchFilter}
                          onChange={(e) => setReconSearchFilter(e.target.value)}
                          className="pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs font-mono max-w-[160px] focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Discovered Pages Table */}
                  <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                    <div className="max-h-72 overflow-y-auto divide-y divide-border text-xs">
                      {reconData.pages
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .filter((p: any) => {
                          const matchesCat = reconCategoryFilter === "ALL" || p.category === reconCategoryFilter;
                          const matchesSearch =
                            !reconSearchFilter ||
                            p.url.toLowerCase().includes(reconSearchFilter.toLowerCase()) ||
                            (p.title || "").toLowerCase().includes(reconSearchFilter.toLowerCase());
                          return matchesCat && matchesSearch;
                        })
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .map((p: any) => {
                          const isSelected = selectedReconUrls.has(p.url);
                          return (
                            <div
                              key={p.url}
                              onClick={() => toggleReconUrl(p.url)}
                              className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                                isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-secondary/40"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="text-primary shrink-0">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 fill-primary text-primary-foreground" />
                                  ) : (
                                    <Square className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground truncate text-xs">
                                      {p.title && p.title !== p.pathname
                                        ? p.title
                                        : p.pathname === "/" || p.pathname === ""
                                        ? "Home / Front Page"
                                        : p.pathname
                                            .split("/")
                                            .filter(Boolean)
                                            .filter((s: string) => !/^\d+$/.test(s) && s !== "c" && s !== "p")
                                            .pop()
                                            ?.replace(/[-_]+/g, " ")
                                            .replace(/\b\w/g, (c: string) => c.toUpperCase()) || p.pathname}
                                    </span>
                                    <span className="font-mono text-[11px] text-muted-foreground truncate">
                                      {p.pathname}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                                    {p.impactReason}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Category Badge */}
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                    p.category === "CHECKOUT_FUNNEL"
                                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                      : p.category === "LANDING_PAGE"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                      : p.category === "CATALOG_PRODUCT"
                                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                      : p.category === "CONTENT_SEO"
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                      : "bg-secondary text-muted-foreground border border-border"
                                  }`}
                                >
                                  {p.category === "CHECKOUT_FUNNEL" && "Checkout"}
                                  {p.category === "LANDING_PAGE" && "Landing"}
                                  {p.category === "CATALOG_PRODUCT" && "Product"}
                                  {p.category === "CONTENT_SEO" && "Content"}
                                  {p.category === "UTILITY_LEGAL" && "Utility"}
                                </span>

                                {/* Impact Badge */}
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] uppercase ${
                                    p.businessImpact === "CRITICAL"
                                      ? "bg-rose-500 text-white"
                                      : p.businessImpact === "HIGH"
                                      ? "bg-amber-500 text-white"
                                      : p.businessImpact === "MEDIUM"
                                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                      : "bg-secondary text-muted-foreground"
                                  }`}
                                >
                                  {p.businessImpact}
                                </span>

                                <a
                                  href={p.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-muted-foreground hover:text-foreground p-1"
                                  title="Open in new tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Broken Links Alert */}
                  {reconData.brokenLinks?.length > 0 && (
                    <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-600 dark:text-rose-400 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        AI Recon Detected {reconData.brokenLinks.length} Broken Internal Link(s)
                      </div>
                      <div className="max-h-20 overflow-y-auto font-mono text-[11px] text-muted-foreground space-y-0.5">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {reconData.brokenLinks.map((b: any, i: number) => (
                          <div key={i} className="truncate text-rose-500">
                            • {b.targetUrl} ({b.statusCode ? `Status ${b.statusCode}` : b.errorMessage || "Failed"})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Single URL Tab */}
          {activeTab === "single" && (
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
              <label className="text-xs font-semibold text-foreground">Website Target URL</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                SpeedPilot will run Lighthouse lab analysis, CrUX field queries, and technical SEO hygiene on this endpoint.
              </p>
            </div>
          )}

          {/* Textarea Tab */}
          {activeTab === "textarea" && (
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
              <label className="text-xs font-semibold text-foreground">Paste URLs (one per line)</label>
              <textarea
                rows={6}
                placeholder={"https://example.com/\nhttps://example.com/pricing\nhttps://example.com/blog/speed"}
                value={textareaContent}
                onChange={(e) => setTextareaContent(e.target.value)}
                className="w-full p-3 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Duplicate URLs and hash fragments will be automatically normalized and deduplicated.
              </p>
            </div>
          )}

          {/* CSV Upload Tab */}
          {activeTab === "csv" && (
            <div className="p-10 border-2 border-dashed border-border rounded-2xl text-center bg-card shadow-xs">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <label className="inline-block cursor-pointer px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-sm">
                <span>Select CSV Spreadsheet</span>
                <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
              </label>
              <p className="text-xs text-muted-foreground mt-3">
                Upload a CSV containing URLs in any column. We will automatically parse and validate each line.
              </p>
            </div>
          )}

          {/* XML Sitemap Tab */}
          {activeTab === "sitemap" && (
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">XML Sitemap or Sitemap Index URL</label>
                  <span className="text-[11px] text-muted-foreground">Select scope to audit all or sampled URLs</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/sitemap.xml"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={sitemapMaxUrls}
                      onChange={(e) => setSitemapMaxUrls(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                      className="px-3 py-2.5 rounded-xl border border-input bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                    >
                      <option value={100}>100 URLs</option>
                      <option value={200}>200 URLs</option>
                      <option value={500}>500 URLs (Recommended)</option>
                      <option value={1000}>1,000 URLs</option>
                      <option value="ALL">All URLs (Maximum)</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleDiscoverSitemap}
                      disabled={sitemapLoading || !sitemapUrl}
                      className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 disabled:opacity-50 shrink-0 shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      {sitemapLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                      Discover URLs
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Works with both standard <code className="font-mono bg-secondary px-1 py-0.5 rounded">&lt;urlset&gt;</code> sitemaps and nested <code className="font-mono bg-secondary px-1 py-0.5 rounded">&lt;sitemapindex&gt;</code> files.
                </p>
              </div>

              {/* Sitemap Index Multi-Sitemap Breakdown */}
              {isSitemapIndex && childSitemaps.length > 0 && (
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-500/10 pb-2">
                    <div>
                      <h3 className="text-xs font-semibold text-blue-500 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        Sitemap Index Detected ({childSitemaps.length} Sub-Sitemaps Found)
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        This site divides its content into specialized sub-sitemaps. Select which groups you want to audit below:
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={selectAllChildSitemaps}
                        className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 font-medium transition cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={selectRecommendedChildSitemaps}
                        className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 font-medium transition text-primary cursor-pointer"
                      >
                        Articles & Pages Only
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {childSitemaps.map((child) => {
                      const isSelected = selectedChildUrls.has(child.url);
                      return (
                        <div
                          key={child.url}
                          onClick={() => handleToggleChildSitemap(child.url)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-start gap-2.5 ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs"
                              : "border-border bg-card/60 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus:ring-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold truncate text-foreground">{child.label}</span>
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                {child.urlCount} URLs
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                              {child.fileName}
                            </div>
                            <p className="text-[10px] text-muted-foreground/80 mt-1 line-clamp-1">
                              {child.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Discovered URLs preview */}
              {sitemapDiscovered.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-secondary/20 text-xs space-y-2">
                  <div className="font-semibold text-emerald-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Ready to Audit: {sitemapDiscovered.length} Selected Web Page URLs
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Filtered & XMLs excluded
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-border/50">
                    {sitemapDiscovered.slice(0, 15).map((u, i) => (
                      <div key={i} className="truncate">• {u}</div>
                    ))}
                    {sitemapDiscovered.length > 15 && (
                      <div className="italic text-muted-foreground/60 pt-1">
                        + {sitemapDiscovered.length - 15} more URLs ready for execution
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Device Strategy */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Device Strategies</h2>
            <span className="text-[11px] text-muted-foreground">Emulates network latency and screen resolutions</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setDeviceMode("BOTH")}
              className={`p-4 rounded-xl border text-left transition flex flex-col gap-1.5 cursor-pointer ${
                deviceMode === "BOTH"
                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary shadow-xs"
                  : "border-border hover:bg-secondary/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                  <Layers className="w-4 h-4 text-primary" />
                  Both (Recommended)
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">360° AUDIT</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Parallel mobile & desktop benchmarks</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceMode("MOBILE")}
              className={`p-4 rounded-xl border text-left transition flex flex-col gap-1.5 cursor-pointer ${
                deviceMode === "MOBILE"
                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary shadow-xs"
                  : "border-border hover:bg-secondary/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                  <Smartphone className="w-4 h-4 text-primary" />
                  Mobile Only
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">GOOGLE BOT</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Emulated Moto G4 on 4G network</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceMode("DESKTOP")}
              className={`p-4 rounded-xl border text-left transition flex flex-col gap-1.5 cursor-pointer ${
                deviceMode === "DESKTOP"
                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary shadow-xs"
                  : "border-border hover:bg-secondary/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                  <Monitor className="w-4 h-4 text-primary" />
                  Desktop Only
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">1080P</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Desktop 1920x1080 resolution</span>
            </button>
          </div>
        </div>

        {/* Submit Launch CTA Bar */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={loading || (activeTab === "ai_recon" && selectedReconUrls.size === 0)}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initiating Performance Audit Pipeline...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>
                  {activeTab === "ai_recon" && selectedReconUrls.size > 0
                    ? `Launch Bulk Performance Audit on ${selectedReconUrls.size} Selected Pages`
                    : "Launch Bulk Performance Audit"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            Audits run through Google Lighthouse Lab engines and real-world Chrome UX (CrUX) field telemetry.
          </p>
        </div>
      </form>
    </div>
  );
}

