export interface ClientAIConfig {
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

/** Reads user-configured AI provider settings from browser localStorage. */
export function getClientAIConfig(): ClientAIConfig {
  if (typeof window === "undefined") return {};
  const provider = localStorage.getItem("sp_ai_provider") || undefined;
  return {
    provider: provider === "BUILTIN" ? undefined : provider,
    apiKey: localStorage.getItem("sp_ai_key") || undefined,
    model: localStorage.getItem("sp_ai_model") || undefined,
    baseUrl: localStorage.getItem("sp_ai_base_url") || undefined,
  };
}

