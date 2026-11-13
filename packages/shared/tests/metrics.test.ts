import { describe, it, expect } from "vitest";
import {
  classifyLCP,
  classifyINP,
  classifyCLS,
  classifyOverallScore,
  METRIC_THRESHOLDS,
} from "../src/constants/metrics.js";

describe("Core Web Vitals Threshold Classifiers", () => {
  it("should classify LCP accurately according to Google thresholds", () => {
    expect(classifyLCP(1200)).toBe("GOOD");
    expect(classifyLCP(METRIC_THRESHOLDS.LCP.GOOD)).toBe("GOOD");
    expect(classifyLCP(2501)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyLCP(METRIC_THRESHOLDS.LCP.NEEDS_IMPROVEMENT)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyLCP(4001)).toBe("POOR");
    expect(classifyLCP(null)).toBeNull();
  });

  it("should classify INP accurately according to Google thresholds", () => {
    expect(classifyINP(150)).toBe("GOOD");
    expect(classifyINP(METRIC_THRESHOLDS.INP.GOOD)).toBe("GOOD");
    expect(classifyINP(201)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyINP(METRIC_THRESHOLDS.INP.NEEDS_IMPROVEMENT)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyINP(501)).toBe("POOR");
    expect(classifyINP(null)).toBeNull();
  });

  it("should classify CLS accurately according to Google thresholds", () => {
    expect(classifyCLS(0.04)).toBe("GOOD");
    expect(classifyCLS(METRIC_THRESHOLDS.CLS.GOOD)).toBe("GOOD");
    expect(classifyCLS(0.15)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyCLS(METRIC_THRESHOLDS.CLS.NEEDS_IMPROVEMENT)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyCLS(0.26)).toBe("POOR");
    expect(classifyCLS(null)).toBeNull();
  });

  it("should classify overall Lighthouse scores correctly", () => {
    expect(classifyOverallScore(95)).toBe("GOOD");
    expect(classifyOverallScore(90)).toBe("GOOD");
    expect(classifyOverallScore(89)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyOverallScore(50)).toBe("NEEDS_IMPROVEMENT");
    expect(classifyOverallScore(49)).toBe("POOR");
    expect(classifyOverallScore(12)).toBe("POOR");
  });
});
