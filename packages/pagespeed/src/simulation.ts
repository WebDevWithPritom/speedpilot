import { SingleDevice } from "@speedpilot/shared";
import { ParsedPageSpeedResult } from "./types.js";

/**
 * Generates deterministic realistic benchmark metrics for local testing and dry-run demonstrations
 * when Google API keys are not yet configured or when Google rate-limits (HTTP 429).
 */
export function generateDryRunSimulation(url: string, device: SingleDevice): ParsedPageSpeedResult {
  // Use simple character hashing from URL so the same URL always gives consistent scores
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const isMobile = device === "MOBILE";

  // Performance score: 72 - 94 for mobile, 85 - 98 for desktop
  const perfBase = isMobile ? 72 : 85;
  const performanceScore = Math.min(100, perfBase + (positiveHash % 20));
  const accessibilityScore = 90 + (positiveHash % 10);
  const bestPracticesScore = 88 + (positiveHash % 11);
  const seoScore = 92 + (positiveHash % 8);

  // Lab metrics
  const lcpMs = isMobile ? 2400 + (positiveHash % 900) : 1200 + (positiveHash % 600);
  const fcpMs = Math.round(lcpMs * 0.55);
  const tbtMs = isMobile ? 180 + (positiveHash % 250) : 40 + (positiveHash % 120);
  const cls = parseFloat((0.01 + ((positiveHash % 7) / 100)).toFixed(3));
  const speedIndexMs = Math.round(lcpMs * 0.85);

  const parsedUrl = new URL(url);
  const domain = parsedUrl.origin;

  return {
    url,
    device,
    scores: {
      performance: performanceScore,
      accessibility: accessibilityScore,
      bestPractices: bestPracticesScore,
      seo: seoScore,
    },
    labMetrics: {
      fcpMs,
      lcpMs,
      tbtMs,
      cls,
      speedIndexMs,
    },
    cruxFieldData: {
      scope: "UNAVAILABLE",
      lcpValueMs: null,
      lcpCategory: null,
      inpValueMs: null,
      inpCategory: null,
      clsValue: null,
      clsCategory: null,
      collectionPeriod: "Dry-run testing mode",
    },
    issues: [
      {
        code: "render-blocking-resources",
        title: "Eliminate render-blocking resources",
        category: "PERFORMANCE",
        severity: "HIGH",
        displayValue: `Potential savings of ${isMobile ? 620 : 340} ms`,
        score: 0.52,
        evidenceItems: [
          {
            url: `${domain}/assets/theme.css`,
            wastedMs: isMobile ? 420 : 220,
            wastedBytes: 42100,
          },
          {
            url: `${domain}/assets/vendor.js`,
            wastedMs: isMobile ? 200 : 120,
            wastedBytes: 85300,
          },
        ],
      },
      {
        code: "modern-image-formats",
        title: "Serve images in next-gen formats",
        category: "PERFORMANCE",
        severity: "MEDIUM",
        displayValue: "Potential savings of 380 KB",
        score: 0.68,
        evidenceItems: [
          {
            url: `${domain}/images/hero-banner.jpg`,
            wastedBytes: 245000,
          },
        ],
      },
    ],
    rawExecutionTimeMs: 1450,
  };
}
