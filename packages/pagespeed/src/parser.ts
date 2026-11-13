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
  const scores: LighthouseScorecard = {
    performance: Math.round((categories.performance?.score ?? 0) * 100),
    accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((categories["best-practices"]?.score ?? 0) * 100),
    seo: Math.round((categories.seo?.score ?? 0) * 100),
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
    { id: "render-blocking-resources", cat: "PERFORMANCE" as const },
    { id: "unused-javascript", cat: "PERFORMANCE" as const },
    { id: "unused-css-rules", cat: "PERFORMANCE" as const },
    { id: "unminified-javascript", cat: "PERFORMANCE" as const },
    { id: "unminified-css", cat: "PERFORMANCE" as const },
    { id: "modern-image-formats", cat: "PERFORMANCE" as const },
    { id: "uses-optimized-images", cat: "PERFORMANCE" as const },
    { id: "uses-responsive-images", cat: "PERFORMANCE" as const },
    { id: "efficient-animated-content", cat: "PERFORMANCE" as const },
    { id: "server-response-time", cat: "PERFORMANCE" as const },
    { id: "uses-text-compression", cat: "PERFORMANCE" as const },
    { id: "font-display", cat: "PERFORMANCE" as const },
    { id: "dom-size", cat: "PERFORMANCE" as const },
    { id: "total-byte-weight", cat: "PERFORMANCE" as const },
    { id: "redirects", cat: "PERFORMANCE" as const },
  ];

  for (const item of significantAudits) {
    const audit = audits[item.id];
    if (!audit) continue;

    // A score < 0.9 or numericValue indicating opportunity represents an issue
    const score = audit.score != null ? audit.score : 1;
    if (score < 0.9) {
      const wastedMs = audit.numericValue != null ? Math.round(audit.numericValue) : undefined;
      
      // Determine severity based on wasted time or score
      let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
      if (wastedMs != null) {
        if (wastedMs > 1500) severity = "CRITICAL";
        else if (wastedMs > 600) severity = "HIGH";
        else if (wastedMs > 250) severity = "MEDIUM";
      } else {
        if (score < 0.4) severity = "HIGH";
        else if (score < 0.7) severity = "MEDIUM";
      }

      // Extract specific offending items
      const evidenceItems: Array<{ url?: string; wastedMs?: number; wastedBytes?: number; description?: string }> = [];
      const detailsItems = audit.details?.items;
      if (Array.isArray(detailsItems)) {
        for (const detail of detailsItems.slice(0, 10)) {
          evidenceItems.push({
            url: detail.url,
            wastedMs: detail.wastedMs != null ? Math.round(detail.wastedMs) : undefined,
            wastedBytes: detail.wastedBytes != null ? Math.round(detail.wastedBytes) : undefined,
            description: detail.description,
          });
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
