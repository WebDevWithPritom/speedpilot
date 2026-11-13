import { ShieldCheck, Key, Webhook, Cpu, CreditCard } from "lucide-react";

export const revalidate = 0;

export default function SettingsPage() {
  const isPSIConfigured = !!process.env.GOOGLE_PAGESPEED_API_KEY;
  const isCrUXConfigured = !!process.env.GOOGLE_CRUX_API_KEY;
  const isOpenAIConfigured = !!process.env.OPENAI_API_KEY;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Developer API & Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage REST API keys, outbound webhooks, cloud credentials, and plan entitlements.
        </p>
      </div>

      {/* Integration Credentials Status Checklist */}
      <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          Integration Credentials Checklist
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded border border-border bg-secondary/30 space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <span>Google PageSpeed API</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                isPSIConfigured ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
              }`}>
                {isPSIConfigured ? "Configured" : "Unset (Default Quota)"}
              </span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              {isPSIConfigured
                ? "API key active with authenticated high quota."
                : "Add GOOGLE_PAGESPEED_API_KEY to .env for 240+ req/min."}
            </p>
          </div>

          <div className="p-3.5 rounded border border-border bg-secondary/30 space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <span>Chrome UX Report (CrUX)</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                isCrUXConfigured ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-500/10 text-zinc-500"
              }`}>
                {isCrUXConfigured ? "Configured" : "Inherited from PSI"}
              </span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Provides 28-day real user Core Web Vitals (LCP, INP, CLS).
            </p>
          </div>

          <div className="p-3.5 rounded border border-border bg-secondary/30 space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <span>OpenAI Fix Assistant</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                isOpenAIConfigured ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
              }`}>
                {isOpenAIConfigured ? "Active (gpt-4o-mini)" : "Template Mode"}
              </span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              {isOpenAIConfigured
                ? "Real-time AI code fix synthesis enabled."
                : "SpeedPilot uses built-in deterministic framework templates."}
            </p>
          </div>
        </div>
      </div>

      {/* Developer REST API Keys */}
      <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              REST API Authentication Keys
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use Bearer tokens to trigger audits programmatically from CI/CD pipelines.
            </p>
          </div>

          <button className="px-3 py-1.5 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 transition">
            Create API Key
          </button>
        </div>

        <div className="p-4 rounded border border-dashed border-border bg-secondary/20 text-center text-xs text-muted-foreground">
          No external API keys generated yet. Click above to generate your first key (<code className="font-mono text-foreground">sp_live_...</code>).
        </div>
      </div>

      {/* Subscription & Entitlements */}
      <div className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            Plan & Usage Entitlements
          </h2>
          <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            Open-Source Core Edition
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded bg-secondary/30 border border-border">
            <div className="text-muted-foreground text-[11px]">Monthly Audits</div>
            <div className="font-bold text-sm mt-0.5">Unlimited</div>
          </div>
          <div className="p-3 rounded bg-secondary/30 border border-border">
            <div className="text-muted-foreground text-[11px]">Concurrency</div>
            <div className="font-bold text-sm mt-0.5">5 parallel jobs</div>
          </div>
          <div className="p-3 rounded bg-secondary/30 border border-border">
            <div className="text-muted-foreground text-[11px]">Max URLs / Batch</div>
            <div className="font-bold text-sm mt-0.5">500 URLs</div>
          </div>
          <div className="p-3 rounded bg-secondary/30 border border-border">
            <div className="text-muted-foreground text-[11px]">SSRF Protection</div>
            <div className="font-bold text-sm text-emerald-500 mt-0.5">Enforced</div>
          </div>
        </div>
      </div>
    </div>
  );
}

