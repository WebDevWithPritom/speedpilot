import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_DEFAULTS, inferProviderFromKey, isAllowedProviderBaseUrl } from "@speedpilot/ai-engine";

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, apiKey, provider, model, baseUrl } = body;

    const isKeylessAllowed = provider === "OLLAMA";
    const keyToTest =
      (apiKey || "").trim() ||
      (type === "GOOGLE_PSI"
        ? process.env.GOOGLE_PAGESPEED_API_KEY
        : process.env.GROQ_API_KEY ||
          process.env.CEREBRAS_API_KEY ||
          process.env.OPENROUTER_API_KEY ||
          process.env.SAMBANOVA_API_KEY ||
          process.env.GITHUB_MODELS_TOKEN ||
          process.env.GITHUB_TOKEN ||
          process.env.NVIDIA_API_KEY ||
          process.env.MISTRAL_API_KEY ||
          process.env.GEMINI_API_KEY ||
          process.env.DEEPSEEK_API_KEY ||
          process.env.OPENAI_API_KEY);

    if (!keyToTest && !isKeylessAllowed) {
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
      const activeProvider = provider || (keyToTest ? inferProviderFromKey(keyToTest) : null) || "OPENAI";
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

      // All OpenAI-compatible providers share PROVIDER_DEFAULTS
      const defaults = PROVIDER_DEFAULTS[activeProvider] ?? { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" };
      const endpoint = baseUrl || (activeProvider === "OLLAMA" ? process.env.OLLAMA_BASE_URL : undefined) || defaults.baseUrl;
      if (baseUrl && !isAllowedProviderBaseUrl(endpoint, activeProvider)) {
        return NextResponse.json({ success: false, error: "Blocked unsafe or private custom AI base URL (SSRF protection)." }, { status: 400 });
      }
      const defaultModel = defaults.model;

      const activeModel = model || defaultModel;
      const targetUrl = `${endpoint.replace(/\/+$/, "")}/chat/completions`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (keyToTest) {
        headers["Authorization"] = `Bearer ${keyToTest}`;
      }

      const controller = new AbortController();
      const timeoutMs = activeProvider === "OLLAMA" || activeProvider === "CUSTOM" ? 60_000 : 15_000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: activeModel,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || errData?.message || `HTTP ${res.status} from ${activeProvider} endpoint`;
          
          if (activeProvider === "OLLAMA" && res.status === 404) {
            return NextResponse.json({
              success: false,
              error: `Ollama is running, but model '${activeModel}' is not found. Run 'ollama pull ${activeModel}' in your terminal to download it.`,
            });
          }

          return NextResponse.json({
            success: false,
            error: errMsg,
          });
        }

        return NextResponse.json({
          success: true,
          message: `${activeProvider} connected successfully with model ${activeModel}!`,
          latencyMs: Date.now() - start,
          provider: activeProvider,
          model: activeModel,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        let errorMsg = fetchErr.message;
        if (activeProvider === "OLLAMA" && (fetchErr.cause?.code === "ECONNREFUSED" || fetchErr.message.includes("fetch failed"))) {
          errorMsg = `Could not connect to Ollama at ${endpoint}. Please ensure Ollama is installed and running ('ollama serve').`;
        }
        return NextResponse.json({ success: false, error: errorMsg });
      }
    }

    return NextResponse.json({ success: false, error: "Unknown test type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
