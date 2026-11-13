import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, apiKey, provider, model } = body;

    const keyToTest = (apiKey || "").trim() || (type === "GOOGLE_PSI" ? process.env.GOOGLE_PAGESPEED_API_KEY : process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

    if (!keyToTest) {
      return NextResponse.json({ success: false, error: "No API key provided to test" }, { status: 400 });
    }

    if (type === "GOOGLE_PSI") {
      const start = Date.now();
      const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&category=performance&key=${keyToTest}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12_000);

      try {
        const res = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${res.status} from Google PageSpeed API`;
          return NextResponse.json({
            success: false,
            error: errMsg,
            latencyMs: Date.now() - start,
          });
        }

        const data = await res.json();
        const perfScore = data?.lighthouseResult?.categories?.performance?.score;

        return NextResponse.json({
          success: true,
          message: "Google PageSpeed Insights API key verified! High authenticated quota is active.",
          latencyMs: Date.now() - start,
          sampleScore: perfScore ? Math.round(perfScore * 100) : 100,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        return NextResponse.json({
          success: false,
          error: fetchErr.name === "AbortError" ? "Request timed out connecting to Google API" : fetchErr.message,
        });
      }
    }

    if (type === "AI_PROVIDER") {
      const activeProvider = provider || (keyToTest.startsWith("AIzaSy") ? "GEMINI" : "OPENAI");
      const start = Date.now();

      if (activeProvider === "GEMINI") {
        const geminiModel = model || "gemini-1.5-flash";
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${keyToTest}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12_000);

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "Return JSON: {\"status\":\"ok\"}" }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json({
              success: false,
              error: errData?.error?.message || `HTTP ${res.status} from Google Gemini API`,
            });
          }

          return NextResponse.json({
            success: true,
            message: `Google Gemini API key verified with model ${geminiModel}!`,
            latencyMs: Date.now() - start,
            provider: "GEMINI",
          });
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          return NextResponse.json({ success: false, error: fetchErr.message });
        }
      }

      if (activeProvider === "OPENAI") {
        const openAiModel = model || "gpt-4o-mini";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12_000);

        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${keyToTest}`,
            },
            body: JSON.stringify({
              model: openAiModel,
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 5,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json({
              success: false,
              error: errData?.error?.message || `HTTP ${res.status} from OpenAI`,
            });
          }

          return NextResponse.json({
            success: true,
            message: `OpenAI API key verified with model ${openAiModel}!`,
            latencyMs: Date.now() - start,
            provider: "OPENAI",
          });
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          return NextResponse.json({ success: false, error: fetchErr.message });
        }
      }
    }

    return NextResponse.json({ success: false, error: "Unknown test type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
