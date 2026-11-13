import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  CheckCircle2,
  Heart,
  Coffee,
  Sparkles,
  ShieldCheck,
  Star,
  Github,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing & Community Support — SpeedPilot",
  description:
    "SpeedPilot plans: free community workspace, creator passes, and community supporter tiers.",
};

export default function PricingPage() {
  return (
    <div className="space-y-16 py-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>Transparent &amp; Open Source</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Simple pricing. Support open source.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Use the full open-source community edition for free, or support development through a
          supporter pass or coffee.
        </p>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
        {/* Tier 1: Free Community */}
        <div className="p-6 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Community Edition
              </div>
              <div className="text-3xl font-extrabold font-mono mt-1">$0</div>
              <div className="text-xs text-muted-foreground mt-0.5">Free forever</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Complete access to bulk audits, Core Web Vitals telemetry, SEO crawlers, and AI code diffs.
            </p>
            <ul className="space-y-2 text-xs pt-2 border-t border-border/50">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Bulk URL, CSV &amp; Sitemap audits</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>All 4 audience persona lenses</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Bring Your Own Keys (BYOK) in Settings</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Executive HTML &amp; CSV export</span>
              </li>
            </ul>
          </div>
          <Link
            href="/signup"
            className="w-full py-2.5 rounded-lg border border-border bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition text-center"
          >
            Create Free Account
          </Link>
        </div>

        {/* Tier 2: Community Supporter / Buy Me a Coffee */}
        <div className="p-6 rounded-xl border-2 border-amber-500/40 bg-card shadow-lg flex flex-col justify-between space-y-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black uppercase tracking-wider shadow-sm">
            Community Supporter
          </div>
          <div className="space-y-4 pt-1">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5" />
                <span>Buy Me a Coffee / Supporter</span>
              </div>
              <div className="text-3xl font-extrabold font-mono mt-1">$5 <span className="text-sm font-normal text-muted-foreground">one-time</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">Direct creator contribution</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Support server costs, independent open-source development, and speed intelligence research.
            </p>
            <ul className="space-y-2 text-xs pt-2 border-t border-border/50">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Directly supports project hosting &amp; maintenance</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Supporter badge on project repo</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Priority feature request consideration</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Our eternal gratitude</span>
              </li>
            </ul>
          </div>
          <a
            href="https://buymeacoffee.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Support via Buy Me a Coffee</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Tier 3: Pro Pass */}
        <div className="p-6 rounded-xl border border-primary/40 bg-card shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pro &amp; Agency Pass</span>
              </div>
              <div className="text-3xl font-extrabold font-mono mt-1">$29 <span className="text-sm font-normal text-muted-foreground">/ month</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">High volume &amp; priority quotas</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Designed for agencies managing dozens of client sites with automated cron monitoring and API keys.
            </p>
            <ul className="space-y-2 text-xs pt-2 border-t border-border/50">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Unlimited concurrent audits</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Automated weekly/monthly audit cron</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Programmatic Developer API Keys</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>White-label PDF branding</span>
              </li>
            </ul>
          </div>
          <Link
            href="/signup?redirect=%2Fsettings"
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition text-center"
          >
            Upgrade via Settings
          </Link>
        </div>
      </div>

      {/* GitHub Star Banner */}
      <div className="p-6 rounded-xl border border-border bg-secondary/30 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="space-y-1">
          <div className="text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Support the project for free by starring on GitHub</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Every star helps developers discover SpeedPilot and drives faster feature updates.
          </p>
        </div>
        <a
          href="https://github.com/WebDevWithPritom/speedpilot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-xs font-semibold hover:bg-secondary transition shrink-0"
        >
          <Github className="w-4 h-4" />
          <span>Star WebDevWithPritom/speedpilot</span>
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
        </a>
      </div>
    </div>
  );
}
