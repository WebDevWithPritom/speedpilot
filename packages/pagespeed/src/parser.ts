import {
  LighthouseScorecard,
  LighthouseLabMetrics,
  CrUXFieldData,
  NormalizedAuditIssue,
  SingleDevice,
  classifyLCP,
  classifyINP,
  classifyCLS,
} from "@speedpilot/shared";
import { ParsedPageSpeedResult } from "./types.js";

/**
 * Parses raw Google PageSpeed Insights API JSON response into normalized SpeedPilot data models.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseGooglePSIResponse(raw: any, targetUrl: string, device: SingleDevice): ParsedPageSpeedResult {
  const lhr = raw.lighthouseResult || {};
  const categories = lhr.categories || {};
  const audits = lhr.audits || {};

  // 1. Extract Lighthouse Scores (0 - 100)
  const agenticCat = categories["agentic-browsing"];
  const agenticScore = agenticCat?.score != null ? Math.round(agenticCat.score * 100) : null;
  let agenticRatio: string | null = null;
  if (agenticCat?.auditRefs && Array.isArray(agenticCat.auditRefs)) {
    const total = agenticCat.auditRefs.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const passed = agenticCat.auditRefs.filter((ref: any) => audits[ref.id]?.score === 1).length;
    agenticRatio = `${passed}/${total}`;
  }

  const scores: LighthouseScorecard = {
    performance: Math.round((categories.performance?.score ?? 0) * 100),
    accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((categories["best-practices"]?.score ?? 0) * 100),
    seo: Math.round((categories.seo?.score ?? 0) * 100),
    agenticBrowsing: agenticScore,
    agenticRatio,
  };

  // 2. Extract Synthetic Lab Metrics
  const labMetrics: LighthouseLabMetrics = {
    fcpMs: Math.round(audits["first-contentful-paint"]?.numericValue ?? 0),
    lcpMs: Math.round(audits["largest-contentful-paint"]?.numericValue ?? 0),
    tbtMs: Math.round(audits["total-blocking-time"]?.numericValue ?? 0),
    cls: parseFloat((audits["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3)),
    speedIndexMs: Math.round(audits["speed-index"]?.numericValue ?? 0),
  };

  // 3. Extract Chrome UX Report (CrUX) Field Data (URL-level preferred, fallback to Origin-level)
  let cruxFieldData: CrUXFieldData = {
    scope: "UNAVAILABLE",
    lcpValueMs: null,
    lcpCategory: null,
    inpValueMs: null,
    inpCategory: null,
    clsValue: null,
    clsCategory: null,
    collectionPeriod: null,
  };

  const urlExp = raw.loadingExperience;
  const originExp = raw.originLoadingExperience;

  const activeExp = (urlExp?.metrics && Object.keys(urlExp.metrics).length > 0)
    ? { data: urlExp, scope: "URL" as const }
    : (originExp?.metrics && Object.keys(originExp.metrics).length > 0)
    ? { data: originExp, scope: "ORIGIN" as const }
    : null;

  if (activeExp) {
    const metrics = activeExp.data.metrics || {};
    const lcpMetric = metrics.LARGEST_CONTENTFUL_PAINT_MS;
    const inpMetric = metrics.INTERACTION_TO_NEXT_PAINT;
    const clsMetric = metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE;

    const lcpVal = lcpMetric?.percentile != null ? Math.round(lcpMetric.percentile) : null;
    const inpVal = inpMetric?.percentile != null ? Math.round(inpMetric.percentile) : null;
    const clsVal = clsMetric?.percentile != null ? parseFloat((clsMetric.percentile / 100).toFixed(3)) : null;

    cruxFieldData = {
      scope: activeExp.scope,
      lcpValueMs: lcpVal,
      lcpCategory: classifyLCP(lcpVal),
      inpValueMs: inpVal,
      inpCategory: classifyINP(inpVal),
      clsValue: clsVal,
      clsCategory: classifyCLS(clsVal),
      collectionPeriod: "28-day rolling Chrome UX window",
    };
  }

  // 4. Extract Diagnostic Issues and Opportunities
  const issues: NormalizedAuditIssue[] = [];

  const significantAudits = [
    // Performance (Lighthouse v12/v13 Insights + Legacy v10/v11)
    { id: "render-blocking-insight", cat: "PERFORMANCE" as const },
    { id: "render-blocking-resources", cat: "PERFORMANCE" as const },
    { id: "network-dependency-tree-insight", cat: "PERFORMANCE" as const },
    { id: "lcp-breakdown-insight", cat: "PERFORMANCE" as const },
    { id: "image-delivery-insight", cat: "PERFORMANCE" as const },
    { id: "font-display-insight", cat: "PERFORMANCE" as const },
    { id: "cache-insight", cat: "PERFORMANCE" as const },
    { id: "legacy-javascript-insight", cat: "PERFORMANCE" as const },
    { id: "forced-reflow-insight", cat: "PERFORMANCE" as const },
    { id: "unused-javascript", cat: "PERFORMANCE" as const },
    { id: "unused-css-rules", cat: "PERFORMANCE" as const },
    { id: "unminified-javascript", cat: "PERFORMANCE" as const },
    { id: "unminified-css", cat: "PERFORMANCE" as const },
    { id: "modern-image-formats", cat: "PERFORMANCE" as const },
    { id: "uses-optimized-images", cat: "PERFORMANCE" as const },
    { id: "uses-responsive-images", cat: "PERFORMANCE" as const },
    { id: "uses-rel-preconnect", cat: "PERFORMANCE" as const },
    { id: "uses-rel-preload", cat: "PERFORMANCE" as const },
    { id: "prioritize-lcp-image", cat: "PERFORMANCE" as const },
    { id: "efficient-animated-content", cat: "PERFORMANCE" as const },
    { id: "server-response-time", cat: "PERFORMANCE" as const },
    { id: "uses-text-compression", cat: "PERFORMANCE" as const },
    { id: "font-display", cat: "PERFORMANCE" as const },
    { id: "dom-size", cat: "PERFORMANCE" as const },
    { id: "total-byte-weight", cat: "PERFORMANCE" as const },
    { id: "redirects", cat: "PERFORMANCE" as const },
    { id: "third-party-summary", cat: "PERFORMANCE" as const },
    { id: "bootup-time", cat: "PERFORMANCE" as const },
    // Accessibility & Coding Standards
    { id: "color-contrast", cat: "ACCESSIBILITY" as const },
    { id: "meta-viewport", cat: "ACCESSIBILITY" as const },
    { id: "landmark-one-main", cat: "ACCESSIBILITY" as const },
    { id: "link-name", cat: "ACCESSIBILITY" as const },
    { id: "image-alt", cat: "ACCESSIBILITY" as const },
    { id: "heading-order", cat: "ACCESSIBILITY" as const },
    // SEO & Crawling
    { id: "link-text", cat: "SEO" as const },
    { id: "document-title", cat: "SEO" as const },
    { id: "meta-description", cat: "SEO" as const },
    // Agentic Browsing & WebMCP
    { id: "agent-accessibility-tree", cat: "ACCESSIBILITY" as const },
    { id: "webmcp-form-coverage", cat: "BEST_PRACTICES" as const },
    { id: "webmcp-registered-tools", cat: "BEST_PRACTICES" as const },
    { id: "webmcp-schema-validity", cat: "BEST_PRACTICES" as const },
    { id: "llms-txt", cat: "SEO" as const },
    { id: "ard-schema", cat: "BEST_PRACTICES" as const },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattenChains = (nodeMap: Record<string, any> | undefined, out: Array<{ url?: string; wastedMs?: number; wastedBytes?: number }>) => {
    if (!nodeMap || typeof nodeMap !== "object") return;
    for (const node of Object.values(nodeMap)) {
      if (node?.url && out.length < 15) {
        out.push({
          url: node.url,
          wastedMs: node.navStartToEndTime != null ? Math.round(node.navStartToEndTime) : undefined,
          wastedBytes: node.transferSize != null ? Math.round(node.transferSize) : undefined,
        });
      }
      if (node?.children) flattenChains(node.children, out);
    }
  };

  const metricAuditIds = new Set([
    "first-contentful-paint",
    "largest-contentful-paint",
    "total-blocking-time",
    "cumulative-layout-shift",
    "speed-index",
    "interactive",
    "max-potential-fid",
  ]);

  const dynamicAudits: Array<{ id: string; cat: "PERFORMANCE" | "ACCESSIBILITY" | "BEST_PRACTICES" | "SEO" }> = [];
  const seenIds = new Set<string>();
  const categoryMap: Array<{ key: string; cat: "PERFORMANCE" | "ACCESSIBILITY" | "BEST_PRACTICES" | "SEO" }> = [
    { key: "performance", cat: "PERFORMANCE" },
    { key: "accessibility", cat: "ACCESSIBILITY" },
    { key: "best-practices", cat: "BEST_PRACTICES" },
    { key: "seo", cat: "SEO" },
    { key: "agentic-browsing", cat: "BEST_PRACTICES" },
  ];

  // Dynamically discover every real failing Lighthouse audit across all categories first
  for (const { key, cat } of categoryMap) {
    const refs = categories[key]?.auditRefs;
    if (!Array.isArray(refs)) continue;
    for (const ref of refs) {
      if (!ref?.id || metricAuditIds.has(ref.id) || seenIds.has(ref.id)) continue;
      seenIds.add(ref.id);
      dynamicAudits.push({ id: ref.id, cat });
    }
  }
  for (const fallback of significantAudits) {
    if (!seenIds.has(fallback.id)) {
      seenIds.add(fallback.id);
      dynamicAudits.push(fallback);
    }
  }

  for (const item of dynamicAudits) {
    const audit = audits[item.id];
    if (!audit) continue;
    if (audit.scoreDisplayMode === "informative" || audit.scoreDisplayMode === "notApplicable" || audit.scoreDisplayMode === "manual") {
      continue;
    }

    // A score < 0.9 indicates a failing or warning audit
    const score = audit.score != null ? audit.score : 1;
    if (score < 0.9) {
      const savingsMs = Math.max(audit.metricSavings?.LCP ?? 0, audit.metricSavings?.FCP ?? 0, audit.metricSavings?.TBT ?? 0);
      const wastedMs =
        audit.numericValue != null
          ? Math.round(audit.numericValue)
          : savingsMs > 0
          ? Math.round(savingsMs)
          : undefined;

      // Determine severity based on wasted time or score
      let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
      if (wastedMs != null) {
        if (wastedMs > 1500) severity = "CRITICAL";
        else if (wastedMs > 600) severity = "HIGH";
        else if (wastedMs > 250) severity = "MEDIUM";
      } else {
        if (score === 0) severity = "HIGH";
        else if (score < 0.4) severity = "HIGH";
        else if (score < 0.7) severity = "MEDIUM";
      }

      // Extract specific offending items (flat table, nested list-section, network-tree, or direct DOM node)
      const evidenceItems: Array<{
        url?: string;
        wastedMs?: number;
        wastedBytes?: number;
        description?: string;
        selector?: string;
        snippet?: string;
        nodeLabel?: string;
      }> = [];
      const detailsItems = audit.details?.items;
      if (Array.isArray(detailsItems)) {
        for (const detail of detailsItems.slice(0, 15)) {
          if (detail.value?.type === "network-tree" && detail.value?.chains) {
            flattenChains(detail.value.chains, evidenceItems);
          } else if (detail.value?.items && Array.isArray(detail.value.items)) {
            for (const subItem of detail.value.items.slice(0, 15)) {
              evidenceItems.push({
                url: subItem.url,
                description: subItem.description || "Diagnostic sub-item",
                selector: subItem.node?.selector,
                snippet: subItem.node?.snippet,
                nodeLabel: subItem.node?.nodeLabel,
              });
            }
          } else if (detail.type === "table" && Array.isArray(detail.items)) {
            for (const sub of detail.items.slice(0, 10)) {
              evidenceItems.push({
                url: sub.url,
                description: sub.label ? `${sub.label}: ${Math.round(sub.duration ?? 0)}ms` : undefined,
                wastedMs: sub.duration != null ? Math.round(sub.duration) : undefined,
              });
            }
          } else {
            evidenceItems.push({
              url: detail.url || (detail.snippet ? targetUrl : undefined),
              wastedMs: detail.wastedMs != null ? Math.round(detail.wastedMs) : undefined,
              wastedBytes: detail.wastedBytes != null ? Math.round(detail.wastedBytes) : undefined,
              description: detail.description,
              selector: detail.node?.selector || detail.selector,
              snippet: detail.node?.snippet || detail.snippet,
              nodeLabel: detail.node?.nodeLabel || detail.nodeLabel,
            });
          }
        }
      }

      issues.push({
        code: item.id,
        title: audit.title || item.id,
        category: item.cat,
        severity,
        displayValue: audit.displayValue,
        score,
        evidenceItems,
      });
    }
  }

  return {
    url: targetUrl,
    device,
    scores,
    labMetrics,
    cruxFieldData,
    issues,
    rawExecutionTimeMs: Math.round(lhr.timing?.total ?? 0),
  };
}

