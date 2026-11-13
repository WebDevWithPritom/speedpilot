import { SingleDevice, NormalizedAuditIssue } from "@speedpilot/shared";
import { ParsedPageSpeedResult } from "./types.js";

/**
 * 32-bit FNV-1a hash with bit mixing for maximum avalanche effect.
 * Guarantees that two URLs with 99% identical prefixes (e.g. /blog/ghost-review vs /blog/ghost-pricing)
 * generate completely uncorrelated pseudo-random seeds.
 */
function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return Math.abs(h);
}

/**
 * Catalog of realistic Lighthouse diagnostic audits.
 */
interface DiagnosticTemplate {
  code: string;
  title: string;
  category: "PERFORMANCE" | "ACCESSIBILITY" | "BEST_PRACTICES" | "SEO";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  formatDisplay: (wastedMs: number, wastedKb: number) => string;
  generateEvidence: (domain: string, wastedMs: number, wastedKb: number) => NormalizedAuditIssue["evidenceItems"];
}

const simEvidenceNote = (domain: string, assetType: string) =>
  `${domain} [Simulated ${assetType} — live Google PSI unavailable]`;

const DIAGNOSTIC_LIBRARY: DiagnosticTemplate[] = [
  {
    code: "render-blocking-resources",
    title: "Eliminate render-blocking resources",
    category: "PERFORMANCE",
    severity: "HIGH",
    formatDisplay: (ms) => `Potential savings of ${ms} ms (Simulated)`,
    generateEvidence: (domain, ms, kb) => [
      { url: simEvidenceNote(domain, "CSS/JS bundle"), wastedMs: Math.round(ms * 0.65), wastedBytes: Math.round(kb * 0.45 * 1024) },
    ],
  },
  {
    code: "unused-javascript",
    title: "Reduce unused JavaScript",
    category: "PERFORMANCE",
    severity: "HIGH",
    formatDisplay: (_, kb) => `Potential savings of ${kb} KB (Simulated)`,
    generateEvidence: (domain, _, kb) => [
      { url: simEvidenceNote(domain, "JS bundle"), wastedBytes: Math.round(kb * 1024) },
    ],
  },
  {
    code: "modern-image-formats",
    title: "Serve images in next-gen formats (WebP or AVIF)",
    category: "PERFORMANCE",
    severity: "MEDIUM",
    formatDisplay: (_, kb) => `Potential savings of ${kb} KB (Simulated)`,
    generateEvidence: (domain, _, kb) => [
      { url: simEvidenceNote(domain, "Image asset"), wastedBytes: Math.round(kb * 1024) },
    ],
  },
  {
    code: "offscreen-images",
    title: "Defer offscreen images",
    category: "PERFORMANCE",
    severity: "MEDIUM",
    formatDisplay: (_, kb) => `Potential savings of ${kb} KB (Simulated)`,
    generateEvidence: (domain, _, kb) => [
      { url: simEvidenceNote(domain, "Offscreen image"), wastedBytes: Math.round(kb * 1024) },
    ],
  },
  {
    code: "uses-text-compression",
    title: "Enable text compression (gzip, deflate or Brotli)",
    category: "PERFORMANCE",
    severity: "HIGH",
    formatDisplay: (_, kb) => `Potential savings of ${kb} KB (Simulated)`,
    generateEvidence: (domain, _, kb) => [
      { url: simEvidenceNote(domain, "Text response"), wastedBytes: Math.round(kb * 1024) },
    ],
  },
  {
    code: "total-byte-weight",
    title: "Avoid enormous network payloads",
    category: "PERFORMANCE",
    severity: "MEDIUM",
    formatDisplay: (_, kb) => `Total payload was ${(kb / 1024 + 1.2).toFixed(1)} MB (Simulated)`,
    generateEvidence: (domain, _, kb) => [
      { url: simEvidenceNote(domain, "Media payload"), wastedBytes: Math.round((kb + 800) * 1024) },
    ],
  },
  {
    code: "font-display",
    title: "Ensure text remains visible during webfont load",
    category: "PERFORMANCE",
    severity: "LOW",
    formatDisplay: (ms) => `Savings of ${Math.round(ms * 0.4)} ms (Simulated)`,
    generateEvidence: (domain) => [
      { url: simEvidenceNote(domain, "Webfont"), wastedMs: 140 },
    ],
  },
  {
    code: "uses-responsive-images",
    title: "Properly size images",
    category: "PERFORMANCE",
    severity: "MEDIUM",
    formatDisplay: (_, kb) => `Potential savings of ${kb} KB (Simulated)`,
    generateEvidence: (domain, _, kb) => [
      { url: simEvidenceNote(domain, "Responsive image"), wastedBytes: Math.round(kb * 1024) },
    ],
  },
  {
    code: "server-response-time",
    title: "Reduce initial server response time (TTFB)",
    category: "PERFORMANCE",
    severity: "HIGH",
    formatDisplay: (ms) => `Root document took ${ms + 420} ms to respond (Simulated)`,
    generateEvidence: (domain, ms) => [
      { url: domain, wastedMs: ms + 420 },
    ],
  },
  {
    code: "unminified-javascript",
    title: "Minify JavaScript",
    category: "PERFORMANCE",
    severity: "LOW",
    formatDisplay: (_, kb) => `Potential savings of ${Math.round(kb * 0.4)} KB (Simulated)`,
    generateEvidence: (domain, _, kb) => [
      { url: simEvidenceNote(domain, "Unminified script"), wastedBytes: Math.round(kb * 0.4 * 1024) },
    ],
  },
];

/**
 * Generates realistic, diverse, deterministic metrics and audit issues for local testing and dry-run demonstrations
 * when Google API keys are not yet configured or when Google rate-limits (HTTP 429).
 */
export function generateDryRunSimulation(url: string, device: SingleDevice): ParsedPageSpeedResult {
  const hash = hashString(url);
  const isMobile = device === "MOBILE";

  let domain = "https://example.com";
  try {
    const parsed = new URL(url);
    domain = parsed.origin;
  } catch {
    // Keep fallback
  }

  // Derive distinct entropy seeds from different byte ranges of the hash
  const seedA = hash % 1000;
  const seedB = Math.floor(hash / 1000) % 1000;
  const seedC = Math.floor(hash / 1000000) % 1000;
  const seedD = (hash ^ (hash >>> 11)) % 1000;

  // Archetype distribution: 4 speed tiers to create realistic variation across site pages
  // Tier 0: Heavy/Slow (15% of pages)
  // Tier 1: Moderate/Needs Optimization (35% of pages)
  // Tier 2: Good/Performant (35% of pages)
  // Tier 3: Exceptional (15% of pages)
  const tier = seedA % 10;
  let basePerf = 75;
  let perfVariance = 12;

  if (tier < 2) {
    // Slow / bloated page
    basePerf = isMobile ? 44 : 58;
    perfVariance = 16;
  } else if (tier < 5) {
    // Moderate page
    basePerf = isMobile ? 62 : 74;
    perfVariance = 14;
  } else if (tier < 8) {
    // Good page
    basePerf = isMobile ? 76 : 86;
    perfVariance = 10;
  } else {
    // Fast page
    basePerf = isMobile ? 88 : 94;
    perfVariance = 6;
  }

  const performanceScore = Math.max(28, Math.min(100, basePerf + ((seedB % (perfVariance * 2)) - perfVariance)));
  const accessibilityScore = Math.max(68, Math.min(100, 84 + ((seedC % 26) - 10)));
  const bestPracticesScore = Math.max(70, Math.min(100, 86 + ((seedD % 24) - 8)));
  const seoScore = Math.max(64, Math.min(100, 88 + (((seedA + seedB) % 24) - 10)));

  // Lab Core Web Vitals strictly correlated to performance score
  // Low score (< 60) -> high LCP (3.8s - 5.5s)
  // Mid score (60 - 80) -> mid LCP (2.2s - 3.6s)
  // High score (> 80) -> fast LCP (1.1s - 2.1s)
  let lcpMs = 2200;
  if (performanceScore < 60) {
    lcpMs = 3800 + (seedC % 1600);
  } else if (performanceScore < 80) {
    lcpMs = 2200 + (seedC % 1400);
  } else {
    lcpMs = 1100 + (seedC % 950);
  }

  if (isMobile) {
    lcpMs = Math.round(lcpMs * 1.35); // Mobile CPU throttling
  }

  const fcpMs = Math.round(lcpMs * (0.42 + (seedD % 18) / 100));
  const tbtMs = isMobile
    ? Math.max(40, Math.round((100 - performanceScore) * 8 + (seedA % 150)))
    : Math.max(10, Math.round((100 - performanceScore) * 2.2 + (seedA % 60)));

  // CLS variation
  let cls = 0.02;
  if (seedB % 4 === 0) {
    cls = parseFloat((0.12 + (seedC % 14) / 100).toFixed(3)); // Poor CLS
  } else if (seedB % 3 === 0) {
    cls = parseFloat((0.05 + (seedC % 5) / 100).toFixed(3)); // Moderate CLS
  } else {
    cls = parseFloat((0.005 + (seedC % 35) / 1000).toFixed(3)); // Good CLS
  }

  const speedIndexMs = Math.round(lcpMs * (0.75 + (seedA % 25) / 100));

  // Chrome UX Report Field Data Simulation (65% of URLs have field data)
  const hasCrUXFieldData = seedC % 10 < 7;
  let cruxFieldData: ParsedPageSpeedResult["cruxFieldData"] = {
    scope: "UNAVAILABLE",
    lcpValueMs: null,
    lcpCategory: null,
    inpValueMs: null,
    inpCategory: null,
    clsValue: null,
    clsCategory: null,
    collectionPeriod: "No 28-day CrUX field telemetry recorded for this specific URL",
  };

  if (hasCrUXFieldData) {
    const isUrlScope = seedD % 2 === 0;
    const fieldInp = isMobile ? 110 + (seedB % 160) : 60 + (seedB % 90);
    const fieldLcp = Math.round(lcpMs * (0.85 + (seedA % 20) / 100));
    const fieldCls = Math.max(0.01, parseFloat((cls * 0.9).toFixed(3)));

    cruxFieldData = {
      scope: isUrlScope ? "URL" : "ORIGIN",
      lcpValueMs: fieldLcp,
      lcpCategory: fieldLcp <= 2500 ? "GOOD" : fieldLcp <= 4000 ? "NEEDS_IMPROVEMENT" : "POOR",
      inpValueMs: fieldInp,
      inpCategory: fieldInp <= 200 ? "GOOD" : fieldInp <= 500 ? "NEEDS_IMPROVEMENT" : "POOR",
      clsValue: fieldCls,
      clsCategory: fieldCls <= 0.1 ? "GOOD" : fieldCls <= 0.25 ? "NEEDS_IMPROVEMENT" : "POOR",
      collectionPeriod: "Previous 28-day collection period (Chrome UX Report)",
    };
  }

  // Select 2 to 4 distinct issues from the diagnostic library tailored to this page's score
  const issuesCount = performanceScore > 85 ? 2 : performanceScore > 65 ? 3 : 4;
  const startIndex = seedA % DIAGNOSTIC_LIBRARY.length;
  const selectedIssues: NormalizedAuditIssue[] = [];

  for (let i = 0; i < issuesCount; i++) {
    const templateIndex = (startIndex + i * 2) % DIAGNOSTIC_LIBRARY.length;
    const template = DIAGNOSTIC_LIBRARY[templateIndex]!;

    const wastedMs = isMobile ? 280 + ((seedB + i * 80) % 520) : 120 + ((seedB + i * 40) % 280);
    const wastedKb = 85 + ((seedC + i * 110) % 480);

    selectedIssues.push({
      code: template.code,
      title: template.title,
      category: template.category,
      severity: template.severity,
      displayValue: template.formatDisplay(wastedMs, wastedKb),
      score: parseFloat((0.25 + ((seedD + i * 15) % 55) / 100).toFixed(2)),
      evidenceItems: template.generateEvidence(domain, wastedMs, wastedKb),
    });
  }

  // Agentic Browsing simulation
  const agenticPassed = seedA % 3 === 0 ? 2 : 1;
  const agenticBrowsing = agenticPassed === 2 ? 100 : 50;
  const agenticRatio = `${agenticPassed}/2`;

  if (agenticPassed === 1) {
    selectedIssues.push({
      code: "agent-accessibility-tree",
      title: "Accessibility tree is not well-formed",
      category: "ACCESSIBILITY",
      severity: "MEDIUM",
      displayValue: "Failing accessibility elements for AI agents",
      score: 0.5,
      evidenceItems: [
        {
          description: "Links must have discernible text",
          selector: "div.row > div.col-md-12 > div.logo > a",
          snippet: `<a href="${domain}">`,
        },
        {
          description: "Select element must have an accessible name",
          nodeLabel: "中文 Deutsch English",
          selector: "div.footer > div.lang-select > select.pll-dropdown",
          snippet: `<select class="pll-dropdown" onchange="if(this.value) window.location.href=this.value;">`,
        },
      ],
    });
  }

  return {
    url,
    device,
    scores: {
      performance: performanceScore,
      accessibility: accessibilityScore,
      bestPractices: bestPracticesScore,
      seo: seoScore,
      agenticBrowsing,
      agenticRatio,
    },
    labMetrics: {
      fcpMs,
      lcpMs,
      tbtMs,
      cls,
      speedIndexMs,
    },
    cruxFieldData,
    issues: selectedIssues,
    rawExecutionTimeMs: 1200 + (seedA % 800),
  };
}
