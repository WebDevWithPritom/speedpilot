import { describe, it, expect } from "vitest";
import { computeIssueSignature } from "../src/signature.js";
import { generateAIFixRecommendation } from "../src/generator.js";

describe("AI Fix Recommendation Engine", () => {
  it("should compute stable SHA-256 signature hashes for issue caching", () => {
    const hash1 = computeIssueSignature("render-blocking-resources", "NEXTJS", "https://example.com/main.css?v=1");
    const hash2 = computeIssueSignature("render-blocking-resources", "NEXTJS", "https://example.com/main.css?v=2");
    // Query parameters should be ignored in the hash to optimize caching
    expect(hash1).toBe(hash2);

    const hash3 = computeIssueSignature("render-blocking-resources", "WORDPRESS", "https://example.com/main.css");
    expect(hash1).not.toBe(hash3); // Different tech stack
  });

  it("should generate audience-aware recommendations in keyless template mode", async () => {
    const result = await generateAIFixRecommendation({
      targetUrl: "https://example.com",
      techStack: "NEXTJS",
      issue: {
        code: "render-blocking-resources",
        title: "Eliminate render-blocking resources",
        category: "PERFORMANCE",
        severity: "HIGH",
        displayValue: "Potential savings of 650 ms",
        evidenceItems: [
          { url: "https://example.com/styles/theme.css", wastedMs: 650, wastedBytes: 32000 },
        ],
      },
    });

    expect(result.source).toBe("DETERMINISTIC_TEMPLATE");
    expect(result.recommendation.detectedStack).toBe("NEXTJS");
    expect(result.recommendation.explanationMarketer).toBeTruthy();
    expect(result.recommendation.explanationDeveloper).toContain("Next.js");
    expect(result.recommendation.explanationAgency).toBeTruthy();
    expect(result.recommendation.explanationSaaSTeam).toBeTruthy();
    expect(result.recommendation.remediationCodeSnippet).toContain("next/font");
    expect(result.recommendation.implementationSteps.length).toBeGreaterThanOrEqual(2);
    expect(result.recommendation.verificationSteps.length).toBeGreaterThanOrEqual(1);
  });

  it("should generate WordPress-tailored code snippets for WordPress sites", async () => {
    const result = await generateAIFixRecommendation({
      targetUrl: "https://wp-store.example.com",
      techStack: "WORDPRESS",
      issue: {
        code: "render-blocking-resources",
        title: "Eliminate render-blocking resources",
        category: "PERFORMANCE",
        severity: "HIGH",
        evidenceItems: [
          { url: "https://wp-store.example.com/wp-content/themes/theme.css", wastedMs: 820 },
        ],
      },
    });

    expect(result.recommendation.detectedStack).toBe("WORDPRESS");
    expect(result.recommendation.remediationCodeSnippet).toContain("style_loader_tag");
  });
});
