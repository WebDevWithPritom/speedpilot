import {
  AIRecommendationOutput,
  TechStack,
  NormalizedAuditIssue,
} from "@speedpilot/shared";
import { getDeterministicRecommendation } from "./templates.js";
import { computeIssueSignature } from "./signature.js";
import { AIProvider, PROVIDER_DEFAULTS, buildProviderCandidates } from "./providers.js";
import { detectVendorSignatures } from "./vendor-intelligence.js";

export type { AIProvider };

export interface AIRecommendationRequest {
  targetUrl: string;
  techStack: TechStack;
  issue: NormalizedAuditIssue;
  apiKey?: string;
  provider?: AIProvider;
  baseUrl?: string;
  model?: string;
  subStacks?: string[];
  existingHints?: string[];
  responseHeaders?: {
    cacheControl?: string;
    contentEncoding?: string;
    server?: string;
  };
  sourceCode?: string;
  sourceFilename?: string;
}

export interface GeneratedRecommendationResult {
  signature: string;
  recommendation: AIRecommendationOutput;
  source: Exclude<AIProvider, "AUTO"> | "DETERMINISTIC_TEMPLATE";
  promptTokens?: number;
  completionTokens?: number;
}

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  }
  return cleaned.trim();
}

function asCleanString(val: unknown, fallback: string): string {
  if (typeof val === "string" && val.trim().length > 0) return val.trim();
  if (Array.isArray(val)) return val.map((x) => String(x)).join("\n").trim() || fallback;
  return fallback;
}

function asStringArray(val: unknown, fallback: string[]): string[] {
  if (Array.isArray(val) && val.length > 0) return val.map((x) => String(x));
  return fallback;
}

function mapParsedRecommendation(
  parsed: Partial<AIRecommendationOutput>,
  baseline: AIRecommendationOutput,
  issueCode: string
): AIRecommendationOutput {
  let snippet = asCleanString(parsed.remediationCodeSnippet, baseline.remediationCodeSnippet ?? "");
  let devExplanation = asCleanString(parsed.explanationDeveloper, baseline.explanationDeveloper ?? "");

  // Prevent small local models from confusing cache issues with <link rel="preload">
  if (
    (issueCode === "cache-insight" || issueCode === "uses-long-cache-ttl") &&
    !/cache-control|expires|max-age|cdn|cloudflare|htaccess|nginx/i.test(snippet)
  ) {
    snippet = baseline.remediationCodeSnippet ?? "";
    devExplanation = baseline.explanationDeveloper ?? "";
  }

  const validDiff = parsed.estimatedDifficulty === "EASY" || parsed.estimatedDifficulty === "MEDIUM" || parsed.estimatedDifficulty === "HARD";
  const validImpact = parsed.estimatedImpact === "LOW" || parsed.estimatedImpact === "MEDIUM" || parsed.estimatedImpact === "HIGH";

  return {
    detectedStack: parsed.detectedStack || baseline.detectedStack,
    explanationMarketer: asCleanString(parsed.explanationMarketer, baseline.explanationMarketer ?? ""),
    explanationDeveloper: devExplanation,
    explanationAgency: asCleanString(parsed.explanationAgency, baseline.explanationAgency ?? ""),
    explanationSaaSTeam: asCleanString(parsed.explanationSaaSTeam, baseline.explanationSaaSTeam ?? ""),
    remediationCodeSnippet: snippet,
    implementationSteps: asStringArray(parsed.implementationSteps, baseline.implementationSteps),
    verificationSteps: asStringArray(parsed.verificationSteps, baseline.verificationSteps),
    estimatedDifficulty: validDiff ? parsed.estimatedDifficulty! : baseline.estimatedDifficulty,
    estimatedImpact: validImpact ? parsed.estimatedImpact! : baseline.estimatedImpact,
  };
}

/**
 * Generates audience-aware fix suggestions and remediation code for an audit issue.
 */
export async function generateAIFixRecommendation(
  req: AIRecommendationRequest
): Promise<GeneratedRecommendationResult> {
  const primaryResource = req.issue.evidenceItems[0]?.url;
  const wastedMs = req.issue.evidenceItems[0]?.wastedMs;
  const signature = computeIssueSignature(req.issue.code, req.techStack, primaryResource);
  const candidates = buildProviderCandidates(req);
  const ctxOpts = {
    targetUrl: req.targetUrl,
    subStacks: req.subStacks,
    existingHints: req.existingHints,
    responseHeaders: req.responseHeaders,
    sourceCode: req.sourceCode,
    sourceFilename: req.sourceFilename,
  };
  const baseline = getDeterministicRecommendation(
    req.issue.code,
    req.techStack,
    primaryResource,
    wastedMs,
    req.issue.evidenceItems,
    ctxOpts
  );

  if (candidates.length === 0) {
    return {
      signature,
      recommendation: baseline,
      source: "DETERMINISTIC_TEMPLATE",
      promptTokens: 0,
      completionTokens: 0,
    };
  }

  let targetOrigin = "";
  try {
    targetOrigin = new URL(req.targetUrl).origin;
  } catch {
    targetOrigin = "";
  }
  const evidenceSlice = req.issue.evidenceItems.slice(0, 8);
  const evidenceUrls = evidenceSlice.map((e) => e.url).filter((u): u is string => Boolean(u));
  const detectedVendors = detectVendorSignatures(evidenceUrls);

  const firstPartyUrls = evidenceSlice
    .map((e) => e.url)
    .filter((u): u is string => Boolean(u && (!targetOrigin || u.startsWith("/") || u.startsWith(targetOrigin))));
  const thirdPartyUrls = evidenceSlice
    .map((e) => e.url)
    .filter((u): u is string => Boolean(u && targetOrigin && u.startsWith("http") && !u.startsWith(targetOrigin)));

  // Build compact evidence payload (< 8KB with optional source snippet)
  const evidencePayload = {
    targetUrl: req.targetUrl,
    detectedTechStack: req.techStack,
    detectedPluginsAndCDN: req.subStacks || [],
    existingHeadHints: req.existingHints || [],
    responseHeaders: req.responseHeaders || {},
    detectedVendors: detectedVendors.map((v) => ({
      vendorName: v.vendorName,
      category: v.category,
      flaggedUrl: v.flaggedUrl,
      impact: v.impactDescription,
    })),
    firstPartyUrls,
    thirdPartyUrls,
    recommendedFixBaseline: {
      explanationDeveloper: baseline.explanationDeveloper,
      remediationCodeSnippet: baseline.remediationCodeSnippet,
    },
    ...(req.sourceCode ? { userSourceFile: req.sourceFilename || "snippet", userSourceCode: req.sourceCode.slice(0, 4500) } : {}),
    issue: {
      code: req.issue.code,
      title: req.issue.title,
      severity: req.issue.severity,
      displayValue: req.issue.displayValue,
      score: req.issue.score,
      evidenceItems: evidenceSlice,
    },
  };

  const systemPrompt = `You are SpeedPilot's Principal Web Performance & Systems Architect.
Your task is to transform Google PageSpeed Insights (Lighthouse 13) diagnostic evidence into ACTUAL, PRODUCTION-READY SOLUTIONS.

CRITICAL INSTRUCTION - NO GENERIC OR TEXTBOOK ADVICE:
1. NEVER output vague generic advice like "Optimize your images", "Minimize CSS", "Use a CDN", "Defer unneeded scripts", or "Consider code splitting".
2. Every fix MUST contain the EXACT filenames, URLs, CSS selectors, or component names found in the audit evidence.
3. Every code snippet MUST be valid, copy-pasteable code matching the detected tech stack (${req.techStack}):
   - If NEXTJS: Use Next.js idioms: 'next/image' (<Image src="..." fill/width/height priority/sizes="..."/>), 'next/font' (subsets, display:'swap'), '@next/third-parties' (<GoogleTagManager/>, <GoogleAnalytics/>), 'next/dynamic' ({ ssr: false }), or 'next/script' (strategy="lazyOnload" or "worker").
   - If WORDPRESS / WOOCOMMERCE: Provide exact PHP filters ('add_filter("style_loader_tag", ...)', 'add_filter("script_loader_tag", ...)') or exact LiteSpeed Cache / WP Rocket setting paths.
   - If SHOPIFY: Provide exact Liquid theme code for 'layout/theme.liquid' using 'asset_url | preload_tag', async attributes, or section rendering.
   - If REACT / VITE: Provide exact 'vite.config.ts' (manualChunks / rollupOptions) or React.lazy / Suspense / web worker patterns.
   - If HTML / PHP / LARAVEL: Provide exact <head> tags, Apache '.htaccess' rules, or Nginx server blocks.
4. If third-party tracking scripts are detected (GTM, Meta Pixel, Hotjar, Intercom, Clarity, TikTok, YouTube embeds): Provide the exact Facade Pattern (load on interaction or idle) rather than executing upfront on page load.
5. If userSourceCode is provided, patch those exact lines and show the modified code block.
6. Only suggest <link rel="preconnect"> for thirdPartyUrls (NEVER for targetUrl's own domain).

OUTPUT SCHEMA (Strict JSON only, no markdown outside JSON):
{
  "detectedStack": "${req.techStack}",
  "explanationMarketer": "Plain-English business impact: how this specific bottleneck increases bounce rates, hurts Google organic ranking, and lowers conversions.",
  "explanationDeveloper": "Exact technical root cause naming the specific flagged file, asset URL, or CSS selector, why the browser pipeline stalled, and the exact modern standard rule to fix it.",
  "explanationAgency": "Client-facing pitch emphasizing measurable PageSpeed score gains, billable ROI, and risk if ignored.",
  "explanationSaaSTeam": "Engineering guidance: Lighthouse CI budget assertions, PR gating threshold, and synthetic vs RUM monitoring.",
  "remediationCodeSnippet": "Working, copy-pasteable production code for ${req.techStack} using the actual URLs/selectors from evidence.",
  "implementationSteps": [
    "Step 1: Specific action with exact file name or setting",
    "Step 2: Specific code modification",
    "Step 3: Asset rebuild or cache purge"
  ],
  "verificationSteps": [
    "Step 1: Exact DevTools Network or Performance tab check",
    "Step 2: CLI verification command or SpeedPilot re-audit threshold"
  ],
  "estimatedDifficulty": "EASY" | "MEDIUM" | "HARD",
  "estimatedImpact": "LOW" | "MEDIUM" | "HIGH"
}`;

  // Try candidates sequentially so rate limits or blocked keys auto-failover
  for (const candidate of candidates) {
    const controller = new AbortController();
    const timeoutMs = candidate.provider === "OLLAMA" || candidate.provider === "CUSTOM" ? 60_000 : 25_000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (candidate.provider === "GEMINI") {
        const geminiModel = candidate.model || process.env.GEMINI_MODEL || "gemini-1.5-flash";
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${candidate.apiKey}`;
        const res = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nAudit Evidence:\n${JSON.stringify(evidencePayload, null, 2)}` }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
        const gData = await res.json();
        const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("Empty candidate from Gemini");
        const parsed = JSON.parse(cleanJsonResponse(rawText)) as AIRecommendationOutput;
        return {
          signature,
          recommendation: mapParsedRecommendation(parsed, baseline, req.issue.code),
          source: "GEMINI",
          promptTokens: gData.usageMetadata?.promptTokenCount || 0,
          completionTokens: gData.usageMetadata?.candidatesTokenCount || 0,
        };
      }

      const fallbackDefaults = { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" };
      const defaults = PROVIDER_DEFAULTS[candidate.provider] ?? fallbackDefaults;
      const endpoint = candidate.baseUrl || (candidate.provider === "OLLAMA" ? process.env.OLLAMA_BASE_URL : undefined) || defaults.baseUrl;
      const model = candidate.model || process.env.AI_MODEL || defaults.model;
      const targetUrl = `${endpoint.replace(/\/+$/, "")}/chat/completions`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (candidate.apiKey) headers["Authorization"] = `Bearer ${candidate.apiKey}`;

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Audit Evidence:\n${JSON.stringify(evidencePayload, null, 2)}` },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${candidate.provider} HTTP ${response.status}`);
      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error(`Empty completion from ${candidate.provider}`);
      const parsed = JSON.parse(cleanJsonResponse(rawContent)) as AIRecommendationOutput;
      return {
        signature,
        recommendation: mapParsedRecommendation(parsed, baseline, req.issue.code),
        source: candidate.provider as GeneratedRecommendationResult["source"],
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      };
    } catch {
      // Fail over to next candidate in waterfall
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    signature,
    recommendation: baseline,
    source: "DETERMINISTIC_TEMPLATE",
    promptTokens: 0,
    completionTokens: 0,
  };
}
