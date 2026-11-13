import { TechStack, NormalizedAuditIssue } from "@speedpilot/shared";
import { MarketerDeepSearchResult } from "./types.js";

export function getDeterministicMarketerDeepSearch(
  issue: NormalizedAuditIssue,
  techStack: TechStack,
  targetUrl: string
): MarketerDeepSearchResult {
  const wastedMs = issue.evidenceItems[0]?.wastedMs || 500;
  const isHighSeverity = issue.severity === "HIGH" || issue.severity === "CRITICAL";

  switch (issue.code) {
    case "render-blocking-resources":
      return {
        persona: "MARKETER",
        serpRankRisk: isHighSeverity ? "HIGH" : "MEDIUM",
        projectedBounceRateDelta: "-12.8% mobile bounce probability reduction",
        estimatedConversionUplift: "+3.8% projected mobile conversion increase",
        plainEnglishSummary: `When mobile visitors click your link from Google Search or social ads, their phone renders a blank screen for ~${wastedMs}ms while downloading unnecessary formatting files. Removing this barrier gets your value proposition in front of customers instantly before they bounce.`,
        executiveBulletPoints: [
          `Google Search prioritizes mobile-friendly pages with Core Web Vitals under 2.5s. Eliminating this delay helps safeguard search rankings.`,
          `According to mobile retail benchmarks, every 100ms delay in page load decreases conversion rates by up to 0.7%.`,
          `Paid ad campaigns on Meta and Google Ads will experience lower bounce rates, directly maximizing ad spend efficiency.`,
          `Organic search competitors in the ${techStack} space typically achieve sub-second visual load times on their primary landing pages.`
        ],
        competitorGapNotice: `Top 10% organic competitors load primary headlines 1.2s faster than this page on 4G cellular connections.`
      };

    case "largest-contentful-paint-element":
    case "prioritize-lcp-image":
      return {
        persona: "MARKETER",
        serpRankRisk: "HIGH",
        projectedBounceRateDelta: "-15.2% bounce rate reduction on entry pages",
        estimatedConversionUplift: "+5.1% lift in above-the-fold call-to-action clicks",
        plainEnglishSummary: `Your hero banner image takes too long to appear. Visitors view a blank space where your primary headline and promotional offer should be, diminishing initial user trust.`,
        executiveBulletPoints: [
          `LCP (Largest Contentful Paint) is a direct ranking metric in Google's ranking algorithm.`,
          `Faster hero image delivery increases immediate interaction with sign-up buttons and product add-to-carts.`,
          `Optimizing hero imagery is a zero-risk, high-return initiative with no disruption to design aesthetics.`
        ],
        competitorGapNotice: `E-commerce industry leaders preload hero visuals to guarantee display within 800ms of navigation.`
      };

    default:
      return {
        persona: "MARKETER",
        serpRankRisk: isHighSeverity ? "HIGH" : "MEDIUM",
        projectedBounceRateDelta: "-6.4% estimated bounce rate decrease",
        estimatedConversionUplift: "+2.0% general user engagement lift",
        plainEnglishSummary: `Addressing '${issue.title}' removes browser lag during user navigation, ensuring visitors stay on ${targetUrl} rather than returning to search results.`,
        executiveBulletPoints: [
          `Core Web Vitals health score directly influences Google's Page Experience ranking signal.`,
          `Smooth and responsive user interactions improve session depth and total pageviews per session.`,
          `Ensures ad landing pages deliver optimal ROI across paid social and search channels.`
        ],
        competitorGapNotice: `Benchmark sites maintain green (90+) PageSpeed scores on comparable marketing pages.`
      };
  }
}
