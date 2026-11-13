import { NextRequest, NextResponse } from "next/server";

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
  const geminiKey = process.env.GEMINI_API_KEY || (psiKey?.startsWith("AIzaSy") ? psiKey : undefined);
  const openAiKey = process.env.OPENAI_API_KEY;

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
        isConfigured: !!geminiKey || !!openAiKey,
        detectedProvider: geminiKey ? "GEMINI" : openAiKey ? "OPENAI" : "BUILTIN_TEMPLATES",
        maskedKey: maskKey(geminiKey || openAiKey),
        model: geminiKey ? "gemini-1.5-flash" : openAiKey ? "gpt-4o-mini" : "deterministic-engine",
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
