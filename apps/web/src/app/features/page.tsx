import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  Gauge,
  Search,
  Sparkles,
  Layers,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Flame,
  Globe,
  Database,
  Cpu,
  Star,
  Github,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features — SpeedPilot Universal Performance Intelligence",
  description:
    "Explore the full feature suite of SpeedPilot: bulk Google PageSpeed audits, Chrome UX Report field telemetry, technical SEO crawlers, AI remediation, and automated comparisons.",
};

export default function FeaturesPage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Full Architecture &amp; Capabilities</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Everything you need to benchmark, crawl &amp; fix websites at scale.
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          SpeedPilot replaces fragmented CLI tools and manual tab-checking with a unified platform for
          engineering, marketing, agency, and SaaS teams.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
          >
            <Zap className="w-4 h-4" />
            Get Started Free
          </Link>
          <a
            href="https://github.com/WebDevWithPritom/speedpilot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-secondary transition"
          >
            <Github className="w-4 h-4" />
            <span>Star on GitHub</span>
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          </a>
        </div>
      </div>

      {/* Feature Deep Dive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            icon: Zap,
            title: "Multi-Source Bulk Ingestion",
            desc: "Audit single URLs, paste raw URL lists, upload CSV sheets, or auto-crawl live XML sitemaps. Concurrently audits Mobile & Desktop in parallel.",
            points: ["CSV batch uploads", "XML sitemap auto-discovery", "Mobile + Desktop concurrency"],
          },
          {
            icon: Gauge,
            title: "Google PSI & Real CrUX Telemetry",
            desc: "Collect synthetic Lighthouse lab audits (FCP, LCP, TBT, CLS, Speed Index) alongside real-world 75th percentile Chrome UX Report distributions.",
            points: ["2026 Core Web Vitals thresholds", "INP (Interaction to Next Paint)", "Historical lab scores"],
          },
          {
            icon: Search,
            title: "Technical SEO Crawler",
            desc: "Zero-overhead static HTML crawler that audits HTTP/HTTPS health, title & description tags, canonical mismatches, robots directives, and image alt attributes.",
            points: ["SSRF safety via private IP blocking", "OpenGraph & metadata inspection", "Canonical match validation"],
          },
          {
            icon: Sparkles,
            title: "AI-Powered Remediation Engine",
            desc: "Distills multi-megabyte Lighthouse JSON payloads into concise diagnostic context and writes exact framework-specific code diffs.",
            points: ["Next.js, React, WP, Laravel & Shopify", "Signature hash caching (0 AI cost)", "Bring-your-own Gemini/OpenAI key"],
          },
          {
            icon: Layers,
            title: "Release Comparisons & Regressions",
            desc: "Matrix comparison endpoint automatically calculates performance score deltas, newly introduced regressions, and verified resolved bottlenecks.",
            points: ["Before vs. After score deltas", "Resolved vs. Regressed badges", "Historical trend telemetry"],
          },
          {
            icon: FileText,
            title: "White-Label & Executive Reports",
            desc: "Export printable executive HTML/PDF scorecards, audit histories, and structured CSV datasets formatted for agency clients and engineering sprints.",
            points: ["Print-ready HTML/PDF formatting", "Structured CSV data exports", "Agency branding support"],
          },
        ].map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold tracking-tight">{feat.title}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>

              <ul className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                {feat.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="p-8 sm:p-12 rounded-2xl border border-border bg-card/60 text-center space-y-4 max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Ready to supercharge your site performance?
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          Create an isolated workspace in 30 seconds. Run your first audit with zero configuration.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
          >
            <Zap className="w-4 h-4" />
            Create Free Account
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-secondary transition"
          >
            View Pricing &amp; Support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
