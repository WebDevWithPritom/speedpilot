# SpeedPilot ⚡

> **Universal Website Performance Intelligence & Optimization Platform**

[![Live Demo](https://img.shields.io/badge/Demo-speedpilot.webdevwithpritom.com-0070f3?style=flat&logo=vercel)](https://speedpilot.webdevwithpritom.com)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/WebDevWithPritom/speedpilot?style=social)](https://github.com/WebDevWithPritom/speedpilot)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue)](https://neon.tech/)

---

## 🌐 Live Application

- **Production URL:** [https://speedpilot.webdevwithpritom.com](https://speedpilot.webdevwithpritom.com)
- **Instant 1-Click Speed Test:** Test any public URL on the homepage without login.
- **Pricing & Pro Passes:** [View Pricing & Plans](https://speedpilot.webdevwithpritom.com/pricing)

---

## 🌟 What is SpeedPilot?

SpeedPilot runs multi-page Lighthouse, CrUX, and SEO audits in bulk, tracks SERP rankings, and outputs framework-specific code fixes:

1. **Instant 1-Click Audits:** Benchmark any public website immediately from the hero section (no registration required).
2. **Bulk Multi-Page Auditing:** Audit single URLs, CSV lists, or auto-discover entire XML sitemaps (500+ URLs) concurrently across Mobile and Desktop with an auto-resuming rolling serverless runner.
3. **Lab vs Field Metrics:** Strict separation of **Lighthouse synthetic lab diagnostics** and **Chrome UX Report (CrUX) 28-day real-user field telemetry** (never confuses TBT with INP).
4. **Zero-Cost SERP Rank Tracker (DataForSEO Alternative):** Dual-engine Google SERP tracker and competitor position extractor with 0 monthly subscription costs, Top 10 organic competitor spy, Google People Also Ask (PAA) questions, and AI rank-climbing action plan.
5. **All-in-One SEO Suite:** Screaming Frog Spider mode (internal/external/nofollow link equity, heading hierarchy, indexability), Semrush mode (600px pixel-width Google SERP simulator & TF-IDF keyword density), and Ahrefs mode (0-100 Site Health score & Schema.org rich types validator).
6. **AI CI/CD Regression Guard & PR Bot:** Official composite GitHub Action (`action.yml`) evaluating Core Web Vitals budgets on pull requests and posting automated markdown scorecards with `.patch` fixes.
7. **Context-Aware AI Code Fixes:** Framework-specific code diffs for Next.js, React, WordPress, WooCommerce, Shopify, or Laravel with signature caching.
8. **Multi-Persona Perspective Lens:** View every audit through 4 dedicated lenses: **Developer**, **Marketer**, **Agency**, or **SaaS Team**.
9. **Monetization & Agency Passes:** Built-in Razorpay checkout supporting UPI, QR, Cards, and Netbanking for Community Supporter (₹499), Pro, and Agency passes.
10. **Executive Deliverables:** Export printer-ready branded HTML/PDF client summaries and CSV datasets.

---

## 🏗️ Architecture & Monorepo

SpeedPilot is structured as a modular TypeScript monorepo:

```
speedpilot/
├── apps/
│   ├── web/                    # Next.js 15 App Router, UI, REST API, Billing
│   └── worker/                 # Standalone BullMQ background audit worker
├── packages/
│   ├── database/               # Prisma ORM schema & Neon PostgreSQL client
│   ├── shared/                 # Zod validation schemas, TypeScript types, metric constants
│   ├── security/               # SSRF protection, DNS resolver check, safe-fetch client
│   ├── pagespeed/              # Google PageSpeed Insights & CrUX API client with rate limiter
│   ├── seo-engine/             # Safe HTML crawler & Technical SEO evaluator
│   ├── ai-engine/              # Compact evidence extractor & audience-tailored prompt engine
│   └── report-generator/       # High-fidelity PDF and CSV generator
├── docs/                       # Comprehensive documentation & architecture specifications
└── docker-compose.yml          # Container orchestration for Postgres, Redis, Web, and Worker
```

---

## 🚀 Quickstart

### Option 1: Live Cloud App
Visit [https://speedpilot.webdevwithpritom.com](https://speedpilot.webdevwithpritom.com) to run audits instantly.

### Option 2: Local Development
```bash
# 1. Clone repository
git clone https://github.com/WebDevWithPritom/speedpilot.git
cd speedpilot

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Generate database client
npm run db:generate

# 5. Start dev server
npm run dev
```

---

## 🔑 Bring-Your-Own-Key (BYOK)

SpeedPilot includes generous free community quotas and allows users to optionally connect their own API keys via the Settings dashboard:
- **Google PageSpeed Insights & CrUX API:** 25,000 queries/day free tier.
- **AI Providers Supported:** Google Gemini (1.5 Flash / 2.0), Groq Cloud (Llama 3.3 70B & Qwen Coder), Cerebras, OpenRouter, GitHub Models, SambaNova, NVIDIA NIM, OpenAI, Anthropic, and local Ollama.

---

## 🛡️ Security & Privacy

SpeedPilot takes SSRF, data privacy, and isolation seriously:
- **SSRF Protection:** All URL crawlers pass through `@speedpilot/security` with DNS resolution guarding against private IPs, loopback, and cloud metadata (`169.254.169.254`).
- **Timing-Safe Authentication:** Timing-safe comparisons (`crypto.timingSafeEqual`) on admin sessions and webhook HMAC signatures.
- **Client Key Isolation:** User API keys remain in local browser storage (`localStorage`) and are never written to server logs.

---

## ⭐ Star & Support

If SpeedPilot helps your team ship faster websites, consider starring the repo:

- ⭐ **Star on GitHub:** [WebDevWithPritom/speedpilot](https://github.com/WebDevWithPritom/speedpilot)
- 🚀 **Pro & Agency Passes:** [speedpilot.webdevwithpritom.com/pricing](https://speedpilot.webdevwithpritom.com/pricing)

---

## 📄 License

SpeedPilot Open-Source Core is licensed under the [Apache License, Version 2.0](LICENSE).
