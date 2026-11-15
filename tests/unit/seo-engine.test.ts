import { describe, it, expect } from "vitest";
import {
  detectSearchIntent,
  GOOGLE_ALGORITHM_UPDATES,
  parseHtmlMetadata,
} from "@speedpilot/seo-engine";

describe("SEO Engine Suite — Intent Tokenizer, Diff & 4-Pillar Attribution", () => {
  it("classifies search intent correctly via RankStack tokenizer patterns", () => {
    // Navigational
    expect(detectSearchIntent("stripe login")).toBe("NAVIGATIONAL");
    expect(detectSearchIntent("speedpilot official website")).toBe("NAVIGATIONAL");
    expect(detectSearchIntent("intercom support portal")).toBe("NAVIGATIONAL");

    // Transactional
    expect(detectSearchIntent("buy cloud hosting")).toBe("TRANSACTIONAL");
    expect(detectSearchIntent("hire nextjs developer")).toBe("TRANSACTIONAL");
    expect(detectSearchIntent("speedpilot pricing quote")).toBe("TRANSACTIONAL");
    expect(detectSearchIntent("download vscode")).toBe("TRANSACTIONAL");

    // Commercial
    expect(detectSearchIntent("best pagespeed optimization tools")).toBe("COMMERCIAL");
    expect(detectSearchIntent("ahrefs vs semrush comparison")).toBe("COMMERCIAL");
    expect(detectSearchIntent("top performance audit agency")).toBe("COMMERCIAL");

    // Informational
    expect(detectSearchIntent("how to improve largest contentful paint")).toBe("INFORMATIONAL");
    expect(detectSearchIntent("what is core web vitals inp metric")).toBe("INFORMATIONAL");
  });

  it("contains chronological Google Algorithm Updates register", () => {
    expect(GOOGLE_ALGORITHM_UPDATES.length).toBeGreaterThanOrEqual(5);

    const may2026 = GOOGLE_ALGORITHM_UPDATES.find((u) => u.name.includes("May 2026"));
    expect(may2026).toBeDefined();
    expect(may2026?.type).toBe("core");
    expect(may2026?.impactAdvice).toBeDefined();

    const march2026Spam = GOOGLE_ALGORITHM_UPDATES.find((u) => u.name.includes("March 2026"));
    expect(march2026Spam).toBeDefined();
    expect(march2026Spam?.type).toBe("spam");
  });

  it("parses HTML snapshot metadata and heading structure correctly", () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SpeedPilot — AI Web Performance</title>
          <meta name="description" content="Instant PageSpeed audits and automated fixes" />
          <link rel="canonical" href="https://speedpilot.webdevwithpritom.com" />
        </head>
        <body>
          <h1>Universal Core Web Vitals Platform</h1>
          <h2>Lighthouse Synthetic Lab Benchmarking</h2>
          <h2>CrUX Real-User Telemetry Ingestion</h2>
          <h2>Automated AST Code Remediation</h2>
          <a href="/pricing">Pricing</a>
          <a href="/audits">Audits</a>
          <a href="https://external.com">External</a>
          <p>SpeedPilot optimizes your website conversions with automated intelligence.</p>
        </body>
      </html>
    `;

    const snapshot = parseHtmlMetadata(sampleHtml, "https://speedpilot.webdevwithpritom.com");

    expect(snapshot.title).toBe("SpeedPilot — AI Web Performance");
    expect(snapshot.metaDesc).toBe("Instant PageSpeed audits and automated fixes");
    expect(snapshot.canonical).toBe("https://speedpilot.webdevwithpritom.com");
    expect(snapshot.h1).toBe("Universal Core Web Vitals Platform");
    expect(snapshot.h2List.length).toBe(3);
    expect(snapshot.h2List).toContain("Lighthouse Synthetic Lab Benchmarking");
    expect(snapshot.h2List).toContain("CrUX Real-User Telemetry Ingestion");
    expect(snapshot.internalLinksCount).toBe(2);
    expect(snapshot.externalLinksCount).toBe(1);
    expect(snapshot.wordCount).toBeGreaterThan(5);
  });
});
