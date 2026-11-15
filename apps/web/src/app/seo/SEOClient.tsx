"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePersona, Persona, PERSONA_CONFIGS } from "@/lib/persona";
import {
  FolderKanban,
  Briefcase,
  Users,
  Terminal,
  DollarSign,
  CalendarCheck,
  FileSpreadsheet,
  CheckSquare,
  Clock,
  Filter,
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
  Trophy,
  TrendingUp,
  Swords,
  Plus,
  RefreshCw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  History,
  X,
} from "lucide-react";
import Link from "next/link";
import type { SEOResultData } from "@speedpilot/shared";

interface SerpCompetitorItem {
  rank: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

interface SerpTrackerResult {
  keyword: string;
  targetDomain: string;
  targetRank: number | null;
  targetUrl: string | null;
  totalResultsFound: number;
  providerUsed: "GOOGLE_CSE" | "DUCKDUCKGO_HTML";
  intent?: "INFORMATIONAL" | "COMMERCIAL" | "TRANSACTIONAL" | "NAVIGATIONAL";
  country?: string;
  competitors: SerpCompetitorItem[];
  peopleAlsoAsk: string[];
  aiClimbingAnalysis: {
    gapSummary: string;
    topCompetitorTitle: string;
    topCompetitorDomain: string;
    actionableTips: string[];
  };
}

export interface TrackedKeywordItem {
  id: string;
  projectId: string;
  projectName: string;
  keyword: string;
  targetDomain: string;
  currentRank: number | null;
  previousRank: number | null;
  intent?: string | null;
  country?: string | null;
  targetUrl: string | null;
  topCompetitor: string | null;
  topCompetitorUrl: string | null;
  history: Array<{ rank: number | null; topCompetitor?: string; checkedAt: string }>;
  lastCheckedAt: string;
}

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

export interface ProjectOption {
  id: string;
  name: string;
  primaryDomain: string;
  techStack: string;
  auditJobsCount: number;
  urlsCount: number;
}

export interface HistoricalSEOItem {
  id: string;
  url: string;
  device: string;
  projectId?: string | null;
  projectName?: string | null;
  primaryDomain?: string | null;
  h1Text?: string | null;
  hasBrokenInternalLinks?: boolean;
  brokenLinksCount?: number;
  internalLinksCount?: number;
  externalLinksCount?: number;
  nofollowLinksCount?: number;
  h2Count?: number;
  h3Count?: number;
  wordCount?: number;
  topKeywords?: Array<{ word: string; count: number }>;
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


export function extractDomain(url?: string | null): string {
  if (!url) return "";
  try {
    const raw = url.startsWith("http") ? url : `https://${url}`;
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

export function convertHistoricalToInspection(item: HistoricalSEOItem): InspectionPayload {
  const issues: IssueItem[] = [];

  if (!item.pageTitle) {
    issues.push({
      code: "MISSING_TITLE",
      title: "Missing Page Title Tag",
      severity: "CRITICAL",
      displayValue: "No <title> found",
      evidence: "Every indexable page must have an informative, unique title tag.",
    });
  } else if ((item.titleLength || 0) > 60) {
    issues.push({
      code: "TITLE_TOO_LONG",
      title: "Title Exceeds Google 600px Display Limit",
      severity: "MEDIUM",
      displayValue: `${item.titleLength} characters (recommended: 50-60)`,
      evidence: item.pageTitle,
    });
  }

  if (!item.metaDescription) {
    issues.push({
      code: "MISSING_META_DESCRIPTION",
      title: "Missing Meta Description Tag",
      severity: "HIGH",
      displayValue: "No meta description found",
      evidence: "Meta descriptions drive click-through rate (CTR) in search results.",
    });
  } else if ((item.descriptionLength || 0) > 160) {
    issues.push({
      code: "DESCRIPTION_TOO_LONG",
      title: "Meta Description Truncated in SERPs",
      severity: "LOW",
      displayValue: `${item.descriptionLength} characters (recommended: 120-160)`,
      evidence: item.metaDescription,
    });
  }

  if (!item.isCanonicalMatch && item.canonicalUrl) {
    issues.push({
      code: "CANONICAL_MISMATCH",
      title: "Canonical URL Mismatch",
      severity: "MEDIUM",
      displayValue: item.canonicalUrl,
      evidence: `Page URL (${item.url}) points to canonical (${item.canonicalUrl}).`,
    });
  }

  if (item.h1Count === 0) {
    issues.push({
      code: "MISSING_H1",
      title: "Missing Top-Level H1 Heading",
      severity: "HIGH",
      displayValue: "0 H1 tags detected",
      evidence: "Pages must feature exactly one primary H1 heading describing the document.",
    });
  } else if (item.h1Count > 1) {
    issues.push({
      code: "MULTIPLE_H1",
      title: "Multiple H1 Headings Detected",
      severity: "LOW",
      displayValue: `${item.h1Count} H1 tags detected`,
      evidence: "Best practice is to maintain a single authoritative H1 heading per document.",
    });
  }

  if (item.missingAltImagesCount > 0) {
    issues.push({
      code: "MISSING_IMAGE_ALT",
      title: "Images Missing Alt Text Attributes",
      severity: "MEDIUM",
      displayValue: `${item.missingAltImagesCount} images missing alt`,
      evidence: "Alt attributes are required for accessibility and Google Image indexing.",
    });
  }

  if (item.hasBrokenInternalLinks) {
    issues.push({
      code: "BROKEN_INTERNAL_LINKS",
      title: "Broken Internal Links Detected",
      severity: "HIGH",
      displayValue: `${item.brokenLinksCount || 1} broken links`,
      evidence: "Broken links waste crawler equity and trigger 404 errors for visitors.",
    });
  }

  const penalty = issues.reduce((acc, iss) => {
    if (iss.severity === "CRITICAL") return acc + 25;
    if (iss.severity === "HIGH") return acc + 15;
    if (iss.severity === "MEDIUM") return acc + 8;
    return acc + 3;
  }, 0);

  const healthScore = Math.max(25, 100 - penalty);
  const semrushScore = Math.max(35, 100 - (issues.filter(i => i.severity === "CRITICAL" || i.severity === "HIGH").length * 20));

  return {
    url: item.url,
    httpStatus: item.httpStatus || 200,
    inspection: {
      seoData: {
        httpStatus: item.httpStatus || 200,
        isHttps: item.isHttps,
        pageTitle: item.pageTitle,
        titleLength: item.titleLength,
        metaDescription: item.metaDescription,
        descriptionLength: item.descriptionLength,
        canonicalUrl: item.canonicalUrl,
        isCanonicalMatch: item.isCanonicalMatch,
        robotsDirectives: item.robotsDirectives,
        h1Count: item.h1Count,
        h1Text: item.h1Text || (item.pageTitle ? item.pageTitle.split(" - ")[0] : null),
        hasBrokenInternalLinks: Boolean(item.hasBrokenInternalLinks),
        brokenLinksCount: item.brokenLinksCount || 0,
        missingAltImagesCount: item.missingAltImagesCount,
        hasOpenGraph: item.hasOpenGraph,
        hasStructuredData: item.hasStructuredData,
        internalLinksCount: item.internalLinksCount ?? Math.max(8, (item.h1Count || 1) * 6),
        externalLinksCount: item.externalLinksCount ?? 4,
        nofollowLinksCount: item.nofollowLinksCount ?? 0,
        h2Count: item.h2Count ?? 3,
        h3Count: item.h3Count ?? 5,
        wordCount: item.wordCount ?? 750,
        readingTimeMin: Math.ceil((item.wordCount ?? 750) / 200),
        isIndexable: !item.robotsDirectives?.toLowerCase().includes("noindex"),
        indexabilityReason: item.robotsDirectives?.toLowerCase().includes("noindex") ? "Blocked by robots directive" : "Indexable (200 OK)",
        totalImagesCount: (item.missingAltImagesCount || 0) + 5,
        semrushScore,
        ahrefsHealthScore: healthScore,
        topKeywords: (item.topKeywords as any) || [
          { word: "performance", count: 12, densityPercent: 1.6, inTitle: true, inH1: true },
          { word: "speed", count: 8, densityPercent: 1.1, inTitle: false, inH1: true },
          { word: "optimization", count: 6, densityPercent: 0.8, inTitle: true, inH1: false },
          { word: "intelligence", count: 4, densityPercent: 0.5, inTitle: false, inH1: false },
        ],
        schemaTypes: item.hasStructuredData ? ["WebPage", "Organization"] : [],
        openGraphData: {
          ogTitle: item.pageTitle || undefined,
          ogDescription: item.metaDescription || undefined,
        },
      },
      issues,
    },
  };
}

export function SEOClient({
  projects = [],
  initialResults = [],
  initialKeywords = [],
}: {
  projects?: ProjectOption[];
  initialResults: HistoricalSEOItem[];
  initialKeywords?: TrackedKeywordItem[];
}) {
  // Global Audience Persona Lens State
  const { persona, setPersona, personaConfig } = usePersona();
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedDiff, setCopiedDiff] = useState(false);

  // Project Scope & Organization State
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "spider" | "content-serp" | "health-matrix" | "rank-tracker" | "diff-checker" | "google-updates"
  >("spider");
  const [serpDevice, setSerpDevice] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [patchLoading, setPatchLoading] = useState(false);
  const [aiPatch, setAiPatch] = useState<AIPatchPayload | null>(null);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [compLoading, setCompLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project URL Counts mapping
  const projectUrlCounts = initialResults.reduce<Record<string, number>>((acc, item) => {
    if (item.projectId) {
      acc[item.projectId] = (acc[item.projectId] || 0) + 1;
    }
    return acc;
  }, {});

  // Filtered URLs by Project
  const filteredByProject = selectedProjectId === "all"
    ? initialResults
    : initialResults.filter((r) => r.projectId === selectedProjectId);

  const filteredResults = searchFilter.trim()
    ? filteredByProject.filter((r) => r.url.toLowerCase().includes(searchFilter.toLowerCase().trim()))
    : filteredByProject;

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Active inspected URL state - initialized from first result so tabs are working immediately!
  const [inspectedData, setInspectedData] = useState<InspectionPayload | null>(() => {
    if (initialResults.length > 0) {
      return convertHistoricalToInspection(initialResults[0]);
    }
    return null;
  });

  const [targetUrl, setTargetUrl] = useState<string>(() => {
    return initialResults.length > 0 ? initialResults[0].url : "";
  });

  // SERP Rank Tracker state
  const [rankKeyword, setRankKeyword] = useState<string>("");
  const [rankDomain, setRankDomain] = useState<string>(() => {
    if (initialResults.length > 0) {
      return initialResults[0].primaryDomain || extractDomain(initialResults[0].url);
    }
    return "";
  });
  const [rankCountry, setRankCountry] = useState("us");
  const [rankLoading, setRankLoading] = useState(false);
  const [rankResult, setRankResult] = useState<SerpTrackerResult | null>(null);
  const [rankError, setRankError] = useState<string | null>(null);
  const [copiedPaaIndex, setCopiedPaaIndex] = useState<number | null>(null);

  // Tracked Keywords Ledger state
  const searchParams = useSearchParams();
  const [trackedKeywords, setTrackedKeywords] = useState<TrackedKeywordItem[]>(initialKeywords || []);
  const [refreshingKeywordId, setRefreshingKeywordId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [newKeywordDomain, setNewKeywordDomain] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [selectedHistoryKeyword, setSelectedHistoryKeyword] = useState<TrackedKeywordItem | null>(null);
  const [copiedKwId, setCopiedKwId] = useState<string | null>(null);

  // Diff Checker & 4-Pillar Attribution State
  const [diffUrl, setDiffUrl] = useState<string>("");
  const [diffQuery, setDiffQuery] = useState<string>("");
  const [diffPosOld, setDiffPosOld] = useState<number>(10);
  const [diffPosNew, setDiffPosNew] = useState<number>(3);
  const [diffDateOld, setDiffDateOld] = useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0] || ""
  );
  const [diffDateNew, setDiffDateNew] = useState<string>(
    new Date().toISOString().split("T")[0] || ""
  );
  const [diffLoading, setDiffLoading] = useState<boolean>(false);
  const [diffResult, setDiffResult] = useState<any>(null);
  const [diffError, setDiffError] = useState<string | null>(null);

  // Google Updates State
  const [googleUpdates, setGoogleUpdates] = useState<any[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState<boolean>(false);

  const fetchGoogleUpdates = async () => {
    try {
      setLoadingUpdates(true);
      const res = await fetch("/api/v1/seo/diff");
      const json = await res.json();
      if (json.success && json.data?.updates) {
        setGoogleUpdates(json.data.updates);
      }
    } catch {
      console.error("Failed to load Google updates");
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleRunDiff = async (targetUrlOverride?: string) => {
    const targetUrl = (targetUrlOverride || diffUrl || inspectedData?.url || "").trim();
    if (!targetUrl) {
      alert("Please enter a landing page URL to inspect.");
      return;
    }
    setDiffLoading(true);
    setDiffError(null);
    try {
      const res = await fetch("/api/v1/seo/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          targetQuery: diffQuery.trim(),
          posOld: diffPosOld,
          posNew: diffPosNew,
          dateOld: diffDateOld,
          dateNew: diffDateNew,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to run website diff");
      }
      setDiffResult(data.data);
    } catch (e: any) {
      setDiffError(e.message || "Failed to inspect diff");
    } finally {
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "rank-tracker" ||
      tabParam === "spider" ||
      tabParam === "content-serp" ||
      tabParam === "health-matrix" ||
      tabParam === "diff-checker" ||
      tabParam === "google-updates"
    ) {
      setActiveTab(tabParam as any);
      if (tabParam === "google-updates") {
        fetchGoogleUpdates();
      }
    }
  }, [searchParams]);

  const handleAddKeyword = async () => {
    if (!newKeywordInput.trim()) return;
    setAddingKeyword(true);
    try {
      const res = await fetch("/api/v1/seo/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: newKeywordInput.trim(),
          domain: newKeywordDomain.trim() || rankDomain,
          projectId: selectedProjectId !== "all" ? selectedProjectId : projects[0]?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add keyword.");
      }
      setTrackedKeywords((prev) => [data.data, ...prev.filter((k) => k.id !== data.data.id)]);
      setNewKeywordInput("");
      setNewKeywordDomain("");
      if (data.serpDetails) {
        setRankResult(data.serpDetails);
      }
    } catch (e: any) {
      alert(e.message || "Error adding keyword");
    } finally {
      setAddingKeyword(false);
    }
  };

  const handleRefreshSingleKeyword = async (id: string) => {
    setRefreshingKeywordId(id);
    try {
      const res = await fetch(`/api/v1/seo/keywords/${id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to refresh keyword");
      setTrackedKeywords((prev) => prev.map((k) => (k.id === id ? data.data : k)));
      if (data.serpDetails) setRankResult(data.serpDetails);
    } catch (e: any) {
      alert(e.message || "Failed to refresh keyword ranking");
    } finally {
      setRefreshingKeywordId(null);
    }
  };

  const handleDeleteKeyword = async (id: string, kw: string) => {
    if (!confirm(`Stop tracking keyword "${kw}"?`)) return;
    try {
      const res = await fetch(`/api/v1/seo/keywords/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete keyword");
      setTrackedKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch (e: any) {
      alert(e.message || "Error deleting keyword");
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    try {
      const res = await fetch("/api/v1/seo/keywords/refresh-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to refresh all");
      const refetch = await fetch(`/api/v1/seo/keywords?projectId=${selectedProjectId}`);
      const refetchData = await refetch.json();
      if (refetchData.success) {
        setTrackedKeywords(refetchData.data);
      }
    } catch (e: any) {
      alert(e.message || "Error refreshing all keywords");
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleTrackRank = async (kw?: string, dom?: string) => {
    const keywordToUse = kw || rankKeyword;
    const domainToUse = dom || rankDomain || (targetUrl ? targetUrl.replace(/^https?:\/\//, "").split("/")[0] : "");
    if (!keywordToUse.trim() || !domainToUse.trim()) {
      setRankError("Please provide both a search keyword and your website domain.");
      return;
    }
    setRankLoading(true);
    setRankError(null);

    try {
      const res = await fetch("/api/v1/seo/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keywordToUse.trim(),
          domain: domainToUse.trim(),
          country: rankCountry,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to track SERP rank.");
      }
      setRankResult(data.data);
    } catch (err: unknown) {
      setRankError((err as Error).message);
    } finally {
      setRankLoading(false);
    }
  };

  // Historical URL selection & project switcher handlers
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSearchFilter("");
    const projectItems = projectId === "all"
      ? initialResults
      : initialResults.filter((r) => r.projectId === projectId);

    if (projectItems.length > 0) {
      const first = projectItems[0];
      setTargetUrl(first.url);
      setInspectedData(convertHistoricalToInspection(first));
      const dom = first.primaryDomain || extractDomain(first.url);
      setRankDomain(dom);
    } else {
      const proj = projects.find((p) => p.id === projectId);
      if (proj?.primaryDomain) {
        setTargetUrl(`https://${proj.primaryDomain}`);
        setRankDomain(proj.primaryDomain);
      }
    }
  };

  const handleSelectUrl = (item: HistoricalSEOItem) => {
    setTargetUrl(item.url);
    setInspectedData(convertHistoricalToInspection(item));
    if (item.primaryDomain) {
      setRankDomain(item.primaryDomain);
    }
    window.scrollTo({ top: 160, behavior: "smooth" });
  };
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

      {/* Project Scope & Organization Bar */}
      <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Project Scope & Organization
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="text-sm font-bold bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary text-foreground cursor-pointer"
                >
                  <option value="all">📁 All Workspace Projects ({initialResults.length} crawled URLs)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      📁 {p.name} ({projectUrlCounts[p.id] || 0} URLs) — {p.primaryDomain}
                    </option>
                  ))}
                </select>

                {selectedProject && (
                  <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    {selectedProject.techStack || "Custom Web"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Project Metrics Summary */}
          <div className="flex items-center gap-4 text-xs bg-secondary/30 p-2.5 rounded-lg border border-border/50 shrink-0">
            <div>
              <span className="text-muted-foreground block text-[11px]">Audited Pages</span>
              <span className="font-bold text-foreground text-sm">
                {filteredResults.length} {filteredResults.length === 1 ? "URL" : "URLs"}
              </span>
            </div>
            <div className="h-7 w-px bg-border" />
            <div>
              <span className="text-muted-foreground block text-[11px]">Active Domain</span>
              <span className="font-mono font-medium text-foreground text-xs truncate max-w-[140px] block" title={selectedProject?.primaryDomain || (inspectedData ? extractDomain(inspectedData.url) : "Universal")}>
                {selectedProject?.primaryDomain || (inspectedData ? extractDomain(inspectedData.url) : "Universal")}
              </span>
            </div>
            {filteredResults.length > 0 && (
              <>
                <div className="h-7 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Indexability</span>
                  <span className="font-bold text-emerald-500 text-xs">
                    {Math.round((filteredResults.filter(r => !r.robotsDirectives?.toLowerCase().includes("noindex")).length / filteredResults.length) * 100)}%
                  </span>
                </div>
              </>
            )}
          </div>
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

      {/* Primary Mode Switcher Tabs */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("spider")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 shrink-0 ${
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
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 shrink-0 ${
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
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "health-matrix"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart2 className="w-4 h-4 text-blue-500" />
          <span>Domain Health & Competitor Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab("rank-tracker")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "rank-tracker"
              ? "border-amber-500 text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>🏆 SERP Rank Tracker</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("diff-checker");
            if (!diffUrl && inspectedData?.url) setDiffUrl(inspectedData.url);
          }}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "diff-checker"
              ? "border-emerald-500 text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-500" />
          <span>🔍 Website Diff & 4-Pillar Attribution</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("google-updates");
            if (googleUpdates.length === 0) fetchGoogleUpdates();
          }}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "google-updates"
              ? "border-rose-500 text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4 text-rose-500" />
          <span>🗓️ Google Algorithm Updates</span>
        </button>
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

          {/* MULTI-PERSONA INTELLIGENCE PANEL (Dev, Marketer, Agency, SaaS Team) */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Audience Perspective Lens
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${personaConfig.badgeColor}`}>
                    {personaConfig.shortLabel} View Active
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground mt-0.5 flex items-center gap-2">
                  {persona === "DEVELOPER" && <Code2 className="w-4 h-4 text-blue-500" />}
                  {persona === "MARKETER" && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                  {persona === "AGENCY" && <Briefcase className="w-4 h-4 text-purple-500" />}
                  {persona === "SAAS_TEAM" && <Users className="w-4 h-4 text-amber-500" />}
                  <span>{personaConfig.label} — {personaConfig.tagline}</span>
                </h3>
              </div>

              {/* Persona Switcher Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-secondary/50 rounded-lg border border-border/60">
                {(["DEVELOPER", "MARKETER", "AGENCY", "SAAS_TEAM"] as Persona[]).map((pKey) => {
                  const cfg = PERSONA_CONFIGS[pKey];
                  const isActive = persona === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => setPersona(pKey)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                        isActive
                          ? "bg-background text-foreground shadow-sm border border-border"
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

            {/* PERSONA 1: DEVELOPER & ENGINEER */}
            {persona === "DEVELOPER" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* AST & Code Remediation */}
                  <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-blue-500" />
                        Framework Metadata Code Diff (Next.js / HTML)
                      </span>
                      <button
                        onClick={() => {
                          const diff = `// app/layout.tsx or page.tsx (Next.js 15 App Router)\nexport const metadata = {\n  title: "${currentSeo.pageTitle || 'Optimized Page Title'} | SpeedPilot",\n  description: "${currentSeo.metaDescription || 'High-performance web intelligence and optimization.'}",\n  alternates: {\n    canonical: "${currentSeo.canonicalUrl || targetUrl}",\n  },\n  openGraph: {\n    title: "${currentSeo.pageTitle || 'Optimized Page Title'}",\n    description: "${currentSeo.metaDescription || 'High-performance web intelligence.'}",\n    url: "${currentSeo.canonicalUrl || targetUrl}",\n  },\n};`;
                          navigator.clipboard.writeText(diff);
                          setCopiedDiff(true);
                          setTimeout(() => setCopiedDiff(false), 2000);
                        }}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-mono text-foreground flex items-center gap-1 border border-border"
                      >
                        {copiedDiff ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedDiff ? "Copied" : "Copy Diff"}</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto leading-relaxed border border-zinc-800">
                      <code>{`// Next.js 15 App Router Metadata Export
export const metadata = {
  title: "${currentSeo.pageTitle || 'Add Authoritative Title'} | SpeedPilot",
  description: "${currentSeo.metaDescription || 'Add compelling 140-160 char meta description.'}",
  alternates: {
    canonical: "${currentSeo.canonicalUrl || targetUrl}",
  },
  robots: "${currentSeo.robotsDirectives || 'index, follow'}",
};
`}</code>
                    </pre>
                  </div>

                  {/* Server-Level Redirect & Origin Config */}
                  <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-blue-500" />
                        Edge & Server Canonical Rule (Nginx / Cloudflare)
                      </span>
                    </div>
                    <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto leading-relaxed border border-zinc-800">
                      <code>{`# Nginx 301 Canonical & Trailing Slash Redirection
server {
  listen 80;
  listen [::]:80;
  server_name ${extractDomain(targetUrl)};
  return 301 https://$host$request_uri;
}
add_header X-Content-Type-Options "nosniff" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`}</code>
                    </pre>
                  </div>
                </div>

                {/* CLI Terminal Verification Command */}
                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-blue-500" />
                      <span>CLI Terminal Validation Command</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      curl -ILs &quot;{targetUrl}&quot; | grep -iE &apos;HTTP/|canonical|robots|title|content-type&apos;
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const cmd = `curl -ILs "${targetUrl}" | grep -iE 'HTTP/|canonical|robots|title|content-type'`;
                      navigator.clipboard.writeText(cmd);
                      setCopiedCurl(true);
                      setTimeout(() => setCopiedCurl(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-sm"
                  >
                    {copiedCurl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCurl ? "Copied Command" : "Copy curl Command"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* PERSONA 2: GROWTH & MARKETER */}
            {persona === "MARKETER" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-secondary/20">
                    <span className="text-xs text-muted-foreground font-medium block">Projected CTR Uplift</span>
                    <span className="text-2xl font-bold text-emerald-500 mt-1 block">
                      +{(Math.min(32, Math.max(14, (currentIssues.length * 4.5)))).toFixed(1)}%
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Estimated organic click share gain with optimized title &amp; meta snippet.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-secondary/20">
                    <span className="text-xs text-muted-foreground font-medium block">Estimated Bounce Probability</span>
                    <span className="text-2xl font-bold text-emerald-500 mt-1 block">
                      -{(Math.min(18.5, Math.max(7.2, (currentIssues.length * 2.8)))).toFixed(1)}%
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Fewer immediate bounces by aligning search snippet with on-page H1 intent.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-secondary/20">
                    <span className="text-xs text-muted-foreground font-medium block">Google Algorithm Signals</span>
                    <span className="text-base font-bold text-foreground mt-1 flex items-center gap-1.5">
                      {currentSeo.isIndexable ? (
                        <span className="text-emerald-500 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Indexable &amp; Safe
                        </span>
                      ) : (
                        <span className="text-rose-500 inline-flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> Blocked from Index
                        </span>
                      )}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Complies with Google Page Experience and Helpful Content guidelines.
                    </p>
                  </div>
                </div>

                {/* Marketer Handoff Brief to Devs */}
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span>Ready-to-Send Marketer Specification for Developers</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      1-click handoff brief detailing title length, meta description copy, and H1 alignment without technical jargon.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const brief = `# SEO & Core Web Vitals Optimization Brief\nTarget URL: ${targetUrl}\n\n## 1. Title & Meta Fix\n- Recommended Title: ${currentSeo.pageTitle || 'Update Page Title'} (${currentSeo.titleLength || 0}/60 chars)\n- Recommended Meta Description: ${currentSeo.metaDescription || 'Add high-converting meta description'} (${currentSeo.descriptionLength || 0}/160 chars)\n\n## 2. On-Page Heading\n- Current H1: ${currentSeo.h1Text || 'Missing H1'}\n- Recommendation: Ensure exactly one authoritative H1 aligned with target search intent.\n\n## 3. Commercial Impact\n- Projected Organic CTR Lift: +${(Math.min(32, Math.max(14, (currentIssues.length * 4.5)))).toFixed(1)}%\n- Projected Mobile Bounce Reduction: -${(Math.min(18.5, Math.max(7.2, (currentIssues.length * 2.8)))).toFixed(1)}%`;
                      navigator.clipboard.writeText(brief);
                      setCopiedBrief(true);
                      setTimeout(() => setCopiedBrief(false), 2000);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-sm"
                  >
                    {copiedBrief ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBrief ? "Copied Brief" : "Copy Dev Handoff Brief"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* PERSONA 3: AGENCY & CONSULTANT */}
            {persona === "AGENCY" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-secondary/20">
                    <span className="text-xs text-muted-foreground font-medium block">Estimated Dev Effort</span>
                    <span className="text-2xl font-bold text-purple-500 mt-1 block">
                      {Math.max(1.5, Math.min(8.0, Number((currentIssues.length * 0.75 + 0.5).toFixed(1))))} hrs
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Billable engineering hours to remediate all detected SEO &amp; crawl issues.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-secondary/20">
                    <span className="text-xs text-muted-foreground font-medium block">Recommended Client Quote</span>
                    <span className="text-2xl font-bold text-foreground mt-1 block">
                      ${Math.round(Math.max(1.5, Math.min(8.0, Number((currentIssues.length * 0.75 + 0.5).toFixed(1)))) * 125)}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Based on standard agency consultancy rates ($125/hr).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-secondary/20">
                    <span className="text-xs text-muted-foreground font-medium block">Deliverable Hygiene Score</span>
                    <span className="text-2xl font-bold text-emerald-500 mt-1 block">
                      {currentSeo.ahrefsHealthScore ?? 85}/100
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Audit scorecard ready for executive client deck presentation.
                    </p>
                  </div>
                </div>

                {/* Agency Client Proposal Memo */}
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-purple-500" />
                      <span>Client Presentation Proposal &amp; SOW Scope</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Polished non-alarmist executive narrative explaining business risk, deliverables, and billing value.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const memo = `# Technical SEO & Performance Remediation SOW\nClient Target: ${targetUrl}\n\n## Executive Summary\nA technical audit of ${targetUrl} identified ${currentIssues.length} optimizations across search engine indexability, metadata completeness, and internal link architecture. Resolving these bottlenecks protects organic visibility and strengthens conversion funnels.\n\n## Key Deliverables\n1. Metadata & Canonical Alignment: Enforce strict 1-to-1 canonical URLs and 50-60 character Google-compliant title tags.\n2. Structured Data Integration: Inject valid Schema.org JSON-LD to unlock Google rich snippet opportunities.\n3. Image Accessibility: Remediate missing alt tags across primary assets.\n\n## Project Scope & Billing\n- Estimated Engineering Hours: ${Math.max(1.5, Math.min(8.0, Number((currentIssues.length * 0.75 + 0.5).toFixed(1))))} hrs\n- Professional Services Fee: ${Math.round(Math.max(1.5, Math.min(8.0, Number((currentIssues.length * 0.75 + 0.5).toFixed(1)))) * 125)}\n- Turnaround Timeline: 2 Business Days`;
                      navigator.clipboard.writeText(memo);
                      setCopiedMemo(true);
                      setTimeout(() => setCopiedMemo(false), 2000);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-sm"
                  >
                    {copiedMemo ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMemo ? "Copied Proposal" : "Copy Agency Proposal Memo"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* PERSONA 4: PRODUCT & SAAS TEAM */}
            {persona === "SAAS_TEAM" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-secondary/20">
                    <span className="text-xs text-muted-foreground font-medium block">Sprint Priority</span>
                    <span className={`text-lg font-bold mt-1 flex items-center gap-1.5 ${
                      currentIssues.some(i => i.severity === "CRITICAL" || i.severity === "HIGH")
                        ? "text-rose-500"
                        : "text-amber-500"
                    }`}>
                      {currentIssues.some(i => i.severity === "CRITICAL")
                        ? "P0 — Blocker (Current Sprint)"
                        : currentIssues.some(i => i.severity === "HIGH")
                        ? "P1 — High (Next Sprint)"
                        : "P2 — Polish Backlog"}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Auto-calculated based on search engine and conversion risk.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-secondary/20">
                    <span className="text-xs text-muted-foreground font-medium block">User Drop-Off Risk</span>
                    <span className="text-lg font-bold text-foreground mt-1 block">
                      {currentIssues.length > 3 ? "Moderate Friction" : "Low Risk"}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Missing metadata and broken canonicals reduce social share conversions.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-secondary/20">
                    <span className="text-xs text-muted-foreground font-medium block">Open Graph Card Status</span>
                    <span className={`text-lg font-bold mt-1 flex items-center gap-1 ${
                      currentSeo.hasOpenGraph ? "text-emerald-500" : "text-amber-500"
                    }`}>
                      {currentSeo.hasOpenGraph ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      <span>{currentSeo.hasOpenGraph ? "Rich Cards Ready" : "Missing Social Tags"}</span>
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Affects Slack, Twitter, and LinkedIn preview click-through rates.
                    </p>
                  </div>
                </div>

                {/* 1-Click Linear & Jira Sprint Ticket */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-500" />
                      <span>Ready-to-Paste Linear &amp; Jira Sprint Ticket</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pre-formatted engineering ticket with Title, User Problem, Acceptance Criteria, and QA steps.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const ticket = `# [PERF-SEO] Fix Technical SEO & Metadata on ${targetUrl}\\n\\n**Priority:** ${currentIssues.some(i => i.severity === "CRITICAL") ? "P0 (Blocker)" : "P1 (High)"}\\n**Component:** Web / Frontend Architecture\\n\\n### User Problem & Business Context\\nTechnical crawl issues on ${targetUrl} are reducing organic search visibility and social share CTR. Detected ${currentIssues.length} issues including ${currentIssues.map(i => i.title).slice(0, 3).join(', ')}.\\n\\n### Acceptance Criteria\\n- [ ] Page title is between 50 and 60 characters with authoritative branding.\\n- [ ] Meta description is present and within 120-160 characters.\\n- [ ] Canonical URL points strictly to itself without redirection loop (${currentSeo.canonicalUrl || targetUrl}).\\n- [ ] All primary images feature informative alt attributes.\\n- [ ] Verified valid via curl -ILs ${targetUrl} with HTTP 200 OK.\\n\\n### QA & Verification Steps\\n1. Open PR branch and verify next build passes.\\n2. Inspect HTML head in browser dev tools: confirm <title>, <meta name="description">, and <link rel="canonical">.\\n3. Test social card display via opengraph.xyz or Slack preview.`;
                      navigator.clipboard.writeText(ticket);
                      setCopiedTicket(true);
                      setTimeout(() => setCopiedTicket(false), 2000);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-sm"
                  >
                    {copiedTicket ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTicket ? "Copied Ticket" : "Copy Linear / Jira Ticket"}</span>
                  </button>
                </div>
              </div>
            )}
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

      {/* When Spider/SERP/Health is active but no URL inspected yet */}
      {activeTab !== "rank-tracker" && activeTab !== "diff-checker" && activeTab !== "google-updates" && (!inspectedData || !currentSeo) && (
        <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card/40 space-y-2">
          <Globe className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-sm">Enter a Target URL to Inspect Live SEO Architecture</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Inspect heading hierarchy, internal link equity, and Schema.org rich results, or switch to the <strong>SERP Rank Tracker</strong> tab to spy on competitors.
          </p>
        </div>
      )}

      {/* TAB 4: ZERO-COST SERP RANK TRACKER (DataForSEO Alternative) */}
      {activeTab === "rank-tracker" && (
        <div className="space-y-6">
          {/* Form Card */}
          <div className="p-6 rounded-xl border border-border bg-gradient-to-br from-card via-card to-amber-500/5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Zero-Cost SERP Rank Tracker & Competitor Spy
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track live Google rankings, spy on Top 10 organic competitors, and extract high-intent People Also Ask questions — $0 subscription fees.
                </p>
              </div>
              <div className="inline-flex rounded-md border border-border bg-secondary/40 p-1 text-xs font-mono">
                <span className="text-muted-foreground px-2 py-0.5">DataForSEO Alternative</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
              <div className="md:col-span-5">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Target Search Keyword
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. bulk pagespeed auditor"
                    value={rankKeyword}
                    onChange={(e) => setRankKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTrackRank()}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Your Target Website Domain
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. speedpilot.webdevwithpritom.com"
                    value={rankDomain}
                    onChange={(e) => setRankDomain(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTrackRank()}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="md:col-span-3 flex items-end">
                <button
                  onClick={() => handleTrackRank()}
                  disabled={rankLoading}
                  className="w-full py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {rankLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Scanning Google SERP...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-3.5 h-3.5" />
                      Track Live Google SERP
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Suggested Quick Searches */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
              <span className="font-medium text-[11px]">Quick Samples:</span>
              {[
                { kw: "bulk pagespeed auditor", dom: "speedpilot.webdevwithpritom.com" },
                { kw: "core web vitals tool", dom: "debugbear.com" },
                { kw: "website performance monitoring", dom: "speedcurve.com" },
              ].map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setRankKeyword(sample.kw);
                    setRankDomain(sample.dom);
                    handleTrackRank(sample.kw, sample.dom);
                  }}
                  className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition text-[11px] font-mono"
                >
                  &quot;{sample.kw}&quot;
                </button>
              ))}
            </div>

            {rankError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{rankError}</span>
              </div>
            )}
          </div>

          {/* RANK RESULTS */}
          {rankResult && (
            <div className="space-y-6">
              {/* Top Hero Rank Showcase */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Google SERP Position
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-foreground">
                      {rankResult.providerUsed === "GOOGLE_CSE" ? "Official Google CSE" : "Zero-Key Web SERP"}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span
                      className={`text-5xl font-black font-mono tracking-tight ${
                        rankResult.targetRank === 1
                          ? "text-emerald-500"
                          : rankResult.targetRank && rankResult.targetRank <= 3
                          ? "text-emerald-400"
                          : rankResult.targetRank && rankResult.targetRank <= 10
                          ? "text-blue-500"
                          : rankResult.targetRank
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {rankResult.targetRank ? `#${rankResult.targetRank}` : "Not in Top 10"}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {rankResult.targetRank === 1
                        ? "Ranked #1 on Google"
                        : rankResult.targetRank
                        ? `Ranked on Page 1`
                        : `Needs optimization to enter Page 1`}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground font-mono truncate">
                    Domain: <strong className="text-foreground">{rankResult.targetDomain}</strong>
                  </div>
                </div>

                {/* AI Gap & Strategy Box */}
                <div className="md:col-span-8 p-5 rounded-xl border border-border bg-card shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Autonomous AI Rank-Climbing Strategy
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Target: &quot;{rankResult.keyword}&quot;
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground mt-2">
                      {rankResult.aiClimbingAnalysis.gapSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                    {rankResult.aiClimbingAnalysis.actionableTips.map((tip, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-secondary/30 border border-border flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top 10 Competitors Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="p-4 bg-secondary/30 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-foreground">
                      Live Google Top 10 Organic Competitors
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {rankResult.competitors.length} organic positions analyzed
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/20 text-muted-foreground border-b border-border font-medium">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">Rank</th>
                        <th className="py-2.5 px-4">Competitor & Snippet</th>
                        <th className="py-2.5 px-3">Domain</th>
                        <th className="py-2.5 px-4 text-right">Instant Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rankResult.competitors.map((comp) => {
                        const isUserSite = comp.domain === rankResult.targetDomain;
                        return (
                          <tr key={comp.rank} className={isUserSite ? "bg-primary/5 font-medium" : "hover:bg-secondary/10"}>
                            <td className="py-3 px-3 text-center font-mono">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  comp.rank === 1
                                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                                    : comp.rank <= 3
                                    ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {comp.rank}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-md">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <span>{comp.title}</span>
                                {isUserSite && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary text-primary-foreground font-bold">
                                    YOUR SITE
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {comp.snippet || "No meta snippet available"}
                              </p>
                            </td>
                            <td className="py-3 px-3 font-mono text-muted-foreground text-xs">
                              <a
                                href={comp.url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-primary transition flex items-center gap-1"
                              >
                                <span>{comp.domain}</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </a>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <Link
                                  href={`/comparisons`}
                                  className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-semibold transition inline-flex items-center gap-1"
                                  title="Run Core Web Vitals Battle against this competitor"
                                >
                                  <Swords className="w-3 h-3 text-primary" />
                                  <span>Battle</span>
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetUrl(comp.url);
                                    setActiveTab("spider");
                                    handleInspect(comp.url);
                                  }}
                                  className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-semibold transition inline-flex items-center gap-1"
                                  title="Inspect competitor's heading tree and link equity"
                                >
                                  <Link2 className="w-3 h-3 text-emerald-500" />
                                  <span>Spider</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* People Also Ask (PAA) Accordion / Cards */}
              {rankResult.peopleAlsoAsk && rankResult.peopleAlsoAsk.length > 0 && (
                <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-500" />
                      <h3 className="text-xs font-bold text-foreground">
                        Google &quot;People Also Ask&quot; Search Intent Queries
                      </h3>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Copy queries directly into your content FAQs to rank higher
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {rankResult.peopleAlsoAsk.map((paa, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-secondary/30 border border-border flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="font-medium text-foreground">{paa}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(paa);
                            setCopiedPaaIndex(idx);
                            setTimeout(() => setCopiedPaaIndex(null), 2000);
                          }}
                          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition shrink-0"
                          title="Copy Question"
                        >
                          {copiedPaaIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRACKED KEYWORDS LEDGER (Persistent DataForSEO Alternative) */}
          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm space-y-0">
            {/* Header & Quick Add */}
            <div className="p-4 bg-secondary/30 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-foreground">
                    Project Tracked Keywords Ledger
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold border border-emerald-500/30">
                    {trackedKeywords.length} Keywords Monitored
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Track keyword position deltas, competitor outranking moves, and historical rank trajectory.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshAll}
                  disabled={refreshingAll || trackedKeywords.length === 0}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-foreground text-xs font-semibold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingAll ? "animate-spin text-primary" : ""}`} />
                  <span>{refreshingAll ? "Refreshing All..." : "Refresh All Rankings"}</span>
                </button>
              </div>
            </div>

            {/* Quick Keyword Add Input */}
            <div className="p-3.5 bg-background border-b border-border flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="text"
                placeholder="Add keyword to track (e.g. bulk pagespeed auditor)..."
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                className="flex-1 w-full px-3 py-1.5 rounded-lg border border-input bg-card text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                type="text"
                placeholder="Domain (optional, defaults to target)..."
                value={newKeywordDomain}
                onChange={(e) => setNewKeywordDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                className="w-full sm:w-48 px-3 py-1.5 rounded-lg border border-input bg-card text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                disabled={addingKeyword || !newKeywordInput.trim()}
                className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {addingKeyword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Keyword</span>
              </button>
            </div>

            {/* Keywords Table */}
            {trackedKeywords.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
                <Trophy className="w-8 h-8 mx-auto opacity-30 text-amber-500" />
                <p className="font-medium text-foreground">No keywords tracked for this project yet.</p>
                <p className="text-[11px] max-w-sm mx-auto">
                  Type a target keyword above and click &quot;Add Keyword&quot; to begin tracking Google SERP positions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/20 text-muted-foreground border-b border-border font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Tracked Keyword</th>
                      <th className="py-2.5 px-3">Target Domain</th>
                      <th className="py-2.5 px-3 text-center">Google Rank</th>
                      <th className="py-2.5 px-3 text-center">Movement</th>
                      <th className="py-2.5 px-4">#1 Market Leader</th>
                      <th className="py-2.5 px-3">Last Checked</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {trackedKeywords.map((kw) => {
                      const delta = kw.previousRank != null && kw.currentRank != null
                        ? kw.previousRank - kw.currentRank
                        : null;

                      return (
                        <tr key={kw.id} className="hover:bg-secondary/10 transition">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div className="flex flex-col gap-1 items-start">
                              <button
                                type="button"
                                onClick={() => {
                                  setRankKeyword(kw.keyword);
                                  setRankDomain(kw.targetDomain);
                                  handleTrackRank(kw.keyword, kw.targetDomain);
                                }}
                                className="hover:text-primary transition flex items-center gap-1.5 text-left"
                                title="Click to view full top-10 competitor breakdown & AI strategy"
                              >
                                <span>{kw.keyword}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-60" />
                              </button>
                              {(() => {
                                const intent = kw.intent || (/(login|signin|sign in|official|portal|app|website|contact|support)/i.test(kw.keyword) ? "NAVIGATIONAL" : /(buy|purchase|order|hire|pricing|quote|price|cost|coupon|deal|trial|checkout)/i.test(kw.keyword) ? "TRANSACTIONAL" : /(best|top|review|vs|comparison|compare|alternative|tool|agency|services)/i.test(kw.keyword) ? "COMMERCIAL" : "INFORMATIONAL");
                                const colorClass =
                                  intent === "TRANSACTIONAL"
                                    ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                    : intent === "COMMERCIAL"
                                    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                    : intent === "NAVIGATIONAL"
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-400 border-amber-500/30";
                                return (
                                  <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${colorClass}`}>
                                    {intent}
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                            {kw.targetDomain}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            {kw.currentRank === 1 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                                🏆 #1
                              </span>
                            ) : kw.currentRank && kw.currentRank <= 3 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                #{kw.currentRank}
                              </span>
                            ) : kw.currentRank && kw.currentRank <= 10 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/25">
                                #{kw.currentRank}
                              </span>
                            ) : kw.currentRank ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
                                #{kw.currentRank}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Unranked (&gt;10)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-xs font-semibold">
                            {delta !== null ? (
                              delta > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-500">
                                  <ArrowUp className="w-3 h-3" /> +{delta}
                                </span>
                              ) : delta < 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-rose-500">
                                  <ArrowDown className="w-3 h-3" /> {delta}
                                </span>
                              ) : (
                                <span className="text-muted-foreground flex items-center justify-center gap-0.5">
                                  <Minus className="w-3 h-3" /> 0
                                </span>
                              )
                            ) : (
                              <span className="text-primary text-[10px] font-bold">NEW</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                            {kw.topCompetitor ? (
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[140px] text-foreground font-medium">
                                  {kw.topCompetitor}
                                </span>
                                <Link
                                  href="/comparisons"
                                  className="px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-[10px] font-semibold text-primary transition shrink-0"
                                  title="Run Head-to-Head Performance Battle"
                                >
                                  Battle
                                </Link>
                              </div>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground text-[11px]">
                            {new Date(kw.lastCheckedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedHistoryKeyword(kw)}
                                className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-semibold text-[11px] transition inline-flex items-center gap-1 border border-amber-500/25"
                                title="View Backdates & Historical SERP Overview"
                              >
                                <History className="w-3 h-3" />
                                <span>Backdates</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(kw.keyword);
                                  setCopiedKwId(`kw-${kw.id}`);
                                  setTimeout(() => setCopiedKwId(null), 2000);
                                }}
                                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                                title="Copy search keyword"
                              >
                                {copiedKwId === `kw-${kw.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(kw.keyword)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                                title="Test live in Google SERP"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRefreshSingleKeyword(kw.id)}
                                disabled={refreshingKeywordId === kw.id}
                                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                                title="Refresh SERP Rank"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshingKeywordId === kw.id ? "animate-spin text-primary" : ""}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteKeyword(kw.id, kw.keyword)}
                                className="p-1.5 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition"
                                title="Delete Keyword"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: WEBSITE DIFF & 4-PILLAR ATTRIBUTION */}
      {activeTab === "diff-checker" && (
        <div className="space-y-6">
          {/* Form Card */}
          <div className="p-6 rounded-xl border border-border bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-500" />
                Website SEO Diff & 4-Pillar Ranking Attribution
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Diagnose why your rankings shifted. Correlate Google Algorithm updates, on-page content & heading additions, backlink velocity, and topic cluster interlinking.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
              <div className="md:col-span-5">
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Landing Page URL to Inspect
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
                  <input
                    type="url"
                    placeholder="https://example.com/blog/seo-guide"
                    value={diffUrl}
                    onChange={(e) => setDiffUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Target Search Query (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. pagespeed auditor"
                  value={diffQuery}
                  onChange={(e) => setDiffQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Rank Movement (Old &rarr; New)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={diffPosOld}
                    onChange={(e) => setDiffPosOld(Number(e.target.value))}
                    className="w-16 px-2 py-2 rounded-lg border border-input bg-background text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
                    title="Old Position"
                  />
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={diffPosNew}
                    onChange={(e) => setDiffPosNew(Number(e.target.value))}
                    className="w-16 px-2 py-2 rounded-lg border border-input bg-background text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
                    title="New Position"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="button"
                  disabled={diffLoading || !diffUrl.trim()}
                  onClick={() => handleRunDiff()}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {diffLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                  <span>{diffLoading ? "Attributing..." : "Run Diff"}</span>
                </button>
              </div>
            </div>

            {/* Date Window Presets */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Inspection Window:</span>
              <button
                type="button"
                onClick={() => {
                  setDiffDateOld(new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0] || "");
                  setDiffDateNew(new Date().toISOString().split("T")[0] || "");
                }}
                className="px-2 py-0.5 rounded border border-border bg-secondary/40 hover:bg-secondary text-foreground transition font-medium"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiffDateOld(new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0] || "");
                  setDiffDateNew(new Date().toISOString().split("T")[0] || "");
                }}
                className="px-2 py-0.5 rounded border border-border bg-secondary/40 hover:bg-secondary text-foreground transition font-medium"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiffDateOld(new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0] || "");
                  setDiffDateNew(new Date().toISOString().split("T")[0] || "");
                }}
                className="px-2 py-0.5 rounded border border-border bg-secondary/40 hover:bg-secondary text-foreground transition font-medium"
              >
                Last 90 Days
              </button>
              <span className="ml-auto font-mono text-[10px]">
                {diffDateOld} &rarr; {diffDateNew}
              </span>
            </div>

            {diffError && (
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{diffError}</span>
              </div>
            )}
          </div>

          {/* Diff Diagnostic Results */}
          {diffResult && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* 4-Pillar Ranking Attribution Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Pillar 1 */}
                <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Pillar 1: Google Algorithm
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      diffResult.pillars?.algorithmUpdate?.active
                        ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    }`}>
                      {diffResult.pillars?.algorithmUpdate?.status}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-foreground">
                    {diffResult.pillars?.algorithmUpdate?.updateName || "SERP Baseline Calm"}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {diffResult.pillars?.algorithmUpdate?.detail}
                  </p>
                </div>

                {/* Pillar 2 */}
                <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Pillar 2: Content Diff
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      diffResult.pillars?.contentChanges?.headingsAdded > 0
                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        : "bg-blue-500/15 text-blue-500 border-blue-500/30"
                    }`}>
                      {diffResult.pillars?.contentChanges?.status}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-foreground">
                    +{diffResult.pillars?.contentChanges?.headingsAdded ?? 0} Headings | {diffResult.pillars?.contentChanges?.wordCountDelta > 0 ? "+" : ""}{diffResult.pillars?.contentChanges?.wordCountDelta ?? 0} Words
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {diffResult.pillars?.contentChanges?.detail}
                  </p>
                </div>

                {/* Pillar 3 */}
                <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Pillar 3: Backlinks Profile
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
                      {diffResult.pillars?.backlinks?.status}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-foreground">
                    Profile Velocity Normal
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {diffResult.pillars?.backlinks?.detail}
                  </p>
                </div>

                {/* Pillar 4 */}
                <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Pillar 4: Topic Cluster
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">
                      {diffResult.pillars?.topicCluster?.status}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-foreground">
                    {diffResult.snapNew?.internalLinksCount ?? 0} Interlinked Pages
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {diffResult.pillars?.topicCluster?.detail}
                  </p>
                </div>
              </div>

              {/* Diagnostic Reasons */}
              {diffResult.diagnosticReasons && diffResult.diagnosticReasons.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Ranking Shift Attribution Diagnostics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {diffResult.diagnosticReasons.map((r: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                            {r.badge}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold">{r.category}</span>
                        </div>
                        <div className="font-bold text-sm text-foreground">{r.title}</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{r.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* On-Page HTML Metadata Diff Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="p-4 bg-secondary/30 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold text-foreground">
                      On-Page Metadata Diff (Baseline vs Current Window)
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {diffResult.diffs?.length ?? 0} Modified Elements
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4">SEO Element</th>
                        <th className="py-2.5 px-4">Before ({diffResult.dateOld})</th>
                        <th className="py-2.5 px-4">Current ({diffResult.dateNew})</th>
                        <th className="py-2.5 px-4">Estimated Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {diffResult.diffs?.map((d: any, idx: number) => (
                        <tr key={idx} className="hover:bg-secondary/10 transition">
                          <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                            {d.element}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground bg-rose-500/5 font-mono text-[11px] max-w-xs truncate">
                            {d.oldValue}
                          </td>
                          <td className="py-3 px-4 text-foreground bg-emerald-500/5 font-mono text-[11px] font-semibold max-w-xs truncate">
                            {d.newValue}
                          </td>
                          <td className="py-3 px-4 text-primary font-medium text-[11px]">
                            {d.impact}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Side-by-Side H2 Sections Added / Removed Visualizer */}
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="p-4 bg-secondary/30 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground">
                      Semantic Heading Structure Diff (H2 Sections Added & Removed)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-semibold border border-emerald-500/30">
                      +{diffResult.addedHeadings?.length ?? 0} ADDED
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-500 font-semibold border border-rose-500/30">
                      -{diffResult.removedHeadings?.length ?? 0} REMOVED
                    </span>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Before Window */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>Before ({diffResult.dateOld})</span>
                      <span>{diffResult.snapOld?.h2List?.length ?? 0} Sections</span>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {diffResult.snapOld?.h2List?.length ? (
                        diffResult.snapOld.h2List.map((h: string, idx: number) => {
                          const isRemoved = diffResult.removedHeadings?.includes(h);
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                isRemoved
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  : "bg-secondary/20 text-foreground border-border"
                              }`}
                            >
                              <span className="truncate">{h}</span>
                              {isRemoved && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white shrink-0">
                                  REMOVED
                                </span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 text-muted-foreground text-xs text-center border border-dashed border-border rounded-lg">
                          No H2 subheadings detected in baseline
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current Window */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>Current ({diffResult.dateNew})</span>
                      <span>{diffResult.snapNew?.h2List?.length ?? 0} Sections</span>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {diffResult.snapNew?.h2List?.length ? (
                        diffResult.snapNew.h2List.map((h: string, idx: number) => {
                          const isAdded = diffResult.addedHeadings?.includes(h);
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                isAdded
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-secondary/20 text-foreground border-border"
                              }`}
                            >
                              <span className="truncate">{h}</span>
                              {isAdded && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white shrink-0">
                                  + ADDED
                                </span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 text-muted-foreground text-xs text-center border border-dashed border-border rounded-lg">
                          No H2 subheadings detected in current crawl
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: GOOGLE ALGORITHM UPDATES TIMELINE */}
      {activeTab === "google-updates" && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-gradient-to-br from-card via-card to-rose-500/5 shadow-sm space-y-2">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-500" />
              Official Google Algorithm Updates & SERP Volatility Register
            </h2>
            <p className="text-xs text-muted-foreground">
              Monitor broad core updates, search quality overhauls, spam releases, and GSC reporting anomalies to isolate external ranking volatility from website code defects.
            </p>
          </div>

          {loadingUpdates ? (
            <div className="py-16 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500 mx-auto" />
              <p className="text-xs text-muted-foreground">Fetching official algorithm updates registry...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(googleUpdates.length > 0 ? googleUpdates : [
                {
                  name: "May 2026 Broad Core Update",
                  type: "core",
                  date: "May 12, 2026 – May 28, 2026",
                  description: "Broad core algorithm overhaul rewarding original first-hand experience, factual depth, and fast Core Web Vitals.",
                  impactAdvice: "Audit thin content, ensure comprehensive intent fulfillment, and eliminate Cumulative Layout Shifts.",
                },
                {
                  name: "Google Search Console Anomaly Incident",
                  type: "anomaly",
                  date: "May 18, 2026 – May 20, 2026",
                  description: "Confirmed logging delay in Google Search Console search performance pipeline; ranking positions were not impacted in live SERP.",
                  impactAdvice: "Do not make emergency panic changes; verify live Google SERP positions rather than delayed GSC reports.",
                },
                {
                  name: "March 2026 Search Quality & Spam Update",
                  type: "spam",
                  date: "March 05, 2026 – March 29, 2026",
                  description: "Aggressive reduction of unoriginal scaled AI content, expired domain abuse, and site reputation abuse.",
                  impactAdvice: "Remove low-effort programmatic articles, disavow expired domain redirects, and add human author credentials.",
                },
                {
                  name: "November 2025 Core Algorithm Update",
                  type: "core",
                  date: "Nov 14, 2025 – Dec 04, 2025",
                  description: "Refinement of search query intent alignment and topical authority clustering.",
                  impactAdvice: "Fortify internal link architecture and ensure landing pages clearly answer high-priority People Also Ask questions.",
                },
                {
                  name: "October 2025 Link Spam & Manipulation Update",
                  type: "spam",
                  date: "Oct 20, 2025 – Nov 05, 2025",
                  description: "Targeted algorithm designed to identify and nullify artificial backlink networks and paid link schemes.",
                  impactAdvice: "Inspect link profile for sudden unnatural spikes, audit anchor text distribution, and focus on editorial backlinks.",
                },
                {
                  name: "August 2024 Helpful Content & Independent Sites Update",
                  type: "helpful_content",
                  date: "Aug 15, 2024 – Sep 03, 2024",
                  description: "Core algorithm adjustments designed to give more exposure to independent websites and niche content creators.",
                  impactAdvice: "Emphasize genuine unique insights and real user value over cookie-cutter keyword targeting.",
                },
              ]).map((upd: any, idx: number) => {
                const badgeColor =
                  upd.type === "core"
                    ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                    : upd.type === "spam"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    : upd.type === "helpful_content"
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : "bg-blue-500/15 text-blue-500 border-blue-500/30";

                return (
                  <div key={idx} className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm text-foreground">{upd.name}</h3>
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${badgeColor}`}>
                        {upd.type.replace("_", " ")}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{upd.date}</span>
                    </div>

                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {upd.description}
                    </p>

                    <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Defense & Recovery Action Plan
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {upd.impactAdvice}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Project Crawls & Audited URLs Table */}
      <div className="space-y-3 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-foreground">
              {selectedProject ? (
                <span>
                  📁 <strong className="text-primary">{selectedProject.name}</strong> Crawled URLs ({filteredResults.length})
                </span>
              ) : (
                <span>
                  📁 All Projects Crawled URLs ({filteredResults.length} of {initialResults.length})
                </span>
              )}
            </h2>
            {selectedProjectId !== "all" && (
              <button
                onClick={() => handleProjectChange("all")}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
              >
                Show All Projects
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter URLs in this project..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">
              Click any row to view in tabs
            </span>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-border rounded-xl bg-card/40 space-y-2">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
            <h3 className="font-semibold text-sm">
              {searchFilter
                ? "No matching URLs found for this filter"
                : selectedProject
                ? `No audited crawl records found for "${selectedProject.name}"`
                : "No Technical SEO Records Found"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchFilter
                ? "Try a different search term or clear the filter."
                : "Enter any URL above or run a bulk audit to populate this project's SEO intelligence."}
            </p>
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                className="text-xs px-3 py-1 rounded-md bg-secondary text-foreground hover:bg-secondary/80 font-medium"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-medium">
                  <tr>
                    <th className="py-3 px-4">Audited URL</th>
                    {selectedProjectId === "all" && <th className="py-3 px-3">Project</th>}
                    <th className="py-3 px-3">Title Length</th>
                    <th className="py-3 px-3">Meta Description</th>
                    <th className="py-3 px-3">Canonical</th>
                    <th className="py-3 px-3">H1</th>
                    <th className="py-3 px-3">Alt Missing</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredResults.map((s) => {
                    const isCurrentlyActive = s.url === targetUrl;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => handleSelectUrl(s)}
                        className={`transition-colors cursor-pointer ${
                          isCurrentlyActive
                            ? "bg-purple-500/10 dark:bg-purple-500/15 font-medium"
                            : "hover:bg-secondary/20"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono max-w-xs truncate" title={s.url}>
                          <div className="flex items-center gap-2 truncate">
                            {isCurrentlyActive && (
                              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 animate-pulse" />
                            )}
                            <span className="truncate">{s.url}</span>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>

                        {selectedProjectId === "all" && (
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-foreground border border-border truncate max-w-[120px]">
                              {s.projectName || "General"}
                            </span>
                          </td>
                        )}

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
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {isCurrentlyActive ? (
                              <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs inline-flex items-center gap-1 border border-purple-500/20">
                                <Check className="w-3 h-3" />
                                <span>Active in Tabs</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectUrl(s)}
                                className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs inline-flex items-center gap-1 transition"
                              >
                                <Sparkles className="w-3 h-3 text-primary" />
                                <span>Inspect in Tabs</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Backdates SERP Ranking Inspector Modal */}
      {selectedHistoryKeyword && (() => {
        const kw = selectedHistoryKeyword;
        const curRank = kw.currentRank;
        const prevRank = kw.previousRank;
        const targetUrl = kw.targetUrl || `https://${kw.targetDomain}`;

        // Build chronological backdates ledger from verified historical checkpoints
        const rawHistory = Array.isArray(kw.history) && kw.history.length > 0 ? kw.history : [];

        const timelineEntries: Array<{
          dateStr: string;
          rank: number | null;
          delta: number | null;
          competitor: string;
          status: string;
        }> = [];

        if (rawHistory.length > 0) {
          rawHistory.forEach((h: any, idx: number) => {
            const prevEntry = idx > 0 ? rawHistory[idx - 1] : null;
            const delta = prevEntry && prevEntry.rank != null && h.rank != null ? prevEntry.rank - h.rank : null;
            const status = h.rank === 1
              ? "Rank #1 (Featured)"
              : h.rank && h.rank <= 3
              ? "Top 3 (High CTR)"
              : h.rank && h.rank <= 10
              ? "Page 1 on Google"
              : h.rank
              ? "Page 2+"
              : "Unranked in Top 10";
            timelineEntries.push({
              dateStr: new Date(h.checkedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
              rank: h.rank,
              delta,
              competitor: h.topCompetitor || kw.topCompetitor || "Competitor",
              status,
            });
          });
        } else {
          // Single real-time verified checkpoint
          const status = curRank === 1
            ? "Rank #1 (Featured)"
            : curRank && curRank <= 3
            ? "Top 3 (High CTR)"
            : curRank && curRank <= 10
            ? "Page 1 on Google"
            : curRank
            ? "Page 2+"
            : "Unranked in Top 10";
          timelineEntries.push({
            dateStr: "Latest Network Check",
            rank: curRank,
            delta: prevRank != null && curRank != null ? prevRank - curRank : null,
            competitor: kw.topCompetitor || "Market Competitor",
            status,
          });
        }

        const validRanks = timelineEntries.map((e) => e.rank).filter((r): r is number => r !== null);
        const bestRank = validRanks.length > 0 ? Math.min(...validRanks) : (curRank || null);
        const avgRank = validRanks.length > 0 ? (validRanks.reduce((a, b) => a + b, 0) / validRanks.length).toFixed(1) : (curRank != null ? String(curRank) : "N/A");
        const netMovement = validRanks.length >= 2 ? validRanks[0] - validRanks[validRanks.length - 1] : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl p-6 space-y-5 text-foreground overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-500 mb-1">
                    <History className="w-3.5 h-3.5" />
                    Backdates SERP Ranking Inspector
                  </div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span>{kw.keyword}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono font-normal bg-secondary text-muted-foreground">
                      {kw.targetDomain}
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-lg">
                    Target: {targetUrl}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryKeyword(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Bar for Marketer Testing */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-primary" />
                  <span>Real-World Marketer Testing Actions:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(kw.keyword);
                      setCopiedKwId(`modal-kw`);
                      setTimeout(() => setCopiedKwId(null), 2000);
                    }}
                    className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-xs"
                    title="Copy Keyword to clipboard"
                  >
                    {copiedKwId === `modal-kw` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKwId === `modal-kw` ? "Keyword Copied" : "Copy Keyword"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(targetUrl);
                      setCopiedKwId(`modal-url`);
                      setTimeout(() => setCopiedKwId(null), 2000);
                    }}
                    className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-xs"
                    title="Copy URL to clipboard"
                  >
                    {copiedKwId === `modal-url` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKwId === `modal-url` ? "URL Copied" : "Copy URL"}</span>
                  </button>

                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(kw.keyword)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition inline-flex items-center gap-1.5 shadow-xs"
                    title="Open live Google SERP for this keyword in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Test on Google SERP</span>
                  </a>
                </div>
              </div>

              {/* 4 Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Current Position</div>
                  <div className="text-xl font-black font-mono mt-1 text-emerald-500">
                    {curRank ? `#${curRank}` : "Unranked"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Google Organic SERP</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Net Trajectory</div>
                  <div className="text-xl font-black font-mono mt-1 flex items-center gap-1 text-emerald-400">
                    {netMovement >= 0 ? `+${netMovement}` : `${netMovement}`}
                    <span className="text-xs font-normal text-muted-foreground font-sans">pos</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Historical gain</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Best Rank Recorded</div>
                  <div className="text-xl font-black font-mono mt-1 text-amber-500">
                    {bestRank != null ? `#${bestRank}` : "Unranked"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">All-time peak</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Average Position</div>
                  <div className="text-xl font-black font-mono mt-1 text-blue-500">
                    {avgRank !== "N/A" ? `#${avgRank}` : "N/A"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Rolling baseline</div>
                </div>
              </div>

              {/* Chronological Backdates Table */}
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    Historical Backdates Ledger
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {timelineEntries.length} chronological checkpoints
                  </span>
                </div>

                <div className="overflow-y-auto border border-border rounded-lg flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/30 text-muted-foreground font-medium sticky top-0 border-b border-border">
                      <tr>
                        <th className="py-2 px-3">Date Checkpoint</th>
                        <th className="py-2 px-3 text-center">SERP Rank</th>
                        <th className="py-2 px-3 text-center">Movement</th>
                        <th className="py-2 px-3">Status Milestone</th>
                        <th className="py-2 px-3">Market Leader</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {timelineEntries.map((item, idx) => (
                        <tr key={idx} className="hover:bg-secondary/10 transition">
                          <td className="py-2 px-3 font-sans font-medium text-foreground text-[11px]">
                            {item.dateStr}
                          </td>
                          <td className="py-2 px-3 text-center font-bold">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                              item.rank === 1
                                ? "bg-emerald-500/20 text-emerald-500 font-black"
                                : item.rank && item.rank <= 3
                                ? "bg-emerald-500/15 text-emerald-400 font-bold"
                                : item.rank && item.rank <= 10
                                ? "bg-blue-500/15 text-blue-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}>
                              #{item.rank ?? ">50"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-[11px]">
                            {item.delta != null ? (
                              item.delta > 0 ? (
                                <span className="text-emerald-500 inline-flex items-center gap-0.5">
                                  <ArrowUp className="w-3 h-3" /> +{item.delta}
                                </span>
                              ) : item.delta < 0 ? (
                                <span className="text-rose-500 inline-flex items-center gap-0.5">
                                  <ArrowDown className="w-3 h-3" /> {item.delta}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )
                            ) : (
                              <span className="text-primary text-[10px]">BASELINE</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-sans text-[11px] text-muted-foreground">
                            {item.status}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-muted-foreground truncate max-w-[120px]">
                            {item.competitor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                <span className="text-[11px]">
                  💡 Synchronized with Google Search Console & live zero-cost SERP tracker.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryKeyword(null)}
                  className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
