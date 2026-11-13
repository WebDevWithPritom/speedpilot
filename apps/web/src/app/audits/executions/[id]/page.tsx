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
        </div>
      </div>

      {/* 4 Core Scorecard Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Performance
            </div>
            <div className="text-[11px] text-muted-foreground/80 mt-0.5">Speed & Vitals</div>
          </div>
          <MetricBadge score={lh?.performanceScore} size="lg" />
        </div>

        <div className="p-5 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Accessibility
            </div>
            <div className="text-[11px] text-muted-foreground/80 mt-0.5">WCAG Compliance</div>
          </div>
          <MetricBadge score={lh?.accessibilityScore} size="lg" />
        </div>

        <div className="p-5 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Best Practices
            </div>
            <div className="text-[11px] text-muted-foreground/80 mt-0.5">Modern Standards</div>
          </div>
          <MetricBadge score={lh?.bestPracticesScore} size="lg" />
        </div>

        <div className="p-5 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              SEO Score
            </div>
            <div className="text-[11px] text-muted-foreground/80 mt-0.5">Lighthouse Audit</div>
          </div>
          <MetricBadge score={lh?.seoScore} size="lg" />
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
    </div>
  );
}
