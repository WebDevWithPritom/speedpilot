"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Zap,
  ShieldCheck,
  Sparkles,
  Globe,
  TrendingUp,
  Layers,
  FileText,
  Code2,
  Briefcase,
  Users,
  ArrowRight,
  CheckCircle2,
  Sun,
  Moon,
  Gauge,
  Search,
  Star,
  Github,
  Heart,
  Coffee,
} from "lucide-react";

const PERSONA_PREVIEWS = {
  DEVELOPER: {
    label: "Developer",
    icon: Code2,
    headline: "Framework-aware code diffs & root-cause diagnostics",
    description:
      "Get exact Next.js, React, WordPress, or Laravel remediation snippets with render-blocking waterfall hints and verification steps.",
    sampleTitle: "Eliminate render-blocking CSS & preload LCP hero image",
    sampleSnippet: `<link rel="preload" as="image" href="/hero.webp" fetchPriority="high" />`,
  },
  MARKETER: {
    label: "Marketer",
    icon: TrendingUp,
    headline: "SEO indexability & conversion-impact clarity",
    description:
      "Translate Lighthouse metrics into organic search rankings, bounce-rate impact, meta/canonical health, and prioritized quick wins.",
    sampleTitle: "Fix slow mobile LCP (3.8s → 1.9s) on top landing pages",
    sampleSnippet: "Projected impact: Stronger Core Web Vitals ranking signal & lower mobile bounce rate.",
  },
  AGENCY: {
    label: "Agency",
    icon: Briefcase,
    headline: "Client-ready executive reports & multi-site audits",
    description:
      "Audit entire sitemaps in bulk, track before/after score deltas, and export clean HTML/PDF & CSV deliverables for client reviews.",
    sampleTitle: "Executive Summary: +24 pts Mobile Performance across 40 URLs",
    sampleSnippet: "Exportable PDF/CSV scorecard with resolved issues & sprint effort estimates.",
  },
  SAAS_TEAM: {
    label: "SaaS Team",
    icon: Users,
    headline: "Sprint-ready prioritization & regression monitoring",
    description:
      "Compare releases over time, catch Core Web Vitals regressions early, and share a single performance lens across product & engineering.",
    sampleTitle: "Release v2.4 comparison: 0 regressions, 6 CWV issues resolved",
    sampleSnippet: "Difficulty: Low • Impact: High • Automated signature cache hit (0 AI tokens).",
  },
} as const;

type PersonaKey = keyof typeof PERSONA_PREVIEWS;

export function LandingPage() {
  const [isDark, setIsDark] = useState(false);
  const [activePersona, setActivePersona] = useState<PersonaKey>("DEVELOPER");

  useEffect(() => {
    try {
      setIsDark(localStorage.getItem("sp_theme") === "dark");
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      if (nextDark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("sp_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("sp_theme", "light");
      }
    } catch {
      // Ignore
    }
  };

  const currentPersona = PERSONA_PREVIEWS[activePersona];
  const PersonaIcon = currentPersona.icon;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Public Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block">SpeedPilot</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block">
                Performance Intelligence
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <Link href="/features" className="hover:text-foreground transition">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition">
              Pricing &amp; Support
            </Link>
            <a href="#how-it-works" className="hover:text-foreground transition">
              How It Works
            </a>
            <a href="#personas" className="hover:text-foreground transition">
              Personas
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="https://github.com/WebDevWithPritom/speedpilot"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Star on GitHub"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Star on GitHub</span>
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold hover:bg-secondary transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Google PageSpeed + CrUX + Technical SEO + AI Fix Engine</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
              Bulk PageSpeed auditing with{" "}
              <span className="text-primary">AI-tailored code fixes</span>.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Audit single pages, CSV lists, or entire XML sitemaps in parallel. Combine real
              Lighthouse lab diagnostics, Chrome UX field telemetry, and live technical SEO checks
              with actionable fixes written for your exact stack and team.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
              >
                <Zap className="w-4 h-4" />
                Create Free Account
              </Link>
              <a
                href="https://github.com/WebDevWithPritom/speedpilot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-secondary transition"
              >
                <Github className="w-4 h-4" />
                <span>Star on GitHub</span>
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              </a>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition"
              >
                Sign In &rarr;
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Free workspace &amp; isolated projects
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Mobile &amp; Desktop parallel runs
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                SSRF-guarded URL crawler
              </span>
            </div>
          </div>

          {/* Live Platform Preview Card */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-foreground">
                  Audit Snapshot • Mobile &amp; Desktop
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  CWV Passing
                </span>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Perf", score: 96, color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" },
                    { label: "Access", score: 98, color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" },
                    { label: "Best", score: 100, color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" },
                    { label: "SEO", score: 97, color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" },
                  ].map((m) => (
                    <div key={m.label} className={`p-2.5 rounded-lg border ${m.color}`}>
                      <div className="text-xl font-extrabold font-mono">{m.score}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-md border border-border bg-secondary/30">
                    <div className="text-[10px] text-muted-foreground uppercase">LCP</div>
                    <div className="font-mono font-bold text-sm mt-0.5">1.6s</div>
                    <div className="text-[10px] text-emerald-500">Target ≤ 2.5s</div>
                  </div>
                  <div className="p-2.5 rounded-md border border-border bg-secondary/30">
                    <div className="text-[10px] text-muted-foreground uppercase">INP</div>
                    <div className="font-mono font-bold text-sm mt-0.5">95ms</div>
                    <div className="text-[10px] text-emerald-500">Target ≤ 200ms</div>
                  </div>
                  <div className="p-2.5 rounded-md border border-border bg-secondary/30">
                    <div className="text-[10px] text-muted-foreground uppercase">CLS</div>
                    <div className="font-mono font-bold text-sm mt-0.5">0.02</div>
                    <div className="text-[10px] text-emerald-500">Target ≤ 0.1</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-secondary/20 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      AI Fix Suggestion (Next.js Detected)
                    </span>
                    <span className="text-muted-foreground font-mono">High Impact</span>
                  </div>
                  <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto bg-background/70 p-2 rounded border border-border">
                    {`import Image from "next/image";\n<Image src="/hero.webp" priority sizes="100vw" />`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Everything Included
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Built for real-world performance engineering &amp; SEO teams
          </h2>
          <p className="text-sm text-muted-foreground">
            Stop running single-URL tests one tab at a time. SpeedPilot unifies diagnostics,
            crawling, AI remediation, and client reporting in one workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Zap,
              title: "Bulk URL & Sitemap Ingestion",
              desc: "Submit a single URL, paste batches, import CSVs, or auto-discover XML sitemaps and run Mobile + Desktop audits concurrently.",
            },
            {
              icon: Gauge,
              title: "Lighthouse Lab + CrUX Telemetry",
              desc: "Capture FCP, LCP, TBT, CLS, and Speed Index alongside real-world Chrome User Experience field distributions.",
            },
            {
              icon: Search,
              title: "Technical SEO Inspector",
              desc: "Crawl HTML for HTTP status, HTTPS, title/meta lengths, canonical mismatches, robots directives, H1s, and missing alt tags.",
            },
            {
              icon: Sparkles,
              title: "AI Fix Assistant & Code Diffs",
              desc: "Distills issue payloads and generates stack-specific fixes (Next.js, WordPress, React, Laravel, Shopify) with signature caching.",
            },
            {
              icon: Layers,
              title: "Monitoring & Comparisons",
              desc: "Track score deltas across releases, spot Core Web Vitals regressions immediately, and verify resolved bottlenecks.",
            },
            {
              icon: FileText,
              title: "Executive Reports & SSRF Guard",
              desc: "Export printable HTML/PDF summaries and CSV datasets while private-IP SSRF protection keeps every crawl safe.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-3"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-base">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
          <div className="max-w-xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              From raw URLs to shipped fixes in three steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Create a project & add URLs",
                desc: "Sign up for a free workspace, create a project, and paste URLs, upload a CSV, or discover pages from an XML sitemap.",
              },
              {
                step: "02",
                title: "Run parallel PageSpeed & SEO audits",
                desc: "SpeedPilot runs Google PageSpeed Insights, CrUX telemetry, and static SEO checks across Mobile and Desktop.",
              },
              {
                step: "03",
                title: "Review AI fixes & export reports",
                desc: "Switch between Developer, Marketer, Agency, or SaaS Team views, copy code diffs, or export CSV/PDF reports.",
              },
            ].map((s) => (
              <div key={s.step} className="p-6 rounded-xl border border-border bg-card space-y-2">
                <span className="text-xs font-mono font-bold text-primary">STEP {s.step}</span>
                <h3 className="font-semibold text-base">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Audience Personas */}
      <section id="personas" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Multi-Persona Lens
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            One audit, four tailored explanations
          </h2>
          <p className="text-sm text-muted-foreground">
            Switch the presentation lens anytime inside the platform to match who is reading the
            recommendation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            {(Object.keys(PERSONA_PREVIEWS) as PersonaKey[]).map((key) => {
              const p = PERSONA_PREVIEWS[key];
              const Icon = p.icon;
              const isSelected = activePersona === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActivePersona(key)}
                  className={`p-4 rounded-xl border text-left transition ${
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-2 ${isSelected ? "text-primary" : ""}`} />
                  <div className="font-semibold text-sm">{p.label}</div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <PersonaIcon className="w-4 h-4" />
              <span>{currentPersona.label} Lens</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight">{currentPersona.headline}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentPersona.description}
            </p>
            <div className="p-3.5 rounded-lg border border-border bg-secondary/30 space-y-1.5">
              <div className="text-xs font-semibold text-foreground">
                {currentPersona.sampleTitle}
              </div>
              <div className="text-xs font-mono text-muted-foreground break-all">
                {currentPersona.sampleSnippet}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans / CTA */}
      <section id="pricing" className="border-t border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Get Started
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Start auditing in under a minute
            </h2>
            <p className="text-sm text-muted-foreground">
              Create your free workspace now and optionally add your own Google PageSpeed or AI
              keys anytime in Settings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-xl border border-border bg-card space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Free Community Workspace
                </div>
                <div className="text-3xl font-extrabold font-mono">$0</div>
                <p className="text-xs text-muted-foreground">
                  Isolated workspace with real Lighthouse lab audits, CrUX data, SEO inspection,
                  and AI remediation.
                </p>
                <ul className="space-y-2 text-xs text-foreground pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Single, bulk, CSV &amp; sitemap URL auditing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    All 4 audience persona lenses included
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Bring your own Google PSI / Gemini / OpenAI keys
                  </li>
                </ul>
              </div>
              <Link
                href="/signup"
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition text-center"
              >
                Create Free Account
              </Link>
            </div>

            <div className="p-6 rounded-xl border border-primary/40 bg-card space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Already Registered?
                </div>
                <div className="text-2xl font-bold">Open Your Workspace</div>
                <p className="text-xs text-muted-foreground">
                  Sign in to view your monitored projects, recent audit jobs, comparison matrices,
                  API keys, and scheduled exports.
                </p>
                <ul className="space-y-2 text-xs text-foreground pt-2">
                  <li className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                    Resume active projects &amp; historical score trends
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    Access cached AI remediation &amp; deep search
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    Export executive PDF &amp; CSV reports
                  </li>
                </ul>
              </div>
              <Link
                href="/login"
                className="w-full py-2.5 rounded-lg border border-border bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition text-center"
              >
                Sign In to SpeedPilot
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Flame className="w-4 h-4 text-primary fill-current" />
            <span>SpeedPilot</span>
            <span className="text-muted-foreground font-normal">
              — Universal Website Performance Intelligence
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/features" className="hover:text-foreground transition">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition">
              Pricing &amp; Support
            </Link>
            <a
              href="https://github.com/WebDevWithPritom/speedpilot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            </a>
            <Link href="/login" className="hover:text-foreground transition">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-foreground transition">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
