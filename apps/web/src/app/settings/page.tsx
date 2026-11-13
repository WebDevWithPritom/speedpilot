"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export default function SettingsPage() {
  const [streamShield, setStreamShield] = useState(true);
  const [loading, setLoading] = useState(true);
  const [serverSettings, setServerSettings] = useState<any>(null);

  // Form states
  const [googleKey, setGoogleKey] = useState("");
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [googleTesting, setGoogleTesting] = useState(false);
  const [googleTestResult, setGoogleTestResult] = useState<any>(null);

  const [aiProvider, setAiProvider] = useState<"GEMINI" | "OPENAI" | "ANTHROPIC" | "BUILTIN">("GEMINI");
  const [aiKey, setAiKey] = useState("");
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiModel, setAiModel] = useState("gemini-1.5-flash");
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
    const savedTier = localStorage.getItem("sp_tier");

    if (savedGoogleKey) setGoogleKey(savedGoogleKey);
    if (savedAiProvider) setAiProvider(savedAiProvider as any);
    if (savedAiKey) setAiKey(savedAiKey);
    if (savedAiModel) setAiModel(savedAiModel);
    if (savedTier) setTier(savedTier as any);

    // Fetch server status
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((data) => {
        setServerSettings(data);
        if (data.integrations?.aiProvider?.detectedProvider) {
          if (!savedAiProvider) {
            setAiProvider(data.integrations.aiProvider.detectedProvider);
          }
        }
      })
      .catch(() => {})
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
          className={`cursor-pointer px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition ${
            streamShield
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
              className={`p-3 rounded-md text-xs flex items-start gap-2 ${
                googleTestResult.success
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

      {/* Section 2: AI Fix Assistant & Model Configuration */}
      <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">AI Fix Assistant & Code Synthesizer (BYOK)</h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Supports Google Gemini, OpenAI & Claude
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Choose which AI model generates framework-specific code diffs and audience perspectives. If no key is entered, SpeedPilot automatically uses high-performance deterministic templates for $0 cost.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">AI Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => {
                const val = e.target.value as any;
                setAiProvider(val);
                if (val === "GEMINI") setAiModel("gemini-1.5-flash");
                if (val === "OPENAI") setAiModel("gpt-4o-mini");
                if (val === "ANTHROPIC") setAiModel("claude-3-5-sonnet");
              }}
              className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="GEMINI">Google Gemini (Recommended - Free Tier Available)</option>
              <option value="OPENAI">OpenAI (gpt-4o-mini / gpt-4o)</option>
              <option value="ANTHROPIC">Anthropic Claude (claude-3-5-sonnet)</option>
              <option value="BUILTIN">SpeedPilot Built-in Templates ($0 Cost)</option>
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

        {aiProvider !== "BUILTIN" && (
          <div className="space-y-1 pt-1">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>{aiProvider} API Key</span>
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
                placeholder={serverSettings?.integrations?.aiProvider?.maskedKey || (aiProvider === "GEMINI" ? "AIzaSy..." : "sk-...")}
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

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={handleTestAI}
            disabled={aiTesting || aiProvider === "BUILTIN"}
            className="px-3 py-1.5 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {aiTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
            <span>Test AI Model Connection</span>
          </button>
        </div>

        {/* AI Test Result Badge */}
        {aiTestResult && (
          <div
            className={`p-3 rounded-md text-xs flex items-start gap-2 ${
              aiTestResult.success
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
            className={`cursor-pointer p-4 rounded-lg border transition ${
              tier === "OPEN_SOURCE"
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
            className={`cursor-pointer p-4 rounded-lg border transition ${
              tier === "PRO_AGENCY"
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
