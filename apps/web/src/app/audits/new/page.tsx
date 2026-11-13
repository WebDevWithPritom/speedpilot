"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { parseBulkUrlString, validateAndNormalizeUrl } from "@speedpilot/shared";

type InputTab = "single" | "textarea" | "csv" | "sitemap" | "agentic";

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

  // Mode and form states
  const [activeTab, setActiveTab] = useState<InputTab>("single");
  const [singleUrl, setSingleUrl] = useState("");
  const [textareaContent, setTextareaContent] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [sitemapLoading, setSitemapLoading] = useState(false);
  const [sitemapDiscovered, setSitemapDiscovered] = useState<string[]>([]);
  const [isSitemapIndex, setIsSitemapIndex] = useState(false);
  const [childSitemaps, setChildSitemaps] = useState<ChildSitemap[]>([]);
  const [selectedChildUrls, setSelectedChildUrls] = useState<Set<string>>(new Set());

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
        body: JSON.stringify({ sitemapUrl, maxUrls: 100 }),
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
      if (activeTab === "single") {
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

      // 3. Trigger audit
      const auditRes = await fetch("/api/v1/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetProjectId,
          deviceMode,
          urls: targetUrls,
        }),
      });

      const auditData = await auditRes.json();
      if (!auditRes.ok) {
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Run Performance Audit</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Audit single pages, batch lists, CSV spreadsheets, or discover full XML sitemaps.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmitAudit} className="space-y-6">
        {/* Project Selector */}
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">1. Select Target Project</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Existing Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.primaryDomain})
                  </option>
                ))}
                <option value="new">+ Create New Project</option>
              </select>
            </div>

            {(selectedProjectId === "new" || projects.length === 0) && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  New Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Production Portal"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}
          </div>
        </div>

        {/* Input Method Tabs */}
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">2. Provide URLs to Audit</h2>
            <div className="flex bg-secondary p-1 rounded-md text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("single")}
                className={`px-3 py-1 rounded transition ${activeTab === "single" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Single URL
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("textarea")}
                className={`px-3 py-1 rounded transition ${activeTab === "textarea" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Batch Textarea
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("csv")}
                className={`px-3 py-1 rounded transition ${activeTab === "csv" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                CSV Upload
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sitemap")}
                className={`px-3 py-1 rounded transition ${activeTab === "sitemap" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                XML Sitemap
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("agentic")}
                className={`px-3 py-1 rounded transition flex items-center gap-1 ${activeTab === "agentic" ? "bg-card text-primary font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Bot className="w-3.5 h-3.5 text-primary" />
                Agentic Crawler
              </button>
            </div>
          </div>

          {/* Single URL Tab */}
          {activeTab === "single" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Website Target URL</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                SpeedPilot will run Lighthouse lab analysis, CrUX field queries, and technical SEO hygiene.
              </p>
            </div>
          )}

          {/* Textarea Tab */}
          {activeTab === "textarea" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Paste URLs (one per line)</label>
              <textarea
                rows={6}
                placeholder={"https://example.com/\nhttps://example.com/pricing\nhttps://example.com/blog/speed"}
                value={textareaContent}
                onChange={(e) => setTextareaContent(e.target.value)}
                className="w-full p-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                Duplicate URLs and hash fragments will be automatically normalized and deduplicated.
              </p>
            </div>
          )}

          {/* CSV Upload Tab */}
          {activeTab === "csv" && (
            <div className="p-8 border-2 border-dashed border-border rounded-lg text-center bg-secondary/20">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <label className="inline-block cursor-pointer px-4 py-2 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 transition">
                <span>Select CSV File</span>
                <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                Upload a CSV containing URLs in any column. We will automatically parse and validate each line.
              </p>
            </div>
          )}

          {/* XML Sitemap Tab */}
          {activeTab === "sitemap" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">XML Sitemap or Sitemap Index URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/sitemap.xml"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={handleDiscoverSitemap}
                    disabled={sitemapLoading || !sitemapUrl}
                    className="px-4 py-2 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    {sitemapLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    Discover URLs
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Works with both standard <code className="font-mono bg-secondary px-1 py-0.5 rounded">&lt;urlset&gt;</code> sitemaps and nested <code className="font-mono bg-secondary px-1 py-0.5 rounded">&lt;sitemapindex&gt;</code> files.
                </p>
              </div>

              {/* Sitemap Index Multi-Sitemap Breakdown */}
              {isSitemapIndex && childSitemaps.length > 0 && (
                <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-3">
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
                        className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 font-medium transition"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={selectRecommendedChildSitemaps}
                        className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 font-medium transition text-primary"
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
                          className={`p-2.5 rounded-md border text-left cursor-pointer transition flex items-start gap-2.5 ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border bg-card/60 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by container onClick
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
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20 text-xs space-y-2">
                  <div className="font-semibold text-emerald-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Ready to Audit: {sitemapDiscovered.length} Selected Web Page URLs
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Filtered & XMLs excluded
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] text-muted-foreground bg-background/50 p-2 rounded border border-border/50">
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

          {/* Agentic Autonomous Crawler Tab */}
          {activeTab === "agentic" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Autonomous Site Exploration</span>: SpeedPilot will crawl your homepage, follow genuine internal links, discover key conversion and content pages, and check for broken 404 links — no sitemap or URL list required!
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Seed Domain or Root URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com"
                    value={agenticRootUrl}
                    onChange={(e) => setAgenticRootUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={handleRunAgenticCrawl}
                    disabled={agenticLoading || !agenticRootUrl}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    {agenticLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                    Launch Agentic Crawl
                  </button>
                </div>
              </div>

              {/* Crawler Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Crawl Page Limit
                  </label>
                  <select
                    value={agenticMaxPages}
                    onChange={(e) => setAgenticMaxPages(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value={15}>15 Pages (Fast reconnaissance)</option>
                    <option value={25}>25 Pages (Recommended default)</option>
                    <option value={50}>50 Pages (Deep content survey)</option>
                    <option value={100}>100 Pages (Comprehensive crawl)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Max Link Depth
                  </label>
                  <select
                    value={agenticMaxDepth}
                    onChange={(e) => setAgenticMaxDepth(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value={1}>1 Level (Root & main navigation only)</option>
                    <option value={2}>2 Levels (Navigation + linked subpages)</option>
                    <option value={3}>3 Levels (Deep recursive exploration)</option>
                  </select>
                </div>
              </div>

              {/* Broken Links Alert if Found */}
              {agenticBrokenLinks.length > 0 && (
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs text-amber-500 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Agent Discovered {agenticBrokenLinks.length} Broken Internal Link(s) (404)
                  </div>
                  <div className="max-h-24 overflow-y-auto font-mono text-[11px] text-muted-foreground space-y-0.5">
                    {agenticBrokenLinks.map((b, i) => (
                      <div key={i} className="truncate text-rose-400">• {b.targetUrl} (Status {b.statusCode || "Failed"})</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discovered Pages Tree */}
              {agenticPages.length > 0 && (
                <div className="p-3.5 rounded-lg border border-border bg-secondary/20 text-xs space-y-2.5">
                  <div className="font-semibold text-emerald-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Agentic Discovery Complete: {agenticPages.length} Pages Found
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Ready for 1-Click Audit
                    </span>
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1.5 bg-background/50 p-2.5 rounded border border-border/50">
                    {agenticPages.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-1.5 py-0.2 rounded bg-secondary font-mono text-[10px] text-muted-foreground shrink-0">
                            Depth {p.depth}
                          </span>
                          <span className="font-mono truncate">{p.url}</span>
                        </div>
                        {p.title && (
                          <span className="text-muted-foreground/70 truncate text-[10px] max-w-[200px] shrink-0">
                            {p.title}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Device Mode Selector */}
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">3. Device Strategies</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setDeviceMode("BOTH")}
              className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 ${
                deviceMode === "BOTH"
                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                  : "border-border hover:bg-secondary/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                <Layers className="w-4 h-4" />
                Both (Recommended)
              </div>
              <span className="text-[11px] text-muted-foreground">Runs separate mobile & desktop audits</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceMode("MOBILE")}
              className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 ${
                deviceMode === "MOBILE"
                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                  : "border-border hover:bg-secondary/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                <Smartphone className="w-4 h-4" />
                Mobile Only
              </div>
              <span className="text-[11px] text-muted-foreground">Emulated Moto G4 on 4G network</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceMode("DESKTOP")}
              className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 ${
                deviceMode === "DESKTOP"
                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                  : "border-border hover:bg-secondary/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                <Monitor className="w-4 h-4" />
                Desktop Only
              </div>
              <span className="text-[11px] text-muted-foreground">Emulated desktop resolution</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Initiating Performance Audit...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Launch Bulk Performance Audit
            </>
          )}
        </button>
      </form>
    </div>
  );
}

