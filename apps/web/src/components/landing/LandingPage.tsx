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
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { InstantAuditBar } from "./InstantAuditBar";
import { BeforeAfterComparison } from "./BeforeAfterComparison";

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

const FAQS = [
  {
    q: "How does SpeedPilot differ from running PageSpeed Insights manually?",
    a: "Google PageSpeed Insights only tests one page at a time with generic text advice. SpeedPilot runs entire sitemaps or CSV lists in parallel, stores audit history over time, and uses an AI fix engine that writes syntactically valid code diffs tailored specifically to your framework (Next.js, React, WordPress, Shopify, Laravel).",
  },
  {
    q: "Do I need my own API keys to get started?",
    a: "No! SpeedPilot works right out of the box with generous built-in community allowances. If your team audits thousands of URLs weekly or wants higher rate limits, you can easily plug in your own free Google PageSpeed API key and OpenAI or Gemini keys in Settings.",
  },
  {
    q: "Can I test my site without creating an account?",
    a: "Yes! Use the 1-click Instant Audit bar right on this page. It connects to the live Lighthouse lab and Core Web Vitals telemetry engine to return performance, accessibility, and SEO scores immediately. When you are ready to save history or generate full code diffs, you can create a free account.",
  },
  {
    q: "Is SpeedPilot open source?",
    a: "Yes, 100% open source under the MIT license on GitHub. You can inspect the complete monorepo, self-host using Docker, or contribute new framework parsers and diagnostic features.",
  },
  {
    q: "Can I export client-ready PDF and CSV reports?",
    a: "Yes! SpeedPilot includes one-click export for executive branded HTML summaries (print-friendly to PDF) and raw CSV datasets of all lab and field Core Web Vitals metrics.",
  },
];

export function LandingPage() {
  const [isDark, setIsDark] = useState(false);
  const [activePersona, setActivePersona] = useState<PersonaKey>("DEVELOPER");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
            <a href="#test" className="hover:text-foreground transition">
              Instant Audit
            </a>
            <Link href="/features" className="hover:text-foreground transition">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition">
              Pricing &amp; Support
            </Link>
            <a href="#comparison" className="hover:text-foreground transition">
              Before &amp; After
            </a>
            <a href="#faq" className="hover:text-foreground transition">
              FAQ
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
      <section className="relative overflow-hidden border-b border-border py-14 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Main Hero Copy */}
          <div className="text-center max-w-3xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Google PageSpeed + CrUX + Technical SEO + AI Code Diffs</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Bulk PageSpeed auditing with{" "}
              <span className="text-primary">AI-tailored code fixes</span>.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Audit single URLs, CSV lists, or entire XML sitemaps in parallel. SpeedPilot combines
              real Lighthouse lab tests, Chrome UX field metrics, and static SEO checks with
              syntactically valid code diffs written for your exact stack.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
              >
                <Zap className="w-4 h-4" />
                Create Free Workspace
              </Link>
              <a
                href="https://github.com/WebDevWithPritom/speedpilot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-secondary transition"
              >
                <Github className="w-4 h-4" />
                <span>Star on GitHub</span>
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              </a>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-secondary transition"
              >
                <Zap className="w-4 h-4 text-primary" />
                <span>Pricing &amp; Plans</span>
              </Link>
            </div>
          </div>

          {/* Instant 1-Click Audit Bar Section */}
          <div id="test" className="pt-2">
            <InstantAuditBar />
          </div>

          {/* Value Props Row */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-2 text-xs text-muted-foreground">
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
              Next.js, React, WordPress &amp; Laravel diffs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              SSRF-guarded URL crawler
            </span>
          </div>
        </div>
      </section>

      {/* Live Social Proof / Metrics Row */}
      <section className="border-b border-border bg-card/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-primary">12,400+</div>
            <div className="text-xs text-muted-foreground font-medium mt-1">URLs Audited</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">4.2x</div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              Faster CWV Remediation
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-500">100%</div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              Open Source (MIT License)
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">0 min</div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              Setup Required (Runs in Cloud)
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Before & After Visualizer */}
      <section id="comparison" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <BeforeAfterComparison />
      </section>

      {/* Core Capabilities */}
      <section id="capabilities" className="border-t border-border bg-card/30 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Full Spectrum Intelligence
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Engineered for web performance engineers &amp; SEO teams
            </h2>
            <p className="text-sm text-muted-foreground">
              Stop running single-URL tests tab by tab. SpeedPilot unifies batch diagnostics,
              crawling, stack-aware code remediation, and executive client reports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Bulk URL & Sitemap Ingestion",
                desc: "Submit a single URL, paste batches, import CSVs, or auto-discover XML sitemaps and run Mobile + Desktop audits concurrently.",
              },
              {
                icon: Gauge,
                title: "Lighthouse Lab + CrUX Telemetry",
                desc: "Capture FCP, LCP, TBT, CLS, and Speed Index alongside real-world Chrome User Experience 75th-percentile field distributions.",
              },
              {
                icon: Search,
                title: "Technical SEO Inspector",
                desc: "Crawl HTML for status codes, HTTPS, title/meta lengths, canonical tags, robots directives, H1 counts, and missing alt tags.",
              },
              {
                icon: Sparkles,
                title: "AI Fix Assistant & Code Diffs",
                desc: "Distills issue payloads and generates stack-specific remediation (Next.js, WordPress, React, Laravel, Shopify) with signature caching.",
              },
              {
                icon: Layers,
                title: "Monitoring & Comparisons",
                desc: "Track score deltas across releases, spot Core Web Vitals regressions early, and verify resolved bottlenecks with ease.",
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
                  className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-3 transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-12">
          <div className="max-w-xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Simple 3-Step Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              From unoptimized pages to shipped fixes in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Add your URLs or Sitemap",
                desc: "Paste single URLs, upload a CSV list, or link your XML sitemap to discover every public page automatically.",
              },
              {
                step: "02",
                title: "Run Parallel Audits",
                desc: "SpeedPilot dispatches Google PageSpeed Insights, Chrome UX telemetry, and static SEO checks across Mobile and Desktop in parallel.",
              },
              {
                step: "03",
                title: "Apply Code Diffs & Export",
                desc: "Copy AI-synthesized Next.js/React/WordPress remediation snippets, share persona-specific insights, or export PDF/CSV reports.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="p-6 rounded-2xl border border-border bg-card space-y-3 relative overflow-hidden"
              >
                <div className="text-xs font-mono font-bold text-primary">STEP {s.step}</div>
                <h3 className="font-semibold text-base">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Audience Personas */}
      <section id="personas" className="border-t border-border bg-card/40 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Multi-Persona Lens
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              One audit, four tailored explanations
            </h2>
            <p className="text-sm text-muted-foreground">
              Switch the explanation lens anytime to match whoever is reading the results.
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
                    className={`p-4 rounded-xl border text-left transition cursor-pointer ${
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

            <div className="lg:col-span-7 p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                <PersonaIcon className="w-4 h-4" />
                <span>{currentPersona.label} Lens</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight">{currentPersona.headline}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentPersona.description}
              </p>
              <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-1.5">
                <div className="text-xs font-semibold text-foreground">
                  {currentPersona.sampleTitle}
                </div>
                <div className="text-xs font-mono text-muted-foreground break-all">
                  {currentPersona.sampleSnippet}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="border-t border-border py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary flex items-center justify-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              Got Questions?
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything you need to know about SpeedPilot audits, privacy, and open-source models.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-xl border border-border bg-card overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm cursor-pointer hover:bg-secondary/30 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Plans / Creator Supporter Pass */}
      <section id="pricing" className="border-t border-border bg-card/40 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Transparent &amp; Open
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Free community tier. Optional creator support.
            </h2>
            <p className="text-sm text-muted-foreground">
              SpeedPilot is free for individuals and teams. Support ongoing development or upgrade
              to unlock verified high-speed pipelines and agency features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {/* Free Tier */}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Free Community
                </div>
                <div className="text-3xl font-extrabold font-mono">$0</div>
                <p className="text-xs text-muted-foreground">
                  Complete access to bulk audits, Lighthouse metrics, SEO crawler, and AI diffs.
                </p>
                <ul className="space-y-2 text-xs text-foreground pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Single, bulk, CSV &amp; sitemap auditing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    All 4 audience persona lenses
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Bring Your Own API Keys in Settings
                  </li>
                </ul>
              </div>
              <Link
                href="/signup"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition text-center"
              >
                Create Free Account
              </Link>
            </div>

            {/* Supporter Tier */}
            <div className="p-6 rounded-2xl border-2 border-amber-500/40 bg-card space-y-4 flex flex-col justify-between shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black uppercase tracking-wider shadow-sm">
                Recommended
              </div>
              <div className="space-y-3 pt-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  <span>Supporter Pass</span>
                </div>
                <div className="text-3xl font-extrabold font-mono">
                  ₹499 <span className="text-xs font-normal text-muted-foreground">one-time</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fuel open-source engineering, cloud bandwidth, and high-speed API endpoints.
                </p>
                <ul className="space-y-2 text-xs text-foreground pt-2">
                  <li className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0 fill-rose-500" />
                    <span>Direct open-source supporter badge</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Priority feature requests on GitHub</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Direct Razorpay checkout (Cards, UPI)</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/pricing"
                className="w-full py-2.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition text-center flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Get Supporter Pass</span>
              </Link>
            </div>

            {/* GitHub Star & Community */}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5" />
                  <span>Star on GitHub</span>
                </div>
                <div className="text-3xl font-extrabold font-mono">Open</div>
                <p className="text-xs text-muted-foreground">
                  SpeedPilot is licensed under MIT. Join contributors, fork the repository, and file
                  issues.
                </p>
                <ul className="space-y-2 text-xs text-foreground pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Full Next.js &amp; Prisma monorepo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Self-host on Railway, Vercel or VPS
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Submit PRs &amp; framework adapters
                  </li>
                </ul>
              </div>
              <a
                href="https://github.com/WebDevWithPritom/speedpilot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl border border-border bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition text-center flex items-center justify-center gap-1.5"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Star WebDevWithPritom/speedpilot</span>
              </a>
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
            <Link href="/pricing" className="flex items-center gap-1 hover:text-foreground transition text-primary">
              <Zap className="w-3.5 h-3.5" />
              <span>Pricing</span>
            </Link>
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
