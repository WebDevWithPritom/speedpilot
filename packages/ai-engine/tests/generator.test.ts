import { describe, it, expect } from "vitest";
import { computeIssueSignature } from "../src/signature.js";
import { generateAIFixRecommendation } from "../src/generator.js";
import { resolveCodeContext } from "../src/code-context.js";
import { buildProviderCandidates, inferProviderFromKey, isAllowedProviderBaseUrl, PROVIDER_DEFAULTS } from "../src/providers.js";

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

  it("should route to Groq and Ollama fallback gracefully if network is unavailable", async () => {
    const resultGroq = await generateAIFixRecommendation({
      targetUrl: "https://example.com",
      techStack: "NEXTJS",
      issue: {
        code: "render-blocking-resources",
        title: "Eliminate render-blocking resources",
        category: "PERFORMANCE",
        severity: "HIGH",
        evidenceItems: [{ url: "https://example.com/app.css" }],
      },
      provider: "GROQ",
      apiKey: "dummy_groq_key",
    });

    // When fetch fails or times out in test environment, it gracefully falls back to deterministic template
    expect(["GROQ", "DETERMINISTIC_TEMPLATE"]).toContain(resultGroq.source);
    expect(resultGroq.recommendation.detectedStack).toBe("NEXTJS");

    const resultOllama = await generateAIFixRecommendation({
      targetUrl: "https://example.com",
      techStack: "SHOPIFY",
      issue: {
        code: "render-blocking-resources",
        title: "Eliminate render-blocking resources",
        category: "PERFORMANCE",
        severity: "HIGH",
        evidenceItems: [{ url: "https://cdn.shopify.com/app.css" }],
      },
      provider: "OLLAMA",
      baseUrl: "http://127.0.0.1:9999/v1", // Unreachable port
    });

    expect(resultOllama.source).toBe("DETERMINISTIC_TEMPLATE");
    expect(resultOllama.recommendation.detectedStack).toBe("SHOPIFY");
  });

  it("should failover across AUTO candidates and return deterministic fallback cleanly when keys fail", async () => {
    const prevGroq = process.env.GROQ_API_KEY;
    const prevOllama = process.env.OLLAMA_BASE_URL;
    process.env.GROQ_API_KEY = "gsk_invalid_test_key";
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:9999/v1";

    try {
      const result = await generateAIFixRecommendation({
        targetUrl: "https://example.com",
        techStack: "NEXTJS",
        provider: "AUTO",
        issue: {
          code: "render-blocking-resources",
          title: "Eliminate render-blocking resources",
          category: "PERFORMANCE",
          severity: "HIGH",
          evidenceItems: [{ url: "https://example.com/main.css" }],
        },
      });
      expect(result.recommendation.detectedStack).toBe("NEXTJS");
      expect(result.recommendation.implementationSteps.length).toBeGreaterThanOrEqual(2);
    } finally {
      if (prevGroq === undefined) delete process.env.GROQ_API_KEY;
      else process.env.GROQ_API_KEY = prevGroq;
      if (prevOllama === undefined) delete process.env.OLLAMA_BASE_URL;
      else process.env.OLLAMA_BASE_URL = prevOllama;
    }
  });

  it("should generate concrete preload, preconnect, and prefetch tags for Lighthouse 13 insights using real evidence URLs", async () => {
    const netResult = await generateAIFixRecommendation({
      targetUrl: "https://webdevwithpritom.com/",
      techStack: "CUSTOM",
      issue: {
        code: "network-dependency-tree-insight",
        title: "Network dependency tree",
        category: "PERFORMANCE",
        severity: "CRITICAL",
        evidenceItems: [
          { url: "https://fonts.googleapis.com/css2?family=Inter", wastedMs: 420 },
          { url: "https://cdn.example.com/app.js", wastedMs: 310 },
        ],
      },
    });

    expect(netResult.recommendation.remediationCodeSnippet).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
    expect(netResult.recommendation.remediationCodeSnippet).toContain('rel="preload" href="https://fonts.googleapis.com/css2?family=Inter"');
    expect(netResult.recommendation.remediationCodeSnippet).toContain('rel="prefetch"');

    const fontResult = await generateAIFixRecommendation({
      targetUrl: "https://webdevwithpritom.com/",
      techStack: "CUSTOM",
      issue: {
        code: "font-display-insight",
        title: "Font display",
        category: "PERFORMANCE",
        severity: "HIGH",
        evidenceItems: [{ url: "https://webdevwithpritom.com/fonts/inter.woff2", wastedMs: 290 }],
      },
    });

    expect(fontResult.recommendation.remediationCodeSnippet).toContain('href="https://webdevwithpritom.com/fonts/inter.woff2" as="font"');
    expect(fontResult.recommendation.remediationCodeSnippet).toContain("font-display: swap;");

    const firstPartyJsNet = await generateAIFixRecommendation({
      targetUrl: "https://webdevwithpritom.com/",
      techStack: "WORDPRESS",
      issue: {
        code: "render-blocking-insight",
        title: "Render blocking requests",
        category: "PERFORMANCE",
        severity: "CRITICAL",
        evidenceItems: [
          { url: "https://webdevwithpritom.com/wp-content/cache/app.js", wastedMs: 750 },
          { url: "https://webdevwithpritom.com/wp-content/cache/style.css", wastedMs: 400 },
        ],
      },
    });
    expect(firstPartyJsNet.recommendation.remediationCodeSnippet).toContain('<script src="https://webdevwithpritom.com/wp-content/cache/app.js" defer></script>');
    expect(firstPartyJsNet.recommendation.remediationCodeSnippet).toContain('href="https://webdevwithpritom.com/wp-content/cache/style.css" as="style"');
  });

  it("should split 1st-party vs 3rd-party cache rules, surface plugin hints, and validate pasted/GitHub context", async () => {
    const cacheRes = await generateAIFixRecommendation({
      targetUrl: "https://webdevwithpritom.com/",
      techStack: "WORDPRESS",
      subStacks: ["LiteSpeed Cache", "Cloudflare CDN"],
      issue: {
        code: "cache-insight",
        title: "Use efficient cache lifetimes",
        category: "PERFORMANCE",
        severity: "CRITICAL",
        evidenceItems: [
          { url: "https://webdevwithpritom.com/wp-content/litespeed/css/a.css", wastedBytes: 12000 },
          { url: "https://www.googletagmanager.com/gtag/js?id=G-123", wastedBytes: 45000 },
        ],
      },
    });
    expect(cacheRes.recommendation.remediationCodeSnippet).toContain("Cloudflare");
    expect(cacheRes.recommendation.remediationCodeSnippet).toContain("Third-party URLs (1 external) CANNOT be fixed in your server .htaccess");

    const pasted = await resolveCodeContext({ pastedCode: "<head><link rel='stylesheet' href='/a.css'></head>", filename: "header.php" });
    expect(pasted.sourceOrigin).toBe("PASTED");
    expect(pasted.sourceFilename).toBe("header.php");

    const blockedSsrf = await resolveCodeContext({ githubUrl: "http://169.254.169.254/latest/meta-data" });
    expect(blockedSsrf.sourceOrigin).toBe("NONE");

    const cssRes = await generateAIFixRecommendation({
      targetUrl: "https://webdevwithpritom.com/",
      techStack: "WORDPRESS",
      subStacks: ["LiteSpeed Cache"],
      issue: {
        code: "unused-css-rules",
        title: "Reduce unused CSS",
        category: "PERFORMANCE",
        severity: "HIGH",
        evidenceItems: [{ url: "https://webdevwithpritom.com/wp-content/litespeed/css/a.css", wastedBytes: 24000 }],
      },
    });
    expect(cssRes.recommendation.remediationCodeSnippet).toContain("LiteSpeed Cache");
    expect(cssRes.recommendation.remediationCodeSnippet).toContain("https://webdevwithpritom.com/wp-content/litespeed/css/a.css");

    const altRes = await generateAIFixRecommendation({
      targetUrl: "https://webdevwithpritom.com/",
      techStack: "WORDPRESS",
      issue: {
        code: "missing-image-alt",
        title: "Images missing alt",
        category: "SEO",
        severity: "HIGH",
        evidenceItems: [{ url: "https://webdevwithpritom.com/img/logo.webp" }],
      },
    });
    expect(altRes.recommendation.remediationCodeSnippet).toContain('alt="Concise description of the image"');

    expect(inferProviderFromKey("csk-test123")).toBe("CEREBRAS");
    expect(inferProviderFromKey("sk-or-v1-abc")).toBe("OPENROUTER");
    expect(inferProviderFromKey("nvapi-xyz")).toBe("NVIDIA");
    expect(inferProviderFromKey("github_pat_xyz")).toBe("GITHUB");
    expect(PROVIDER_DEFAULTS.OPENROUTER?.model).toBe("openrouter/free");
    expect(isAllowedProviderBaseUrl("http://169.254.169.254/latest/meta-data", "CUSTOM")).toBe(false);
    expect(isAllowedProviderBaseUrl("https://api.groq.com/openai/v1", "CUSTOM")).toBe(true);

    const prevCerebras = process.env.CEREBRAS_API_KEY;
    const prevOpenRouter = process.env.OPENROUTER_API_KEY;
    process.env.CEREBRAS_API_KEY = "csk-test";
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    try {
      const candidates = buildProviderCandidates({ provider: "AUTO" });
      const providers = candidates.map((c) => c.provider);
      expect(providers).toContain("CEREBRAS");
      expect(providers).toContain("OPENROUTER");
    } finally {
      if (prevCerebras === undefined) delete process.env.CEREBRAS_API_KEY;
      else process.env.CEREBRAS_API_KEY = prevCerebras;
      if (prevOpenRouter === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = prevOpenRouter;
    }
  });
});

