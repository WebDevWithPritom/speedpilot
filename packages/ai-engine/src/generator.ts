import {
  AIRecommendationOutput,
  TechStack,
  NormalizedAuditIssue,
} from "@speedpilot/shared";
import { getDeterministicRecommendation } from "./templates.js";
import { computeIssueSignature } from "./signature.js";

export interface AIRecommendationRequest {
  targetUrl: string;
  techStack: TechStack;
  issue: NormalizedAuditIssue;
  apiKey?: string;
  provider?: "OPENAI" | "GEMINI" | "ANTHROPIC" | "AUTO";
  model?: string;
}

export interface GeneratedRecommendationResult {
  signature: string;
  recommendation: AIRecommendationOutput;
  source: "OPENAI" | "GEMINI" | "ANTHROPIC" | "DETERMINISTIC_TEMPLATE";
  promptTokens?: number;
  completionTokens?: number;
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

  let apiKey = req.apiKey || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY;
  let provider = req.provider || "AUTO";

  if (provider === "AUTO") {
    if (apiKey?.startsWith("AIzaSy")) {
      provider = "GEMINI";
    } else if (apiKey?.startsWith("sk-ant-")) {
      provider = "ANTHROPIC";
    } else if (apiKey?.startsWith("sk-")) {
      provider = "OPENAI";
    }
  }

  // If no API key is configured or provider unresolved, immediately return deterministic templates
  if (!apiKey || (provider !== "GEMINI" && provider !== "OPENAI" && provider !== "ANTHROPIC")) {
    const templateOutput = getDeterministicRecommendation(
      req.issue.code,
      req.techStack,
      primaryResource,
      wastedMs
    );
    return {
      signature,
      recommendation: templateOutput,
      source: "DETERMINISTIC_TEMPLATE",
      promptTokens: 0,
      completionTokens: 0,
    };
  }

  // Build compact evidence payload (< 4KB)
  const evidencePayload = {
    targetUrl: req.targetUrl,
    detectedTechStack: req.techStack,
    issue: {
      code: req.issue.code,
      title: req.issue.title,
      severity: req.issue.severity,
      displayValue: req.issue.displayValue,
      score: req.issue.score,
      evidenceItems: req.issue.evidenceItems.slice(0, 5),
    },
  };

  const systemPrompt = `You are SpeedPilot's Senior Web Performance AI Architect.
Given real diagnostic audit evidence from Google PageSpeed Insights, provide audience-tailored recommendations.
You must return a valid JSON object matching this exact schema:
{
  "detectedStack": "${req.techStack}",
  "explanationMarketer": "Plain English conversion & business impact explanation",
  "explanationDeveloper": "Exact technical root cause and architectural instructions",
  "explanationAgency": "Client-facing pitch emphasizing ROI and score gains",
  "explanationSaaSTeam": "Operational guidance on regression risk and release checks",
  "remediationCodeSnippet": "Accurate before/after code or configuration snippet for ${req.techStack}",
  "implementationSteps": ["Step 1", "Step 2", "Step 3"],
  "verificationSteps": ["Verification step 1", "Verification step 2"],
  "estimatedDifficulty": "EASY" | "MEDIUM" | "HARD",
  "estimatedImpact": "LOW" | "MEDIUM" | "HIGH"
}
Do NOT invent plugins, themes, or file paths that are unsupported by the evidence. Output pure JSON without markdown code fences.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    let parsed: AIRecommendationOutput;
    let promptTokens = 0;
    let completionTokens = 0;

    if (provider === "GEMINI") {
      const geminiModel = req.model || process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

      const res = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: `${systemPrompt}\n\nAudit Evidence:\n${JSON.stringify(evidencePayload, null, 2)}` }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Gemini API HTTP ${res.status}: ${res.statusText}`);
      }

      const gData = await res.json();
      const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty candidate from Gemini");
      parsed = JSON.parse(rawText) as AIRecommendationOutput;
      promptTokens = gData.usageMetadata?.promptTokenCount || 0;
      completionTokens = gData.usageMetadata?.candidatesTokenCount || 0;

      return {
        signature,
        recommendation: {
          detectedStack: parsed.detectedStack || req.techStack,
          explanationMarketer: parsed.explanationMarketer,
          explanationDeveloper: parsed.explanationDeveloper,
          explanationAgency: parsed.explanationAgency,
          explanationSaaSTeam: parsed.explanationSaaSTeam,
          remediationCodeSnippet: parsed.remediationCodeSnippet,
          implementationSteps: parsed.implementationSteps || [],
          verificationSteps: parsed.verificationSteps || [],
          estimatedDifficulty: parsed.estimatedDifficulty || "MEDIUM",
          estimatedImpact: parsed.estimatedImpact || "HIGH",
        },
        source: "GEMINI",
        promptTokens,
        completionTokens,
      };
    } else {
      // OpenAI / compatible
      const model = req.model || process.env.AI_MODEL || "gpt-4o-mini";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
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

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error("Empty completion from OpenAI");
      }

      parsed = JSON.parse(rawContent) as AIRecommendationOutput;

      return {
        signature,
        recommendation: {
          detectedStack: parsed.detectedStack || req.techStack,
          explanationMarketer: parsed.explanationMarketer,
          explanationDeveloper: parsed.explanationDeveloper,
          explanationAgency: parsed.explanationAgency,
          explanationSaaSTeam: parsed.explanationSaaSTeam,
          remediationCodeSnippet: parsed.remediationCodeSnippet,
          implementationSteps: parsed.implementationSteps || [],
          verificationSteps: parsed.verificationSteps || [],
          estimatedDifficulty: parsed.estimatedDifficulty || "MEDIUM",
          estimatedImpact: parsed.estimatedImpact || "HIGH",
        },
        source: "OPENAI",
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      };
    }
  } catch {
    // Graceful fallback to deterministic template if AI fails or times out
    const fallbackOutput = getDeterministicRecommendation(
      req.issue.code,
      req.techStack,
      primaryResource,
      wastedMs
    );
    return {
      signature,
      recommendation: fallbackOutput,
      source: "DETERMINISTIC_TEMPLATE",
      promptTokens: 0,
      completionTokens: 0,
    };
  }
}

