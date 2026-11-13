# SpeedPilot — Product Requirements Document (PRD)

**Document Version:** 1.0.0  
**Status:** Approved / Active Baseline  
**Author:** Founding Engineering Team  
**Date:** November 2026  

---

## 1. Executive Summary

**SpeedPilot** is a universal website performance intelligence and optimization platform designed for modern web professionals, developers, marketing teams, digital agencies, and SaaS organizations.

While standard tools (such as Google PageSpeed Insights web UI) offer single-page, one-off audits, SpeedPilot transforms website performance auditing into an **actionable, automated, and intelligent lifecycle**:
1. **Bulk Multi-Page Audits:** Audit one URL or hundreds of URLs via textarea, CSV upload, or XML sitemap discovery.
2. **Dual-Lens Data Integrity:** Strict separation and display of **Lighthouse lab diagnostics** (synthetic) and **Chrome UX Report (CrUX) field data** (real-user 28-day 75th percentile).
3. **Independent Technical SEO Intelligence:** Native HTML parsing and validation engine that evaluates meta tags, headings, canonicals, robots rules, structured data, broken internal links, and redirect chains without relying solely on Lighthouse.
4. **Context-Aware AI Fix Assistant:** Audience-tailored (Marketer, Developer, Agency, SaaS team) actionable recommendations with actual code snippets, technology detection (WordPress, Shopify, Next.js, Laravel, custom JS), and verification steps.
5. **Cross-Page Issue Intelligence:** Identification of recurring systemic bottlenecks across an entire site (e.g., identical render-blocking scripts across 40 templates).
6. **Continuous Monitoring & Regression Detection:** Scheduled automated recurring audits with historical trend analysis and notification alerts.
7. **White-Label Client Reporting:** Generation of presentation-ready PDF, CSV, and XLSX reports.

---

## 2. Product Positioning & Tagline

- **Tagline:** *"Audit. Understand. Optimize. Improve."*
- **Value Proposition:** SpeedPilot is not just a PageSpeed checker; it is a holistic website performance intelligence platform that bridges the gap between raw diagnostic metrics and verified engineering solutions.

---

## 3. Target Audiences & Use Cases

| Persona | Key Needs | Primary SpeedPilot Capabilities |
| :--- | :--- | :--- |
| **Marketers & SEO Professionals** | High-level site health, Core Web Vitals impact on search rankings, plain-language problem explanations, client-ready reports. | Overview dashboards, Technical SEO intelligence, Marketer-mode AI explanations, PDF executive summaries. |
| **Software Engineers & DevOps** | Exact Lighthouse audit evidence, diagnostic breakdowns, render-blocking tree identification, code-level remediation steps. | Developer-mode AI diagnostics, code snippets, framework-aware optimizations (Next.js, React, Laravel), CI/CD API endpoints. |
| **Agencies & Freelancers** | Multi-client workspace isolation, bulk multi-URL auditing, before-and-after audit comparisons, scheduled reports. | Workspaces, Project management, XML sitemap bulk crawl, white-label report exports (PDF/CSV/XLSX), Agency-mode summaries. |
| **SaaS & Product Teams** | Multi-domain critical flow monitoring, performance regression alerts, Core Web Vitals tracking over releases. | Continuous automated monitoring, regression alerts, historical trend charts, REST API integrations. |

---

## 4. Business & Distribution Model

### 4.1 Open-Source Core (Community Edition)
- **License:** Apache License 2.0
- **Scope:**
  - Full local and self-hosted deployment via Docker Compose.
  - Core asynchronous auditing engine (Lighthouse PSI & CrUX).
  - Bulk URL submission (textarea, CSV, XML sitemap).
  - Complete UI dashboard, project management, and URL analytics.
  - Independent Technical SEO intelligence crawler.
  - AI Fix Assistant using user-provided OpenAI API key (`OPENAI_API_KEY`).
  - SQLite/PostgreSQL support, Redis/BullMQ background queue.
  - Zero artificial barriers or crippled functionality in the core audit path.

### 4.2 Hosted Commercial SaaS (Cloud Edition)
- **Scope:**
  - Managed multi-tenant cloud infrastructure with high concurrency.
  - Managed AI token credits (zero external key setup required).
  - Advanced multi-seat team collaboration and role-based permissions (RBAC).
  - Scheduled automated monitoring with email/webhook alerting.
  - Custom domain white-label PDF reports and client portal links.
  - Tiered subscription quotas (Free, Starter, Pro, Agency, Enterprise).
  - Billing provider abstraction (Stripe with localized regional alternatives).

---

## 5. Functional Requirements & Feature Modules

### Module 1: Project & Workspace Management
- Workspaces provide multi-tenant isolation.
- Projects organize websites, domains, and associated target URLs.
- Support for project-level domain configuration, descriptions, tags, and aggregate health metrics.

### Module 2: Bulk URL Ingestion & Discovery
- **Input Channels:**
  1. Single URL manual input.
  2. Multi-line URL textarea input.
  3. CSV file upload with automatic column detection and validation.
  4. XML sitemap and sitemap-index parsing with safe recursive discovery.
- **Normalization & Validation:**
  - Canonical URL normalization (protocol, lowercase host, trailing slash policy, fragment stripping).
  - In-batch and cross-project duplicate detection.
  - SSRF protection on all inputs before fetch.
- **Auditing Matrix:**
  - Configurable device targets: Mobile, Desktop, or Both (creating distinct `AuditExecution` records for each).
  - Batch size controls: Conservative default (25 URLs/batch), scalable up to 500+ URLs subject to queue limits and API quotas.

### Module 3: Performance & Core Web Vitals Engine
- **Google PageSpeed Insights API (PSI):**
  - Performance, Accessibility, Best Practices, and SEO scores (0–100).
  - Lab metrics: FCP, LCP, TBT, CLS, Speed Index.
  - Raw audit opportunities (unminified CSS/JS, unused JavaScript, oversized images, render-blocking resources).
  - Diagnostic items (DOM size, main-thread work breakdown, network payload sizes, font display).
- **Chrome UX Report (CrUX) API:**
  - 28-day rolling field data for LCP, INP, and CLS.
  - Metric rating classifications: `GOOD`, `NEEDS_IMPROVEMENT`, `POOR`.
  - Transparent data availability indicators: URL-level vs. Origin-level data fallback with clear labeling (never display missing data as 0).

### Module 4: Independent Technical SEO Intelligence
- Safe HTTP crawler and HTML parser operating independently of Lighthouse.
- Evaluates:
  - Document Title (presence, length, duplication across project).
  - Meta Description (presence, length, duplication).
  - Canonical URL (self-referencing, mismatched, or missing).
  - Robots meta tags (`noindex`, `nofollow`, `noarchive`) and `robots.txt` compliance.
  - Heading hierarchy (H1 presence, multiple H1s, skipped heading levels).
  - Image accessibility (`alt` attribute presence and non-empty status).
  - Internal and external link hygiene (HTTP status codes, redirect chains, HTTPS enforcement).
  - Social metadata (Open Graph and Twitter Card tags).
  - Structured data validation (JSON-LD schema presence and syntax validity).

### Module 5: AI Fix Assistant (Differentiation Core)
- Normalizes and distills diagnostic audit findings into focused issue payloads.
- Delivers structured recommendations:
  - **Issue Title & Severity:** Low, Medium, High, Critical.
  - **Audit Evidence:** Real file URLs, byte sizes, and millisecond savings.
  - **Audience Presentation Modes:**
    - *Marketer:* Business impact and search ranking context.
    - *Developer:* Architecture diagnostics, file paths, and implementation logic.
    - *Agency:* Executive pitch and estimated client ROI.
    - *SaaS Team:* Regression risk and deployment checks.
  - **Technology-Specific Guidance:** Tailored advice for WordPress, WooCommerce, Shopify, Next.js, React, Laravel, or Custom Stack.
  - **Code Remediation:** Accurate before-and-after code snippets.
  - **Verification Guide:** Exact steps to re-test and confirm fix in dev/staging.
- **Cost & Rate Controls:** Recommendation caching by issue signature, deduplicated payloads, and user quota tracking.

### Module 6: Cross-Page Issue Intelligence
- Aggregates recurring audit failures across multiple URLs within a project.
- Groups issues sharing root cause assets (e.g., global third-party analytics script blocking render on 80 pages).
- Prioritizes shared systemic fixes to maximize project-wide ROI.

### Module 7: Continuous Monitoring & Regression Detection
- Configurable audit schedules: Daily, Weekly, Monthly, or Custom Cron.
- Automated regression detection comparing current execution against historical baseline.
- Notification dispatch via webhooks and email when metrics degrade beyond defined thresholds.

### Module 8: Comparative Analytics
- **Before-and-After Analysis:** Compare audit snapshots before and after code deployments.
- **Competitor Benchmarking:** Run identical device audits on competitor domains and display side-by-side scorecards, CWV field metrics, and technical SEO hygiene.

### Module 9: Report Generation & Export
- Formats: High-resolution PDF, structured CSV, and Excel (XLSX).
- Customization: Include/exclude diagnostics, executive summary, AI recommendations, and white-label branding (logo, colors, custom header/footer).

### Module 10: Developer API & Webhooks
- Versioned REST API (`/api/v1`) with API key authentication (`sp_live_...`).
- Programmatic audit trigger, status polling, results retrieval, and webhook subscription for asynchronous completion events.

---

## 6. Non-Functional Requirements

### 6.1 Performance & Scalability
- UI response time: p95 under 150ms for cached data and API endpoints.
- Queue scalability: BullMQ worker handles asynchronous parallel jobs with configurable concurrency and rate limiting.
- Graceful degradation: Seamless UI operation and non-AI auditing when OpenAI API key is unconfigured.

### 6.2 Reliability & Fault Tolerance
- Automatic retries with exponential backoff and jitter on Google API 429/503 errors.
- Never mark a failed API call as a successful audit.
- Clear error states for network timeouts, DNS failures, and unreachable URLs.

### 6.3 Security & Isolation
- Mandatory Server-Side Request Forgery (SSRF) protection blocking private IP ranges, loopback, link-local, and cloud metadata endpoints.
- Safe HTML parsing without executing client scripts or browser sandboxes on the server.
- Strict multi-tenant workspace isolation at the database layer.

---

## 7. Compliance & Data Ethics
- Absolute adherence to data integrity: no synthetic or fabricated scores.
- Clear distinction between lab measurements (Lighthouse) and field telemetry (CrUX).
- Full user ownership and exportability of all project data.

