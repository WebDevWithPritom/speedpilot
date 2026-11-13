import { computeIssueSignature } from "../signature.js";
import { AIProvider, buildProviderCandidates, PROVIDER_DEFAULTS } from "../providers.js";
import {
  DeepSearchRequest,
  MultiPersonaDeepSearchResult,
  DeveloperDeepSearchResult,
  MarketerDeepSearchResult,
  AgencyDeepSearchResult,
  SaaSTeamDeepSearchResult,
} from "./types.js";
import { getDeterministicDeveloperDeepSearch } from "./developer.js";
import { getDeterministicMarketerDeepSearch } from "./marketer.js";
import { getDeterministicAgencyDeepSearch } from "./agency.js";
import { getDeterministicSaaSTeamDeepSearch } from "./saas.js";

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  }
  return cleaned.trim();
}

/**
 * Executes a Deep Search investigation across Developer, Marketer, Agency, and SaaS Team perspectives.
 */
export async function executeDeepSearch(
  req: DeepSearchRequest
): Promise<MultiPersonaDeepSearchResult> {
  const startTime = Date.now();
  const primaryResource = req.issue.evidenceItems[0]?.url;
  const signature = computeIssueSignature(req.issue.code, req.techStack, primaryResource);

  const persona = req.persona || "ALL";

  const candidates = buildProviderCandidates({
    provider: req.provider,
    apiKey: req.apiKey,
    baseUrl: req.baseUrl,
    model: req.model,
  });

  // Try candidates sequentially with automatic failover across providers
  for (const candidate of candidates) {
    try {
      const aiResult = await runLiveAIDeepSearch(
        { ...req, model: candidate.model || req.model, baseUrl: candidate.baseUrl || req.baseUrl },
        candidate.apiKey,
        candidate.provider
      );
      return {
        signature,
        targetUrl: req.targetUrl,
        techStack: req.techStack,
        issueCode: req.issue.code,
        ...aiResult,
        source: "AI_GENERATED",
        executionMs: Date.now() - startTime,
      };
    } catch {
      // Fail over to next candidate in waterfall
    }
  }

  // Deterministic Zero-Key Search Engine Execution
  let developer: DeveloperDeepSearchResult | undefined;
  let marketer: MarketerDeepSearchResult | undefined;
  let agency: AgencyDeepSearchResult | undefined;
  let saasTeam: SaaSTeamDeepSearchResult | undefined;

  if (persona === "ALL" || persona === "DEVELOPER") {
    developer = getDeterministicDeveloperDeepSearch(req.issue, req.techStack, req.targetUrl);
  }
  if (persona === "ALL" || persona === "MARKETER") {
    marketer = getDeterministicMarketerDeepSearch(req.issue, req.techStack, req.targetUrl);
  }
  if (persona === "ALL" || persona === "AGENCY") {
    agency = getDeterministicAgencyDeepSearch(req.issue, req.techStack, req.targetUrl);
  }
  if (persona === "ALL" || persona === "SAAS_TEAM") {
    saasTeam = getDeterministicSaaSTeamDeepSearch(req.issue, req.techStack, req.targetUrl);
  }

  return {
    signature,
    targetUrl: req.targetUrl,
    techStack: req.techStack,
    issueCode: req.issue.code,
    developer,
    marketer,
    agency,
    saasTeam,
    source: "DETERMINISTIC_SEARCH_ENGINE",
    executionMs: Date.now() - startTime,
  };
}

async function runLiveAIDeepSearch(
  req: DeepSearchRequest,
  apiKey: string,
  provider: Exclude<AIProvider, "AUTO" | "ANTHROPIC">
): Promise<{
  developer?: DeveloperDeepSearchResult;
  marketer?: MarketerDeepSearchResult;
  agency?: AgencyDeepSearchResult;
  saasTeam?: SaaSTeamDeepSearchResult;
}> {
  const prompt = `You are SpeedPilot's Multi-Persona AI Deep Search Engine.
Perform a deep search investigation on this PageSpeed audit issue for:
Target URL: ${req.targetUrl}
Tech Stack: ${req.techStack}
Issue: ${JSON.stringify(req.issue)}

Return a strict JSON object with 4 specialized keys:
{
  "developer": {
    "persona": "DEVELOPER",
    "detectedStack": "${req.techStack}",
    "rootCauseAnalysis": "Technical AST and browser pipeline analysis",
    "offendingResource": "Resource URL",
    "remediationDiff": "Before/after code patch",
    "bundlerConfigPatch": "Bundler or server config",
    "cliVerificationCommand": "Command to verify",
    "recommendedPackages": ["package1"],
    "estimatedDevMinutes": 45
  },
  "marketer": {
    "persona": "MARKETER",
    "serpRankRisk": "HIGH" | "MEDIUM" | "LOW",
    "projectedBounceRateDelta": "-X% bounce probability",
    "estimatedConversionUplift": "+X% conversion",
    "plainEnglishSummary": "Business impact summary",
    "executiveBulletPoints": ["Point 1", "Point 2"],
    "competitorGapNotice": "Competitor insight"
  },
  "agency": {
    "persona": "AGENCY",
    "clientPitchNarrative": "Client deck pitch",
    "projectedScoreLift": "+X points",
    "workBreakdownStructure": [{"task": "Task name", "estimatedHours": 2, "priority": "QUICK_WIN"}],
    "totalEstimatedHours": 8,
    "clientDeliverableSummary": "Deliverable summary",
    "riskIfIgnored": "Competitive risk"
  },
  "saasTeam": {
    "persona": "SAAS_TEAM",
    "slaBreachRisk": "HIGH" | "MODERATE" | "LOW",
    "performanceBudgetRule": {"metric": "LCP", "targetThreshold": "2000ms", "enforcementAction": "BLOCK_PR"},
    "ciConfigSnippet": "lighthouserc.json snippet",
    "sprintTicket": {"title": "Ticket title", "description": "Ticket desc", "acceptanceCriteria": ["Criteria 1"]},
    "syntheticVsRumNote": "Synthetic vs RUM analysis"
  }
}
Pure JSON only.`;

  const controller = new AbortController();
  const timeoutMs = provider === "OLLAMA" || provider === "CUSTOM" ? 60_000 : 25_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (provider === "GEMINI") {
      const model = req.model || "gemini-1.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Gemini error ${res.status}`);
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(cleanJsonResponse(rawText));
    } else {
      const defaults = PROVIDER_DEFAULTS[provider] ?? { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" };
      const endpoint =
        req.baseUrl || (provider === "OLLAMA" ? process.env.OLLAMA_BASE_URL : undefined) || defaults.baseUrl;
      const defaultModel = defaults.model;

      const model = req.model || defaultModel;
      const targetUrl = `${endpoint.replace(/\/+$/, "")}/chat/completions`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`${provider} error ${res.status}`);
      const data = await res.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) throw new Error(`Empty response from ${provider}`);
      return JSON.parse(cleanJsonResponse(rawText));
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
