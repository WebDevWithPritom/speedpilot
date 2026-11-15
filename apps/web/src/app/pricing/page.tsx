import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  CheckCircle2,
  Heart,
  Sparkles,
  ShieldCheck,
  Star,
  Github,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Access & Plans — SpeedPilot",
  description:
    "SpeedPilot is 100% free and open source during public preview. All features are unlocked.",
};

export default function PricingPage() {
  return (
    <div className="space-y-16 py-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>100% Free &amp; Open Source</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          All features unlocked during public preview.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          SpeedPilot is completely free for developers, marketers, agencies, and SaaS teams. No subscriptions, no payment gateways, and no credit card required.
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
              <div className="text-xs text-emerald-500 font-semibold mt-0.5">Free forever</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Complete access to bulk audits, Core Web Vitals telemetry, SEO crawlers, and AI code diffs.
            </p>
            <ul className="space-y-2 text-xs pt-2 border-t border-border/50">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Bulk URL, CSV &amp; Sitemap audits (500+ URLs)</span>
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

        {/* Tier 2: Public Preview Unlocked */}
        <div className="p-6 rounded-xl border-2 border-emerald-500/40 bg-card shadow-lg flex flex-col justify-between space-y-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wider shadow-sm">
            Active Preview
          </div>
          <div className="space-y-4 pt-1">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Advanced SEO &amp; SERP Suite</span>
              </div>
              <div className="text-3xl font-extrabold font-mono mt-1">Unlocked <span className="text-sm font-normal text-muted-foreground">in Beta</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">Zero fees during public preview</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Full access to the scratch-built SERP rank tracker, competitor spy, and live crawler inspection.
            </p>
            <ul className="space-y-2 text-xs pt-2 border-t border-border/50">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Zero-Cost Google SERP Rank Tracker</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Top 10 Competitor Speed Battles</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Google People Also Ask (PAA) questions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>AI Rank-climbing action roadmaps</span>
              </li>
            </ul>
          </div>
          <Link
            href="/seo"
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition text-center flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Launch SEO Intelligence</span>
          </Link>
        </div>

        {/* Tier 3: Agency & Open Source */}
        <div className="p-6 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Agency &amp; Self-Hosted</span>
              </div>
              <div className="text-3xl font-extrabold font-mono mt-1">Apache 2.0</div>
              <div className="text-xs text-muted-foreground mt-0.5">Open source code</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Self-host on your own infrastructure or deploy with Docker Compose for complete data isolation.
            </p>
            <ul className="space-y-2 text-xs pt-2 border-t border-border/50">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>White-label public client share portals</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Automated CI/CD GitHub Action regression guard</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Docker Compose container orchestration</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Full TypeScript source code access</span>
              </li>
            </ul>
          </div>
          <a
            href="https://github.com/WebDevWithPritom/speedpilot"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-lg border border-border bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition text-center flex items-center justify-center gap-1.5"
          >
            <Github className="w-3.5 h-3.5" />
            <span>View on GitHub</span>
          </a>
        </div>
      </div>

      {/* GitHub Star Banner */}
      <div className="p-6 rounded-xl border border-border bg-secondary/30 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="space-y-1">
          <div className="text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Support the project by starring on GitHub</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Every star helps developers discover SpeedPilot and accelerates new feature releases.
          </p>
        </div>
        <a
          href="https://github.com/WebDevWithPritom/speedpilot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-xs font-semibold hover:bg-secondary transition shrink-0"
        >
          <Github className="w-4 h-4" />
          <span>Star on GitHub</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
