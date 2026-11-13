# SpeedPilot — Testing Strategy & Quality Assurance

**Document Version:** 1.0.0  
**Test Frameworks:** Vitest (Unit & Integration), React Testing Library, Playwright (E2E)  

---

## 1. Testing Philosophy & Non-Negotiable Standards

1. **No Phantom Passes:** Never report or claim a test passed unless it was genuinely executed by the test runner.
2. **Deterministic & Isolated:** Unit tests must execute in < 2 seconds without external network dependencies.
3. **Real vs. Mocked Boundaries:**
   - External third-party APIs (Google PSI, Chrome UX Report, OpenAI) are mocked using strict fixtures in unit tests.
   - End-to-end integration tests test real HTTP routing and database schema interactions.
4. **Coverage Mandates:**
   - Security critical code (`@speedpilot/security` safeFetch, SSRF filters): **100% branch coverage**.
   - Metric parsers and normalizers (`@speedpilot/pagespeed`, `@speedpilot/seo-engine`): **> 90% branch coverage**.

---

## 2. Test Architecture & Directory Structure

```
speedpilot/
├── tests/
│   ├── unit/
│   │   ├── security/           # SSRF, DNS resolution, private IP blockers
│   │   ├── shared/             # URL normalizers, metric formatters, Zod schemas
│   │   ├── pagespeed/          # PSI lab parser, CrUX field metric classifier
│   │   ├── seo-engine/         # Static HTML parser, heading validator, link crawler
│   │   └── ai-engine/          # Context distillation, tech stack detector, cache hashing
│   ├── integration/
│   │   ├── queue/              # BullMQ concurrency, rate limiting, and failure retries
│   │   ├── database/           # Prisma relational queries, cascades, workspace isolation
│   │   └── api/                # Next.js route handlers, authentication, rate limits
│   └── e2e/
│       ├── bulk-audit-flow.spec.ts   # Project creation -> CSV/URL submission -> Results table
│       ├── ai-fix-modal.spec.ts      # Issue selection -> Audience mode toggles -> Code snippet copy
│       └── report-export.spec.ts     # PDF / CSV report generation
```

---

## 3. Test Suites

### 3.1 Unit Testing (`npm run test:unit`)
- **SSRF Guard:** Tests all private IPv4/IPv6 blocks, cloud metadata addresses (`169.254.169.254`), 0.0.0.0, DNS rebinding cases, redirect limits, and response byte caps.
- **URL Normalizer:** Tests protocol normalization, trailing slash policies, query parameter preservation, and fragment stripping.
- **Metric Classifier:** Tests Google Core Web Vitals thresholds:
  - LCP: Good (<= 2500ms), Needs Improvement (<= 4000ms), Poor (> 4000ms)
  - INP: Good (<= 200ms), Needs Improvement (<= 500ms), Poor (> 500ms)
  - CLS: Good (<= 0.1), Needs Improvement (<= 0.25), Poor (> 0.25)
- **Framework Detector:** Tests HTML fixtures for accurate detection of WordPress, WooCommerce, Shopify, Next.js, React, and Laravel.

### 3.2 Integration Testing (`npm run test:integration`)
- PostgreSQL test container runs Prisma migrations and verifies foreign key cascades and multi-tenant workspace isolation.
- Redis test instance verifies BullMQ rate-limiting token replenishment and job retry backoff.

### 3.3 End-to-End Verification (`npm run test:e2e`)
- Playwright drives headless Chromium through full user workflows.

