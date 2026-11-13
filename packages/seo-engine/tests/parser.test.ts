import { describe, it, expect } from "vitest";
import { inspectHtmlSEO } from "../src/parser.js";

describe("Technical SEO Static HTML Parser", () => {
  const validHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>SpeedPilot — High Performance Intelligence Platform</title>
      <meta name="description" content="Audit Core Web Vitals, discover technical SEO issues, and generate framework-tailored code optimizations.">
      <link rel="canonical" href="https://example.com/platform">
      <meta name="robots" content="index, follow">
      <meta property="og:title" content="SpeedPilot Intelligence">
      <script type="application/ld+json">
        { "@context": "https://schema.org", "@type": "SoftwareApplication", "name": "SpeedPilot" }
      </script>
    </head>
    <body>
      <h1>Universal Website Performance Intelligence</h1>
      <img src="/hero.png" alt="Platform Dashboard Preview">
      <img src="/logo.svg" alt="Company Logo">
    </body>
    </html>
  `;

  it("should extract title, description, and canonical successfully", () => {
    const res = inspectHtmlSEO(validHtml, "https://example.com/platform");
    expect(res.seoData.pageTitle).toBe("SpeedPilot — High Performance Intelligence Platform");
    expect(res.seoData.titleLength).toBe(51);
    expect(res.seoData.metaDescription).toContain("Audit Core Web Vitals");
    expect(res.seoData.canonicalUrl).toBe("https://example.com/platform");
    expect(res.seoData.isCanonicalMatch).toBe(true);
    expect(res.seoData.h1Count).toBe(1);
    expect(res.seoData.h1Text).toBe("Universal Website Performance Intelligence");
    expect(res.seoData.missingAltImagesCount).toBe(0);
    expect(res.seoData.hasOpenGraph).toBe(true);
    expect(res.seoData.hasStructuredData).toBe(true);
    expect(res.issues).toHaveLength(0); // Clean page
  });

  it("should identify missing title and missing H1 as issues", () => {
    const brokenHtml = `
      <html>
      <head></head>
      <body>
        <p>No headings here</p>
        <img src="/badge.png">
      </body>
      </html>
    `;
    const res = inspectHtmlSEO(brokenHtml, "https://example.com");
    expect(res.seoData.pageTitle).toBeNull();
    expect(res.seoData.h1Count).toBe(0);
    expect(res.seoData.missingAltImagesCount).toBe(1);

    const issueCodes = res.issues.map((i) => i.code);
    expect(issueCodes).toContain("missing-page-title");
    expect(issueCodes).toContain("missing-meta-description");
    expect(issueCodes).toContain("missing-canonical");
    expect(issueCodes).toContain("missing-h1");
    expect(issueCodes).toContain("missing-image-alt");
  });

  it("should flag noindex robots directive", () => {
    const noindexHtml = `
      <html>
      <head>
        <title>Staging Environment Preview Site</title>
        <meta name="robots" content="noindex, nofollow">
      </head>
      <body><h1>Staging</h1></body>
      </html>
    `;
    const res = inspectHtmlSEO(noindexHtml, "https://staging.example.com");
    expect(res.seoData.robotsDirectives).toBe("noindex, nofollow");
    expect(res.issues.some((i) => i.code === "page-noindex")).toBe(true);
  });
});
