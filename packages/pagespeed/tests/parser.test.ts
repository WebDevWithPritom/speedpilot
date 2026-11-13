import { describe, it, expect } from "vitest";
import { parseGooglePSIResponse } from "../src/parser.js";

describe("PageSpeed Response Parser", () => {
  const samplePSIResponse = {
    lighthouseResult: {
      categories: {
        performance: { score: 0.85 },
        accessibility: { score: 0.95 },
        "best-practices": { score: 0.9 },
        seo: { score: 0.92 },
      },
      audits: {
        "first-contentful-paint": { numericValue: 1240 },
        "largest-contentful-paint": { numericValue: 2840 },
        "total-blocking-time": { numericValue: 320 },
        "cumulative-layout-shift": { numericValue: 0.045 },
        "speed-index": { numericValue: 2150 },
        "render-blocking-resources": {
          score: 0.35,
          title: "Eliminate render-blocking resources",
          numericValue: 680,
          displayValue: "Potential savings of 680 ms",
          details: {
            items: [
              { url: "https://example.com/styles.css", wastedMs: 420, wastedBytes: 15400 },
              { url: "https://example.com/vendor.js", wastedMs: 260, wastedBytes: 85200 },
            ],
          },
        },
      },
      timing: { total: 18450 },
    },
    loadingExperience: {
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2400 },
        INTERACTION_TO_NEXT_PAINT: { percentile: 180 },
        CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 }, // 0.05
      },
    },
  };

  it("should extract normalized Lighthouse scores accurately (0-100)", () => {
    const result = parseGooglePSIResponse(samplePSIResponse, "https://example.com", "MOBILE");
    expect(result.scores.performance).toBe(85);
    expect(result.scores.accessibility).toBe(95);
    expect(result.scores.bestPractices).toBe(90);
    expect(result.scores.seo).toBe(92);
  });

  it("should parse synthetic lab metrics correctly", () => {
    const result = parseGooglePSIResponse(samplePSIResponse, "https://example.com", "MOBILE");
    expect(result.labMetrics.fcpMs).toBe(1240);
    expect(result.labMetrics.lcpMs).toBe(2840);
    expect(result.labMetrics.tbtMs).toBe(320);
    expect(result.labMetrics.cls).toBe(0.045);
    expect(result.labMetrics.speedIndexMs).toBe(2150);
  });

  it("should extract URL-level CrUX field data and classify thresholds", () => {
    const result = parseGooglePSIResponse(samplePSIResponse, "https://example.com", "MOBILE");
    expect(result.cruxFieldData.scope).toBe("URL");
    expect(result.cruxFieldData.lcpValueMs).toBe(2400);
    expect(result.cruxFieldData.lcpCategory).toBe("GOOD");
    expect(result.cruxFieldData.inpValueMs).toBe(180);
    expect(result.cruxFieldData.inpCategory).toBe("GOOD");
    expect(result.cruxFieldData.clsValue).toBe(0.05);
    expect(result.cruxFieldData.clsCategory).toBe("GOOD");
  });

  it("should fall back to ORIGIN scope when URL-level CrUX is absent", () => {
    const responseWithOriginOnly = {
      ...samplePSIResponse,
      loadingExperience: {}, // empty
      originLoadingExperience: {
        metrics: {
          LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3100 },
          INTERACTION_TO_NEXT_PAINT: { percentile: 250 },
        },
      },
    };

    const result = parseGooglePSIResponse(responseWithOriginOnly, "https://example.com/rare-page", "DESKTOP");
    expect(result.cruxFieldData.scope).toBe("ORIGIN");
    expect(result.cruxFieldData.lcpValueMs).toBe(3100);
    expect(result.cruxFieldData.lcpCategory).toBe("NEEDS_IMPROVEMENT");
  });

  it("should set scope to UNAVAILABLE when neither URL nor origin field data exists", () => {
    const responseNoCrUX = {
      ...samplePSIResponse,
      loadingExperience: {},
      originLoadingExperience: {},
    };

    const result = parseGooglePSIResponse(responseNoCrUX, "https://example.com/new-url", "MOBILE");
    expect(result.cruxFieldData.scope).toBe("UNAVAILABLE");
    expect(result.cruxFieldData.lcpValueMs).toBeNull();
  });

  it("should parse diagnostic opportunities with severity and evidence", () => {
    const result = parseGooglePSIResponse(samplePSIResponse, "https://example.com", "MOBILE");
    expect(result.issues).toHaveLength(1);
    const issue = result.issues[0];
    expect(issue?.code).toBe("render-blocking-resources");
    expect(issue?.severity).toBe("HIGH"); // > 600ms wasted
    expect(issue?.evidenceItems).toHaveLength(2);
    expect(issue?.evidenceItems[0]?.url).toBe("https://example.com/styles.css");
    expect(issue?.evidenceItems[0]?.wastedMs).toBe(420);
  });
});
