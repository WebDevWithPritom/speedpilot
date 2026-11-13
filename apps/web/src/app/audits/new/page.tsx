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
} from "lucide-react";
import { parseBulkUrlString, validateAndNormalizeUrl } from "@speedpilot/shared";

type InputTab = "single" | "textarea" | "csv" | "sitemap";

export default function NewAuditPage() {
  const router = useRouter();

  // Mode and form states
  const [activeTab, setActiveTab] = useState<InputTab>("single");
  const [singleUrl, setSingleUrl] = useState("");
  const [textareaContent, setTextareaContent] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [sitemapLoading, setSitemapLoading] = useState(false);
  const [sitemapDiscovered, setSitemapDiscovered] = useState<string[]>([]);
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

    try {
      const res = await fetch("/api/v1/sitemaps/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl, maxUrls: 50 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse sitemap");
      }
      setSitemapDiscovered(data.urls || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSitemapLoading(false);
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
        // Filter out .xml sitemaps if accidentally pasted
        targetUrls = parsed.validUrls.filter((u) => !u.endsWith(".xml"));
        if (targetUrls.length === 0) {
          throw new Error("The submitted URLs appear to be XML sitemap files. Please use the 'XML Sitemap' tab.");
        }
      } else if (activeTab === "sitemap") {
        if (sitemapDiscovered.length === 0) {
          throw new Error("Please click 'Discover URLs' first so SpeedPilot can extract the web pages from the sitemap.");
        }
        targetUrls = sitemapDiscovered;
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
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">XML Sitemap URL</label>
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
                  className="px-4 py-2 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sitemapLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  Discover URLs
                </button>
              </div>

              {sitemapDiscovered.length > 0 && (
                <div className="p-3 rounded border border-border bg-secondary/30 text-xs">
                  <div className="font-semibold text-emerald-500 flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Discovered {sitemapDiscovered.length} URLs from Sitemap
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] text-muted-foreground">
                    {sitemapDiscovered.slice(0, 10).map((u, i) => (
                      <div key={i} className="truncate">• {u}</div>
                    ))}
                    {sitemapDiscovered.length > 10 && (
                      <div className="italic text-muted-foreground/60">+ {sitemapDiscovered.length - 10} more URLs</div>
                    )}
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

