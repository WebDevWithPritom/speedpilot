import { TechStack, NormalizedAuditIssue } from "@speedpilot/shared";
import { AgencyDeepSearchResult } from "./types.js";

export function getDeterministicAgencyDeepSearch(
  issue: NormalizedAuditIssue,
  techStack: TechStack,
  targetUrl: string
): AgencyDeepSearchResult {
  const isRenderBlocking = issue.code === "render-blocking-resources";

  if (isRenderBlocking) {
    return {
      persona: "AGENCY",
      clientPitchNarrative: `Our speed audit reveals that critical assets are delaying initial visual presentation on ${targetUrl}. By decoupling non-essential styles and modernizing the asset pipeline for ${techStack}, we can instantly elevate the client's PageSpeed rating from the orange/red zone into the high-performing green band, delivering measurable competitive advantage.`,
      projectedScoreLift: "+18 to +28 points on Mobile PageSpeed score",
      workBreakdownStructure: [
        {
          task: "Extract critical above-the-fold CSS and inline into template layout",
          estimatedHours: 2.5,
          priority: "QUICK_WIN"
        },
        {
          task: `Refactor secondary stylesheet loading to non-blocking preload in ${techStack}`,
          estimatedHours: 2.0,
          priority: "HIGH_IMPACT"
        },
        {
          task: "Third-party script deferral and audit for unneeded tracker tags",
          estimatedHours: 3.5,
          priority: "ARCHITECTURAL"
        },
        {
          task: "Pre/post staging regression testing across iOS Safari and Android Chrome",
          estimatedHours: 1.5,
          priority: "QUICK_WIN"
        }
      ],
      totalEstimatedHours: 9.5,
      clientDeliverableSummary: `A comprehensive performance overhaul package delivering verifiable Core Web Vitals compliance, accompanied by a before-and-after executive slide deck demonstrating PageSpeed score gains.`,
      riskIfIgnored: `Persistent sub-optimal Core Web Vitals will cause Google Search algorithmic demotion relative to competing agency-optimized sites, while burning marketing ad budget through high bounce rates.`
    };
  }

  return {
    persona: "AGENCY",
    clientPitchNarrative: `Addressing '${issue.title}' represents a high-ROI sprint deliverable for ${targetUrl}. With low architectural risk in ${techStack}, this targeted optimization produces immediate visible improvements that demonstrate clear agency value.`,
    projectedScoreLift: "+10 to +16 points on PageSpeed score",
    workBreakdownStructure: [
      {
        task: `Remediate ${issue.title} according to ${techStack} performance best practices`,
        estimatedHours: 2.5,
        priority: "HIGH_IMPACT"
      },
      {
        task: "Automated verification run and client presentation report generation",
        estimatedHours: 1.0,
        priority: "QUICK_WIN"
      }
    ],
    totalEstimatedHours: 3.5,
    clientDeliverableSummary: `Targeted performance fix report with verified Lighthouse audit delta and client-ready release notes.`,
    riskIfIgnored: `Accumulated performance debt damages site credibility during client executive reviews.`
  };
}
