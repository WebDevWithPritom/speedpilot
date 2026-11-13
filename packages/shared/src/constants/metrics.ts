import { MetricCategory } from "../types/index.js";

/**
 * Official Google Core Web Vitals and PageSpeed Metric Thresholds
 * Reference: https://web.dev/vitals/
 */
export const METRIC_THRESHOLDS = {
  // Largest Contentful Paint (LCP) in milliseconds
  LCP: {
    GOOD: 2500,
    NEEDS_IMPROVEMENT: 4000,
  },
  // Interaction to Next Paint (INP) in milliseconds (Replaced FID in March 2024)
  INP: {
    GOOD: 200,
    NEEDS_IMPROVEMENT: 500,
  },
  // Cumulative Layout Shift (CLS) unitless score
  CLS: {
    GOOD: 0.1,
    NEEDS_IMPROVEMENT: 0.25,
  },
  // First Contentful Paint (FCP) in milliseconds
  FCP: {
    GOOD: 1800,
    NEEDS_IMPROVEMENT: 3000,
  },
  // Total Blocking Time (TBT) in milliseconds (Lighthouse Lab proxy for main-thread contention)
  TBT: {
    GOOD: 200,
    NEEDS_IMPROVEMENT: 600,
  },
  // Speed Index (SI) in milliseconds
  SPEED_INDEX: {
    GOOD: 3400,
    NEEDS_IMPROVEMENT: 5800,
  },
} as const;

/**
 * Classifies an LCP value in milliseconds into Google's CWV rating.
 */
export function classifyLCP(ms: number | null): MetricCategory | null {
  if (ms === null || isNaN(ms)) return null;
  if (ms <= METRIC_THRESHOLDS.LCP.GOOD) return "GOOD";
  if (ms <= METRIC_THRESHOLDS.LCP.NEEDS_IMPROVEMENT) return "NEEDS_IMPROVEMENT";
  return "POOR";
}

/**
 * Classifies an INP value in milliseconds into Google's CWV rating.
 */
export function classifyINP(ms: number | null): MetricCategory | null {
  if (ms === null || isNaN(ms)) return null;
  if (ms <= METRIC_THRESHOLDS.INP.GOOD) return "GOOD";
  if (ms <= METRIC_THRESHOLDS.INP.NEEDS_IMPROVEMENT) return "NEEDS_IMPROVEMENT";
  return "POOR";
}

/**
 * Classifies a CLS score into Google's CWV rating.
 */
export function classifyCLS(val: number | null): MetricCategory | null {
  if (val === null || isNaN(val)) return null;
  if (val <= METRIC_THRESHOLDS.CLS.GOOD) return "GOOD";
  if (val <= METRIC_THRESHOLDS.CLS.NEEDS_IMPROVEMENT) return "NEEDS_IMPROVEMENT";
  return "POOR";
}

/**
 * Classifies a Lighthouse overall score (0 - 100).
 */
export function classifyOverallScore(score: number): MetricCategory {
  if (score >= 90) return "GOOD";
  if (score >= 50) return "NEEDS_IMPROVEMENT";
  return "POOR";
}

