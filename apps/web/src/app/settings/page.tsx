"use client";

import React, { useState, useEffect } from "react";
import { RazorpayUpgradeButton } from "@/components/billing/RazorpayUpgradeButton";
import {
  ShieldCheck,
  Key,
  Cpu,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  Zap,
  Lock,
  Server,
  Terminal,
  HardDrive,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const MODEL_PRESETS: Record<string, Array<{ id: string; label: string; badge?: string }>> = {
  GEMINI: [
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", badge: "Fast & Free" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", badge: "Complex Code" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", badge: "Next-Gen" },
  ],
  GROQ: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", badge: "500+ tok/s" },
    { id: "qwen-2.5-coder-32b", label: "Qwen 2.5 Coder 32B", badge: "Top Coding" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", badge: "Ultra-Fast" },
  ],
  CEREBRAS: [
    { id: "llama-3.3-70b", label: "Llama 3.3 70B", badge: "Wafer-Scale Free" },
    { id: "qwen-3-32b", label: "Qwen 3 32B", badge: "Fast Coding" },
  ],
  OPENROUTER: [
    { id: "openrouter/free", label: "OpenRouter Free Auto", badge: "$0 Router" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (:free)", badge: "$0" },
    { id: "qwen/qwen-2.5-coder-32b-instruct:free", label: "Qwen 2.5 Coder (:free)", badge: "$0 Coding" },
  ],
  SAMBANOVA: [
    { id: "Meta-Llama-3.3-70B-Instruct", label: "Llama 3.3 70B", badge: "Free RDU Fast" },
    { id: "Qwen2.5-Coder-32B-Instruct", label: "Qwen 2.5 Coder 32B", badge: "Coding" },
  ],
  GITHUB: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini", badge: "Free w/ GitHub PAT" },
    { id: "gpt-4o", label: "GPT-4o", badge: "GitHub Models" },
  ],
  NVIDIA: [
    { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B NIM", badge: "Free Credits" },
    { id: "qwen/qwen2.5-coder-32b-instruct", label: "Qwen 2.5 Coder 32B", badge: "Coding" },
  ],
  MISTRAL: [
    { id: "mistral-small-latest", label: "Mistral Small", badge: "Free Experiment Tier" },
    { id: "codestral-latest", label: "Codestral", badge: "Code Specialized" },
  ],
  DEEPSEEK: [
    { id: "deepseek-chat", label: "DeepSeek-V3", badge: "Flagship" },
    { id: "deepseek-reasoner", label: "DeepSeek-R1", badge: "Deep Reasoning" },
  ],
  OLLAMA: [
    { id: "qwen2.5-coder:3b", label: "Qwen 2.5 Coder 3B", badge: "Installed GPU Fast" },
    { id: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder 7B", badge: "Local Best" },
    { id: "llama3.3", label: "Llama 3.3", badge: "General" },
    { id: "deepseek-coder-v2", label: "DeepSeek Coder V2", badge: "Coding" },
  ],
  OPENAI: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini", badge: "Fast" },
    { id: "gpt-4o", label: "GPT-4o", badge: "High Accuracy" },
    { id: "o3-mini", label: "o3-mini", badge: "Reasoning" },
  ],
  ANTHROPIC: [
    { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", badge: "Top Tier" },
    { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", badge: "Fast" },
  ],
};

export default function SettingsPage() {
  const [streamShield, setStreamShield] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [serverSettings, setServerSettings] = useState<any>(null);

  // Form states
  const [googleKey, setGoogleKey] = useState("");
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [googleTesting, setGoogleTesting] = useState(false);
  const [googleTestResult, setGoogleTestResult] = useState<any>(null);

  const [aiProvider, setAiProvider] = useState<
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
    | "BUILTIN"
  >("GROQ");
  const [aiKey, setAiKey] = useState("");
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiModel, setAiModel] = useState("gemini-1.5-flash");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<any>(null);

  const [tier, setTier] = useState<"OPEN_SOURCE" | "PRO_AGENCY">("OPEN_SOURCE");
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3500);
  };

  useEffect(() => {
    // Load local storage if any
    const savedGoogleKey = localStorage.getItem("sp_google_key");
    const savedAiProvider = localStorage.getItem("sp_ai_provider");
    const savedAiKey = localStorage.getItem("sp_ai_key");
    const savedAiModel = localStorage.getItem("sp_ai_model");
    const savedAiBaseUrl = localStorage.getItem("sp_ai_base_url");
    const savedTier = localStorage.getItem("sp_tier");

    if (savedGoogleKey) setGoogleKey(savedGoogleKey);
    if (savedAiProvider) setAiProvider(savedAiProvider as any);
    if (savedAiKey) setAiKey(savedAiKey);
    if (savedAiModel) setAiModel(savedAiModel);
    if (savedAiBaseUrl) setAiBaseUrl(savedAiBaseUrl);
    if (savedTier) setTier(savedTier as any);

    // Fetch server status
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((data) => {
        setServerSettings(data);
        if (data.integrations?.aiProvider?.detectedProvider) {
          if (!savedAiProvider) {
            setAiProvider(data.integrations.aiProvider.detectedProvider);
            if (data.integrations.aiProvider.model) {
              setAiModel(data.integrations.aiProvider.model);
            }
          }
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const handleTestGoogle = async () => {
    setGoogleTesting(true);
    setGoogleTestResult(null);
    try {
      const res = await fetch("/api/v1/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GOOGLE_PSI",
          apiKey: googleKey || undefined,
        }),
      });
      const data = await res.json();
      setGoogleTestResult(data);
      if (data.success) {
        triggerToast("Google PageSpeed API verified successfully!");
      }
    } catch (e: any) {
      setGoogleTestResult({ success: false, error: e.message });
    } finally {
      setGoogleTesting(false);
    }
  };

  const handleTestAI = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await fetch("/api/v1/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "AI_PROVIDER",
          apiKey: aiKey || undefined,
          provider: aiProvider,
          model: aiModel,
          baseUrl: aiBaseUrl || undefined,
        }),
      });
      const data = await res.json();
      setAiTestResult(data);
      if (data.success) {
        triggerToast(`${aiProvider} API connected successfully!`);
      }
    } catch (e: any) {
      setAiTestResult({ success: false, error: e.message });
    } finally {
      setAiTesting(false);
    }
  };

  const handleSaveSettings = () => {
    if (googleKey) localStorage.setItem("sp_google_key", googleKey);
    localStorage.setItem("sp_ai_provider", aiProvider);
    if (aiKey) localStorage.setItem("sp_ai_key", aiKey);
    localStorage.setItem("sp_ai_model", aiModel);
    if (aiBaseUrl) localStorage.setItem("sp_ai_base_url", aiBaseUrl);
    else localStorage.removeItem("sp_ai_base_url");
    localStorage.setItem("sp_tier", tier);
    triggerToast("Settings & BYOK keys saved locally in browser session!");
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Page Title & Streamer Shield Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Key Management & System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Bring-Your-Own-Key (BYOK) for Google PageSpeed, AI fix synthesizers, and live-stream protection.
          </p>
        </div>

        {/* Streamer Privacy Shield Toggle */}
        <div
          onClick={() => setStreamShield(!streamShield)}
          className={`cursor-pointer px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition ${streamShield
              ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
              : "bg-secondary border-border text-muted-foreground"
            }`}
          title="Prevents accidental API key disclosure during livestreams and screen sharing"
        >
          <Shield className="w-4 h-4" />
          <span>{streamShield ? "Stream Privacy Shield: ACTIVE" : "Stream Privacy Shield: OFF"}</span>
        </div>
      </div>

      {/* Stream Safe Notice Banner */}
      {streamShield && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
          <Lock className="w-4 h-4 shrink-0 text-rose-500" />
          <div>
            <span className="font-semibold text-rose-300">Live-Stream Safety Active: </span>
            All API keys and authorization headers are masked with bullet points (<code className="font-mono text-rose-200">••••••••••••</code>) so you can safely broadcast on YouTube and Gareeb Vibe Coding.
          </div>
        </div>
      )}

      {/* Interactive Step-by-Step API Key Tutorial Card */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-primary cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span>How to get your free Google PSI &amp; AI keys in 60 seconds (Step-by-Step Guide)</span>
          </span>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showGuide && (
          <div className="pt-2 border-t border-primary/20 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground animate-in fade-in duration-200">
            {/* Guide 1: Google PSI */}
            <div className="p-3 rounded-md bg-card border border-border space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                <span>1. Google PageSpeed (Free)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>Go to <a href="https://developers.google.com/speed/docs/insights/v5/get-started" target="_blank" rel="noreferrer" className="text-primary hover:underline">PageSpeed Getting Started</a>.</li>
                <li>Click <strong>&quot;Get a Key&quot;</strong> and choose or create a Google Cloud project.</li>
                <li>Copy the key (starts with <code className="font-mono">AIzaSy...</code>).</li>
                <li>Paste it in <strong>Google Cloud API Key</strong> below and click <strong>Test Connection</strong>.</li>
              </ol>
              <div className="text-[10px] text-emerald-500 font-medium">Free: 25,000 queries/day (no credit card)</div>
            </div>

            {/* Guide 2: Google Gemini */}
            <div className="p-3 rounded-md bg-card border border-border space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>2. Google Gemini (Free)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google AI Studio</a>.</li>
                <li>Sign in with your standard Google account.</li>
                <li>Click <strong>&quot;Create API key&quot;</strong>.</li>
                <li>Select <strong>Google Gemini</strong> below, paste the key, and test.</li>
              </ol>
              <div className="text-[10px] text-emerald-500 font-medium">Free: 15 RPM with Gemini 1.5 Flash</div>
            </div>

            {/* Guide 3: Groq Cloud */}
            <div className="p-3 rounded-md bg-card border border-border space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>3. Groq Cloud (Ultra Fast)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">Groq Console</a>.</li>
                <li>Sign in with GitHub or Google.</li>
                <li>Click <strong>&quot;Create API Key&quot;</strong> and copy <code className="font-mono">gsk_...</code>.</li>
                <li>Select <strong>Groq Cloud</strong> below, paste the key, and test.</li>
              </ol>
              <div className="text-[10px] text-emerald-500 font-medium">Free: 500+ tok/s with Llama 3.3 70B &amp; Qwen</div>
            </div>
          </div>
        )}
      </div>

      {/* Section 1: Google PageSpeed & CrUX Integration */}
      <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Google PageSpeed Insights & CrUX API</h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Default Quota: 25,000 requests/day (Free)
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Enter your official Google Cloud API key to audit up to 240+ URLs/min without hitting public unauthenticated rate limits.
        </p>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Google Cloud API Key</span>
              {serverSettings?.integrations?.googlePSI?.isConfigured && (
                <span className="text-[10px] text-emerald-500 font-mono">
                  Server .env Key: {serverSettings.integrations.googlePSI.maskedKey}
                </span>
              )}
            </label>

            <div className="relative flex items-center">
              <input
                type={!streamShield || showGoogleKey ? "text" : "password"}
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder={serverSettings?.integrations?.googlePSI?.maskedKey || "AIzaSy..."}
                className="w-full px-3 py-2 pr-20 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGoogleKey(!showGoogleKey)}
                className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground"
                title={showGoogleKey ? "Mask Key" : "Reveal Key"}
              >
                {showGoogleKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <a
              href="https://developers.google.com/speed/docs/insights/v5/get-started"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Get Free Google PageSpeed API Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTestGoogle}
                disabled={googleTesting}
                className="px-3 py-1.5 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {googleTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-500" />}
                <span>Test Google API Connection</span>
              </button>
            </div>
          </div>

          {/* Google Test Result Badge */}
          {googleTestResult && (
            <div
              className={`p-3 rounded-md text-xs flex items-start gap-2 ${googleTestResult.success
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-500"
                }`}
            >
              {googleTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{googleTestResult.message || googleTestResult.error}</p>
                {googleTestResult.latencyMs && (
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    Response Latency: {googleTestResult.latencyMs}ms
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: AI Fix Assistant & Multi-Model Router */}
      <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">AI Multi-Model Router & Remediation Synthesizer</h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Supports Gemini, Groq, DeepSeek, Ollama, OpenAI & Claude
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Choose which AI provider generates framework-specific code diffs and audience perspectives. Use ultra-fast LPUs (Groq), open-weights local models (Ollama), cost-effective reasoning (DeepSeek), or zero-cost built-in templates.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">AI Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => {
                const val = e.target.value as any;
                setAiProvider(val);
                const defaults: Record<string, { model: string; url: string }> = {
                  GEMINI: { model: "gemini-1.5-flash", url: "" },
                  GROQ: { model: "llama-3.3-70b-versatile", url: "https://api.groq.com/openai/v1" },
                  CEREBRAS: { model: "llama-3.3-70b", url: "https://api.cerebras.ai/v1" },
                  OPENROUTER: { model: "openrouter/free", url: "https://openrouter.ai/api/v1" },
                  SAMBANOVA: { model: "Meta-Llama-3.3-70B-Instruct", url: "https://api.sambanova.ai/v1" },
                  GITHUB: { model: "gpt-4o-mini", url: "https://models.inference.ai.azure.com" },
                  NVIDIA: { model: "meta/llama-3.3-70b-instruct", url: "https://integrate.api.nvidia.com/v1" },
                  MISTRAL: { model: "mistral-small-latest", url: "https://api.mistral.ai/v1" },
                  DEEPSEEK: { model: "deepseek-chat", url: "https://api.deepseek.com" },
                  OLLAMA: { model: "qwen2.5-coder:3b", url: "http://localhost:11434/v1" },
                  OPENAI: { model: "gpt-4o-mini", url: "https://api.openai.com/v1" },
                  ANTHROPIC: { model: "claude-3-5-sonnet-20241022", url: "" },
                  CUSTOM: { model: "gpt-4o-mini", url: "http://localhost:1234/v1" },
                };
                if (defaults[val]) {
                  setAiModel(defaults[val].model);
                  setAiBaseUrl(defaults[val].url);
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="GROQ">Groq Cloud (Free Tier • 500+ tok/s Llama 3.3 & Qwen Coder)</option>
              <option value="CEREBRAS">Cerebras Inference (Free Tier • Ultra-Fast Wafer-Scale)</option>
              <option value="OPENROUTER">OpenRouter Free (:free Auto-Router • No Credit Card)</option>
              <option value="SAMBANOVA">SambaNova Cloud (Free Tier • Llama 3.3 70B)</option>
              <option value="GITHUB">GitHub Models (Free with GitHub PAT • GPT-4o Mini)</option>
              <option value="NVIDIA">NVIDIA NIM (Free API Credits • Build NVIDIA)</option>
              <option value="MISTRAL">Mistral AI (Free Experiment Tier • Codestral / Mistral Small)</option>
              <option value="GEMINI">Google Gemini (Free AI Studio Tier)</option>
              <option value="DEEPSEEK">DeepSeek (DeepSeek-V3 & R1)</option>
              <option value="OLLAMA">Local Ollama (100% Free, Offline Localhost GPU)</option>
              <option value="OPENAI">OpenAI (gpt-4o-mini / gpt-4o)</option>
              <option value="ANTHROPIC">Anthropic Claude (claude-3-5-sonnet)</option>
              <option value="CUSTOM">Custom OpenAI-Compatible Endpoint</option>
              <option value="BUILTIN">SpeedPilot Built-in Templates ($0 Cost, Offline)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Model Identifier</label>
            <input
              type="text"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>
        </div>

        {/* Model Presets Quick Pills */}
        {MODEL_PRESETS[aiProvider] && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-muted-foreground mr-1">Recommended Models:</span>
            {MODEL_PRESETS[aiProvider].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAiModel(preset.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition flex items-center gap-1.5 ${aiModel === preset.id
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                    : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
              >
                <span>{preset.label}</span>
                {preset.badge && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-background border border-border text-muted-foreground font-sans">
                    {preset.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Base URL configuration for OpenAI-compatible providers */}
        {!["GEMINI", "ANTHROPIC", "BUILTIN"].includes(aiProvider) && (
          <div className="space-y-1 pt-1">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>API Base URL / Endpoint</span>
              {aiProvider === "OLLAMA" && (
                <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> Localhost Daemon (No Cloud Egress)
                </span>
              )}
            </label>
            <input
              type="text"
              value={aiBaseUrl}
              onChange={(e) => setAiBaseUrl(e.target.value)}
              placeholder={
                aiProvider === "OLLAMA"
                  ? "http://localhost:11434/v1"
                  : aiProvider === "GROQ"
                    ? "https://api.groq.com/openai/v1"
                    : aiProvider === "DEEPSEEK"
                      ? "https://api.deepseek.com"
                      : "http://localhost:1234/v1"
              }
              className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              {aiProvider === "OLLAMA"
                ? "Standard Ollama OpenAI-compatible endpoint. Ensure Ollama is running (`ollama serve`)."
                : aiProvider === "GROQ"
                  ? "Groq Cloud OpenAI-compatible endpoint. Generous rate limits and sub-second responses."
                  : aiProvider === "DEEPSEEK"
                    ? "DeepSeek standard endpoint. Fast and highly cost-effective for coding & reasoning."
                    : "Point to any OpenAI-compatible server (vLLM, LocalAI, LM Studio, OpenRouter, Together AI)."}
            </p>
          </div>
        )}

        {/* API Key Input */}
        {aiProvider !== "BUILTIN" && (
          <div className="space-y-1 pt-1">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>
                {aiProvider} API Key {aiProvider === "OLLAMA" && "(Optional for Localhost)"}
              </span>
              {serverSettings?.integrations?.aiProvider?.isConfigured && (
                <span className="text-[10px] text-emerald-500 font-mono">
                  Active Server Key: {serverSettings.integrations.aiProvider.maskedKey}
                </span>
              )}
            </label>

            <div className="relative flex items-center">
              <input
                type={!streamShield || showAiKey ? "text" : "password"}
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                placeholder={
                  aiProvider === "OLLAMA"
                    ? "Not required for local Ollama"
                    : serverSettings?.integrations?.aiProvider?.maskedKey ||
                    (aiProvider === "GEMINI"
                      ? "AIzaSy..."
                      : aiProvider === "GROQ"
                        ? "gsk_..."
                        : "sk-...")
                }
                className="w-full px-3 py-2 pr-20 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              <button
                type="button"
                onClick={() => setShowAiKey(!showAiKey)}
                className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground"
                title={showAiKey ? "Mask Key" : "Reveal Key"}
              >
                {showAiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Provider Quick Links */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {aiProvider === "OLLAMA" ? (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span>Ready locally: ollama run qwen2.5-coder:3b</span>
            </div>
          ) : (
            (() => {
              const links: Record<string, { url: string; label: string }> = {
                GROQ: { url: "https://console.groq.com/keys", label: "Get Free Groq Cloud API Key" },
                CEREBRAS: { url: "https://cloud.cerebras.ai/", label: "Get Free Cerebras API Key" },
                OPENROUTER: { url: "https://openrouter.ai/keys", label: "Get Free OpenRouter Key (:free models)" },
                SAMBANOVA: { url: "https://cloud.sambanova.ai/apis", label: "Get Free SambaNova API Key" },
                GITHUB: { url: "https://github.com/marketplace/models", label: "Get Free GitHub Models PAT" },
                NVIDIA: { url: "https://build.nvidia.com/", label: "Get Free NVIDIA NIM Credits" },
                MISTRAL: { url: "https://console.mistral.ai/api-keys/", label: "Get Free Mistral API Key" },
                GEMINI: { url: "https://aistudio.google.com/app/apikey", label: "Get Free Google Gemini API Key" },
                DEEPSEEK: { url: "https://platform.deepseek.com/api_keys", label: "Get DeepSeek API Key" },
              };
              const info = links[aiProvider];
              return info ? (
                <a href={info.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  <span>{info.label}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : null;
            })()
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleTestAI}
              disabled={aiTesting || aiProvider === "BUILTIN"}
              className="px-3 py-1.5 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {aiTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
              <span>Test AI Connection</span>
            </button>
          </div>
        </div>

        {/* AI Test Result Badge */}
        {aiTestResult && (
          <div
            className={`p-3 rounded-md text-xs flex items-start gap-2 ${aiTestResult.success
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                : "bg-rose-500/10 border border-rose-500/20 text-rose-500"
              }`}
          >
            {aiTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{aiTestResult.message || aiTestResult.error}</p>
              {aiTestResult.latencyMs && (
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  Inference Latency: {aiTestResult.latencyMs}ms
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Tier Entitlements & Open Source Strategy */}
      <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold">Tier Entitlements & Open Core Settings</h2>
          </div>
          <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {tier === "OPEN_SOURCE" ? "Open-Source Core" : "Pro / Agency Edition"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setTier("OPEN_SOURCE")}
            className={`cursor-pointer p-4 rounded-lg border transition ${tier === "OPEN_SOURCE"
                ? "bg-primary/5 border-primary"
                : "bg-card border-border hover:bg-secondary/40"
              }`}
          >
            <div className="flex items-center justify-between font-semibold text-sm">
              <span>Open-Source Core (Self-Hosted)</span>
              <span className="text-xs text-muted-foreground font-mono">$0 / Free</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bring Your Own Key. Full source code access, local MySQL database, standard agentic scoring, and unlimited local audits.
            </p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Up to 500 URLs per bulk crawl</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Deterministic AI code fix templates</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>CSV and JSON export</span>
              </li>
            </ul>
          </div>

          <div
            onClick={() => setTier("PRO_AGENCY")}
            className={`cursor-pointer p-4 rounded-lg border transition ${tier === "PRO_AGENCY"
                ? "bg-primary/5 border-primary"
                : "bg-card border-border hover:bg-secondary/40"
              }`}
          >
            <div className="flex items-center justify-between font-semibold text-sm">
              <span>Pro / Agency Edition</span>
              <span className="text-xs text-primary font-mono">Full Power</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Deep WebMCP inspection, multi-sitemap automated discovery, client white-label reports, and scheduled cron monitoring.
            </p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Unlimited URLs with automated multi-sitemap crawler</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Deep DOM agentic tree inspection & /llms.txt check</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>White-label agency HTML & PDF client reports</span>
              </li>
            </ul>

            <div className="pt-3" onClick={(e) => e.stopPropagation()}>
              <RazorpayUpgradeButton
                planCode="PRO"
                label="Upgrade to Pro with Razorpay (₹2,900 / $29)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Settings Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleSaveSettings}
          className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
        >
          Save BYOK Settings & Preferences
        </button>
      </div>
    </div>
  );
}
