import { describe, it, expect } from "vitest";
import { executeDeepSearch } from "../src/deep-search/orchestrator.js";

describe("Multi-Persona AI Deep Search Engine", () => {
  const sampleIssue = {
    code: "render-blocking-resources",
    title: "Eliminate render-blocking resources",
    category: "PERFORMANCE" as const,
    severity: "HIGH" as const,
    displayValue: "Potential savings of 750 ms",
    evidenceItems: [
      { url: "https://example.com/assets/bundle.css", wastedMs: 750, wastedBytes: 64000 },
    ],
  };

  it("should generate all 4 persona deep search results in deterministic mode", async () => {
    const result = await executeDeepSearch({
      targetUrl: "https://next-app.example.com",
      techStack: "NEXTJS",
      issue: sampleIssue,
      persona: "ALL",
    });

    expect(result.source).toBe("DETERMINISTIC_SEARCH_ENGINE");
    expect(result.targetUrl).toBe("https://next-app.example.com");
    expect(result.techStack).toBe("NEXTJS");
    expect(result.issueCode).toBe("render-blocking-resources");

    // Developer persona
    expect(result.developer).toBeDefined();
    expect(result.developer?.persona).toBe("DEVELOPER");
    expect(result.developer?.remediationDiff).toContain("next/font");
    expect(result.developer?.bundlerConfigPatch).toContain("nextConfig");
    expect(result.developer?.cliVerificationCommand).toContain("lighthouse");
    expect(result.developer?.estimatedDevMinutes).toBeGreaterThan(0);

    // Marketer persona
    expect(result.marketer).toBeDefined();
    expect(result.marketer?.persona).toBe("MARKETER");
    expect(result.marketer?.serpRankRisk).toBe("HIGH");
    expect(result.marketer?.projectedBounceRateDelta).toContain("bounce");
    expect(result.marketer?.estimatedConversionUplift).toContain("conversion");
    expect(result.marketer?.executiveBulletPoints.length).toBeGreaterThan(1);

    // Agency persona
    expect(result.agency).toBeDefined();
    expect(result.agency?.persona).toBe("AGENCY");
    expect(result.agency?.projectedScoreLift).toContain("points");
    expect(result.agency?.workBreakdownStructure.length).toBeGreaterThan(2);
    expect(result.agency?.totalEstimatedHours).toBeGreaterThan(0);

    // SaaS Team persona
    expect(result.saasTeam).toBeDefined();
    expect(result.saasTeam?.persona).toBe("SAAS_TEAM");
    expect(result.saasTeam?.performanceBudgetRule.enforcementAction).toBe("BLOCK_PR");
    expect(result.saasTeam?.ciConfigSnippet).toContain("assertions");
    expect(result.saasTeam?.sprintTicket.acceptanceCriteria.length).toBeGreaterThan(2);
  });

  it("should generate specific persona output when targeted", async () => {
    const result = await executeDeepSearch({
      targetUrl: "https://shopify-store.example.com",
      techStack: "SHOPIFY",
      issue: sampleIssue,
      persona: "MARKETER",
    });

    expect(result.marketer).toBeDefined();
    expect(result.developer).toBeUndefined();
    expect(result.agency).toBeUndefined();
    expect(result.saasTeam).toBeUndefined();
    expect(result.marketer?.plainEnglishSummary).toContain("blank screen");
  });

  it("should generate WordPress-tailored developer deep search outputs", async () => {
    const result = await executeDeepSearch({
      targetUrl: "https://wp-site.example.com",
      techStack: "WORDPRESS",
      issue: sampleIssue,
      persona: "DEVELOPER",
    });

    expect(result.developer).toBeDefined();
    expect(result.developer?.detectedStack).toBe("WORDPRESS");
    expect(result.developer?.remediationDiff).toContain("style_loader_tag");
    expect(result.developer?.bundlerConfigPatch).toContain(".htaccess");
    expect(result.developer?.cliVerificationCommand).toContain("wp-scripts");
  });

  it("should generate SaaS CI/CD performance budget for LCP element audits", async () => {
    const result = await executeDeepSearch({
      targetUrl: "https://saas-dashboard.example.com",
      techStack: "REACT",
      issue: {
        code: "largest-contentful-paint-element",
        title: "Largest Contentful Paint element",
        category: "PERFORMANCE",
        severity: "HIGH",
        evidenceItems: [{ url: "https://saas-dashboard.example.com/banner.png", wastedMs: 1200 }],
      },
      persona: "SAAS_TEAM",
    });

    expect(result.saasTeam).toBeDefined();
    expect(result.saasTeam?.slaBreachRisk).toBe("MODERATE");
    expect(result.saasTeam?.sprintTicket.title).toContain("[PERF-DEBT]");
  });
});
