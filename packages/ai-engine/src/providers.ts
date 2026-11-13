import * as net from "node:net";
import { validateAndNormalizeUrl } from "@speedpilot/shared";
import { isPrivateIP } from "@speedpilot/security";

export type AIProvider =
  | "GEMINI"
  | "OPENAI"
  | "GROQ"
  | "CEREBRAS"
  | "OPENROUTER"
  | "SAMBANOVA"
  | "GITHUB"
  | "NVIDIA"
  | "MISTRAL"
  | "DEEPSEEK"
  | "OLLAMA"
  | "ANTHROPIC"
  | "CUSTOM"
  | "AUTO";

export interface ProviderCandidate {
  provider: Exclude<AIProvider, "AUTO" | "ANTHROPIC">;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  GROQ: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  CEREBRAS: { baseUrl: "https://api.cerebras.ai/v1", model: "llama-3.3-70b" },
  OPENROUTER: { baseUrl: "https://openrouter.ai/api/v1", model: "openrouter/free" },
  SAMBANOVA: { baseUrl: "https://api.sambanova.ai/v1", model: "Meta-Llama-3.3-70B-Instruct" },
  GITHUB: { baseUrl: "https://models.inference.ai.azure.com", model: "gpt-4o-mini" },
  NVIDIA: { baseUrl: "https://integrate.api.nvidia.com/v1", model: "meta/llama-3.3-70b-instruct" },
  MISTRAL: { baseUrl: "https://api.mistral.ai/v1", model: "mistral-small-latest" },
  DEEPSEEK: { baseUrl: "https://api.deepseek.com", model: "deepseek-chat" },
  OLLAMA: { baseUrl: "http://localhost:11434/v1", model: "qwen2.5-coder:3b" },
  OPENAI: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  CUSTOM: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
};

const ENV_KEY_MAP: Array<[Exclude<AIProvider, "AUTO" | "ANTHROPIC">, () => string | undefined]> = [
  ["GROQ", () => process.env.GROQ_API_KEY],
  ["CEREBRAS", () => process.env.CEREBRAS_API_KEY],
  ["OPENROUTER", () => process.env.OPENROUTER_API_KEY],
  ["SAMBANOVA", () => process.env.SAMBANOVA_API_KEY],
  ["GITHUB", () => process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN],
  ["NVIDIA", () => process.env.NVIDIA_API_KEY],
  ["MISTRAL", () => process.env.MISTRAL_API_KEY],
  ["GEMINI", () => process.env.GEMINI_API_KEY],
  ["DEEPSEEK", () => process.env.DEEPSEEK_API_KEY],
  ["OPENAI", () => process.env.OPENAI_API_KEY],
];

export function inferProviderFromKey(key: string): Exclude<AIProvider, "AUTO" | "ANTHROPIC"> | null {
  if (key.startsWith("AIzaSy")) return "GEMINI";
  if (key.startsWith("gsk_")) return "GROQ";
  if (key.startsWith("csk-")) return "CEREBRAS";
  if (key.startsWith("sk-or-")) return "OPENROUTER";
  if (key.startsWith("nvapi-")) return "NVIDIA";
  if (key.startsWith("github_pat_") || key.startsWith("ghp_")) return "GITHUB";
  if (key.startsWith("sk-")) return "OPENAI";
  return null;
}

export function isAllowedProviderBaseUrl(url: string, provider?: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (provider === "OLLAMA" && process.env.NODE_ENV !== "production" && (host === "localhost" || host === "127.0.0.1")) {
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }
  if (!validateAndNormalizeUrl(url).isValid) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }
  const bareHost = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (net.isIP(bareHost) && isPrivateIP(bareHost)) return false;
  return true;
}

export function buildProviderCandidates(req: {
  provider?: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}): ProviderCandidate[] {
  const safeBaseUrl = req.baseUrl && isAllowedProviderBaseUrl(req.baseUrl, req.provider) ? req.baseUrl : undefined;
  const explicit = req.provider || "AUTO";
  if (explicit !== "AUTO") {
    if (explicit === "ANTHROPIC") return [];
    const envGetter = ENV_KEY_MAP.find(([p]) => p === explicit)?.[1];
    const envKey =
      explicit === "GEMINI" ? envGetter?.() || process.env.GOOGLE_PAGESPEED_API_KEY
      : explicit === "OLLAMA" ? "ollama"
      : envGetter?.();
    const key = req.apiKey || envKey || "";
    if (!key && explicit !== "OLLAMA") return [];
    if (req.baseUrl && !safeBaseUrl) return [];
    return [{ provider: explicit, apiKey: key || "ollama", baseUrl: safeBaseUrl, model: req.model }];
  }

  const list: ProviderCandidate[] = [];
  if (req.apiKey) {
    const inferred = inferProviderFromKey(req.apiKey);
    if (inferred) list.push({ provider: inferred, apiKey: req.apiKey, baseUrl: safeBaseUrl, model: req.model });
  }
  for (const [provider, getEnv] of ENV_KEY_MAP) {
    const val = getEnv();
    if (val) list.push({ provider, apiKey: val });
  }
  if (process.env.OLLAMA_BASE_URL) {
    list.push({ provider: "OLLAMA", apiKey: "ollama", baseUrl: process.env.OLLAMA_BASE_URL, model: process.env.OLLAMA_MODEL });
  }
  if (process.env.GOOGLE_PAGESPEED_API_KEY?.startsWith("AIzaSy") && !process.env.GEMINI_API_KEY) {
    list.push({ provider: "GEMINI", apiKey: process.env.GOOGLE_PAGESPEED_API_KEY });
  }
  return list;
}
