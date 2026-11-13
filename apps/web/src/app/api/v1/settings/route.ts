import { NextRequest, NextResponse } from "next/server";
import { buildProviderCandidates, PROVIDER_DEFAULTS } from "@speedpilot/ai-engine";

export const revalidate = 0;

function maskKey(key: string | undefined): string | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 6)}••••••••${trimmed.slice(-4)}`;
}

export async function GET() {
  const psiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  const cruxKey = process.env.GOOGLE_CRUX_API_KEY;
  const candidates = buildProviderCandidates({ provider: "AUTO" });
  const primary = candidates[0];

  const detectedProvider = primary?.provider ?? "BUILTIN_TEMPLATES";
  const isAiConfigured = Boolean(primary);
  const activeMaskedKey = primary
    ? primary.provider === "OLLAMA"
      ? `${primary.baseUrl || "http://localhost:11434"} (Local)`
      : maskKey(primary.apiKey)
    : null;
  const activeModel =
    primary?.model ||
    (primary?.provider === "GEMINI"
      ? "gemini-1.5-flash"
      : primary
      ? PROVIDER_DEFAULTS[primary.provider]?.model || "gpt-4o-mini"
      : "deterministic-engine");

  return NextResponse.json({
    status: "ok",
    integrations: {
      googlePSI: {
        isConfigured: !!psiKey,
        maskedKey: maskKey(psiKey),
      },
      googleCrUX: {
        isConfigured: !!cruxKey || !!psiKey,
        maskedKey: maskKey(cruxKey || psiKey),
        inherited: !cruxKey && !!psiKey,
      },
      aiProvider: {
        isConfigured: isAiConfigured,
        detectedProvider,
        maskedKey: activeMaskedKey,
        model: activeModel,
      },
    },
    tier: "OPEN_SOURCE_CORE",
    features: {
      streamSafeMode: true,
      maxBatchUrls: 500,
      agenticBrowsingAudit: true,
      whiteLabelReports: true,
    },
  });
}
