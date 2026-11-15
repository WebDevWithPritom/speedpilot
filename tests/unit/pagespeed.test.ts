import { describe, it, expect } from "vitest";
import {
  classifyLCP,
  classifyINP,
  classifyCLS,
  classifyOverallScore,
} from "@speedpilot/shared";
import { parseGooglePSIResponse, PageSpeedAPIError } from "@speedpilot/pagespeed";

describe("PageSpeed Suite — Core Web Vitals & Metric Parsing", () => {
  it("accurately classifies LCP thresholds according to Google Web Vitals", () => {
    expect(classifyLCP(1200)).toBe("GOOD");
    expect(classifyLCP(2500)).toBe("GOOD");
    expect(classifyLCP(2501)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyLCP(4000)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyLCP(4001)).toBe("POOR");
    expect(classifyLCP(null)).toBeNull();
  });

  it("accurately classifies INP (Interaction to Next Paint) thresholds", () => {
    expect(classifyINP(100)).toBe("GOOD");
    expect(classifyINP(200)).toBe("GOOD");
    expect(classifyINP(250)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyINP(500)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyINP(550)).toBe("POOR");
    expect(classifyINP(null)).toBeNull();
  });

  it("accurately classifies CLS (Cumulative Layout Shift) thresholds", () => {
    expect(classifyCLS(0.05)).toBe("GOOD");
    expect(classifyCLS(0.1)).toBe("GOOD");
    expect(classifyCLS(0.15)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyCLS(0.25)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyCLS(0.3)).toBe("POOR");
    expect(classifyCLS(null)).toBeNull();
  });

  it("accurately classifies Overall Performance Score tiers", () => {
    expect(classifyOverallScore(95)).toBe("GOOD");
    expect(classifyOverallScore(90)).toBe("GOOD");
    expect(classifyOverallScore(75)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyOverallScore(50)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyOverallScore(49)).toBe("POOR");
    expect(classifyOverallScore(12)).toBe("POOR");
  });

  it("parses raw Lighthouse JSON payload into normalized scorecards and metrics", () => {
    const mockLhr = {
      lighthouseResult: {
        categories: {
          performance: { score: 0.88 },
          accessibility: { score: 0.95 },
          "best-practices": { score: 0.90 },
          seo: { score: 0.92 },
        },
        audits: {
          "first-contentful-paint": { numericValue: 1200 },
          "largest-contentful-paint": { numericValue: 2100 },
          "total-blocking-time": { numericValue: 180 },
          "cumulative-layout-shift": { numericValue: 0.04 },
          "speed-index": { numericValue: 2400 },
        },
      },
    };

    const parsed = parseGooglePSIResponse(mockLhr, "https://example.com", "MOBILE");

    expect(parsed.scores.performance).toBe(88);
    expect(parsed.scores.accessibility).toBe(95);
    expect(parsed.scores.bestPractices).toBe(90);
    expect(parsed.scores.seo).toBe(92);

    expect(parsed.labMetrics.lcpMs).toBe(2100);
    expect(parsed.labMetrics.fcpMs).toBe(1200);
    expect(parsed.labMetrics.tbtMs).toBe(180);
    expect(parsed.labMetrics.cls).toBe(0.04);
  });

  it("PageSpeedAPIError properly encapsulates status codes and error details", () => {
    const err = new PageSpeedAPIError("Google PSI rate limit", 429);
    expect(err.name).toBe("PageSpeedAPIError");
    expect(err.message).toBe("Google PSI rate limit");
    expect(err.status).toBe(429);
  });
});
