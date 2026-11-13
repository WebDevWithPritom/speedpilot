# SpeedPilot ⚡

> **Universal Website Performance Intelligence & Optimization Platform**  
> *"Audit. Understand. Optimize. Improve."*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Redis-red)](https://bullmq.io/)

---

## 🌟 What is SpeedPilot?

SpeedPilot transforms raw website performance auditing into an actionable, automated intelligence lifecycle. Unlike basic single-page checkers, SpeedPilot provides:

1. **Bulk Multi-Page Auditing:** Audit 1 or 500+ URLs at once via raw text, CSV upload, or XML sitemap discovery.
2. **Dual-Lens Data Integrity:** Strict separation of **Lighthouse synthetic lab diagnostics** and **Chrome UX Report (CrUX) 28-day real-user field telemetry** (never confuses TBT with INP or shows fake zeros).
3. **Independent Technical SEO Crawler:** In-house static HTML engine inspecting metadata, canonicals, robots directives, heading structure, broken links, and structured data without running arbitrary client JavaScript.
4. **Context-Aware AI Fix Assistant:** Audience-tailored advice (Marketer, Developer, Agency, SaaS Team) with framework-specific fixes for WordPress, WooCommerce, Shopify, Next.js, React, Laravel, or Custom Stacks.
5. **Cross-Page Issue Intelligence:** Automatically aggregates recurring systemic bottlenecks across entire websites.
6. **Continuous Monitoring & Regression Detection:** Scheduled recurring audits with change tracking and regression alerts.
7. **White-Label Client Reports:** Export executive-ready PDF, CSV, and XLSX reports.

---

## 🏗️ Architecture & Monorepo

SpeedPilot is structured as a modular TypeScript monorepo:

```
speedpilot/
├── apps/
│   ├── web/                    # Next.js 15 App Router, UI, REST API
│   └── worker/                 # Standalone BullMQ background audit worker
├── packages/
│   ├── database/               # Prisma ORM schema & PostgreSQL client
│   ├── shared/                 # Zod validation schemas, TypeScript types, metric constants
│   ├── security/               # SSRF protection, DNS resolver check, safe-fetch client
│   ├── pagespeed/              # Google PageSpeed Insights & CrUX API client with rate limiter
│   ├── seo-engine/             # Safe HTML crawler & Technical SEO evaluator
│   ├── ai-engine/              # Compact evidence extractor & audience-tailored prompt engine
│   └── report-generator/       # High-fidelity PDF, Excel (XLSX), and CSV generator
├── docs/                       # Comprehensive documentation & architecture specifications
└── docker-compose.yml          # Container orchestration for Postgres, Redis, Web, and Worker
```

---

## 🚀 Quickstart (Self-Hosted via Docker)

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- Node.js v20+ / v24 LTS (for local development)

### 1. Clone & Configure
```bash
cp .env.example .env
# Edit .env and supply your Google PageSpeed and OpenAI keys (optional but recommended)
```

### 2. Boot Local Infrastructure
```bash
docker-compose up -d
```

### 3. Access SpeedPilot
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Documentation Directory

- [Product Requirements Document (PRD)](docs/PRD.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Database Schema & Data Model](docs/DATABASE.md)
- [REST API Specification](docs/API.md)
- [Security & SSRF Mitigation](docs/SECURITY.md)
- [AI Fix Assistant Architecture](docs/AI-ENGINE.md)
- [Job Queue & Worker Architecture](docs/JOB-QUEUE.md)
- [UI/UX Design Specifications](docs/UI-UX.md)
- [Development Roadmap](docs/DEVELOPMENT-PLAN.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Licensing Architecture](docs/LICENSING.md)
- [Testing Strategy](docs/TESTING.md)
- [Development Status](DEVELOPMENT-STATUS.md)

---

## 🛡️ Security

SpeedPilot takes SSRF, data privacy, and isolation seriously. Read our [Security Policy](SECURITY.md) and [SSRF Architecture](docs/SECURITY.md).

---

## 📄 License

SpeedPilot Open-Source Core is licensed under the [Apache License, Version 2.0](LICENSE).
