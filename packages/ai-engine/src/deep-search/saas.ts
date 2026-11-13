import { TechStack, NormalizedAuditIssue } from "@speedpilot/shared";
import { SaaSTeamDeepSearchResult } from "./types.js";

export function getDeterministicSaaSTeamDeepSearch(
  issue: NormalizedAuditIssue,
  techStack: TechStack,
  targetUrl: string
): SaaSTeamDeepSearchResult {
  const isRenderBlocking = issue.code === "render-blocking-resources";

  if (isRenderBlocking) {
    return {
      persona: "SAAS_TEAM",
      slaBreachRisk: "HIGH",
      performanceBudgetRule: {
        metric: "cumulative-layout-shift and first-contentful-paint",
        targetThreshold: "FCP <= 1800ms, Render-Blocking Wasted <= 100ms",
        enforcementAction: "BLOCK_PR"
      },
      ciConfigSnippet: `{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "render-blocking-resources": ["error", { "maxLength": 0 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}`,
      sprintTicket: {
        title: `[PERF-HOTFIX] Eliminate render-blocking resource bottleneck on ${targetUrl}`,
        description: `Synthetic audit in SpeedPilot detected critical render-blocking overhead on ${targetUrl} (${techStack}). Main thread parsing is suspended during critical rendering phase.`,
        acceptanceCriteria: [
          "Render-blocking resources reduced to 0 in Lighthouse CI",
          "FCP (First Contentful Paint) is <= 1.8s on simulated 4G mobile profiles",
          "No regressions introduced in visual regression test suite",
          "Lighthouse CI assertions pass in GitHub Actions PR check"
        ]
      },
      syntheticVsRumNote: `While synthetic Lighthouse measures worst-case cold cache loads, real user CrUX data shows 75th percentile mobile users face degraded interaction latency under poor network conditions.`
    };
  }

  return {
    persona: "SAAS_TEAM",
    slaBreachRisk: issue.severity === "HIGH" || issue.severity === "CRITICAL" ? "MODERATE" : "LOW",
    performanceBudgetRule: {
      metric: issue.code,
      targetThreshold: "Audit score >= 0.90",
      enforcementAction: "WARN"
    },
    ciConfigSnippet: `{
  "ci": {
    "assert": {
      "assertions": {
        "${issue.code}": ["warn", { "minScore": 0.9 }]
      }
    }
  }
}`,
    sprintTicket: {
      title: `[PERF-DEBT] Resolve ${issue.title} on ${targetUrl}`,
      description: `SpeedPilot audit identified performance regression for ${issue.code} on ${techStack}.`,
      acceptanceCriteria: [
        `Audit issue '${issue.code}' resolves with score >= 0.90 in staging audit`,
        "Automated CI build succeeds with 0 performance budget warnings"
      ]
    },
    syntheticVsRumNote: `Monitor RUM Core Web Vitals dashboard post-release to verify p75 latency alignment with synthetic gains.`
  };
}
