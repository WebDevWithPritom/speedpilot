# Contributing to SpeedPilot

First off, thank you for considering contributing to SpeedPilot!

SpeedPilot is an open-source, universal website performance intelligence platform. We welcome contributions ranging from bug reports and documentation enhancements to new diagnostic checks and framework fix detectors.

---

## 1. Development Principles

1. **Strict TypeScript:** No `any` types unless thoroughly justified.
2. **Zero Fake Metrics:** Never fabricate Lighthouse scores or Core Web Vitals.
3. **SSRF Protection:** All outgoing HTTP requests to target domains must pass through `@speedpilot/security`'s `safeFetch`.
4. **Test Everything:** Add unit tests for every new parser, normalizer, or utility. Never submit PRs with failing tests.

---

## 2. Local Development Setup

### Prerequisites
- Node.js v20+ or v24 LTS
- Docker & Docker Compose (for local PostgreSQL and Redis)

### Steps
```bash
# 1. Clone repository
git clone https://github.com/speedpilot/speedpilot.git
cd speedpilot

# 2. Copy environment file
cp .env.example .env

# 3. Start local database & Redis
docker-compose up -d postgres redis

# 4. Install dependencies
npm install

# 5. Run Prisma migrations
npm run db:migrate

# 6. Start development server
npm run dev
```

---

## 3. Pull Request Process

1. Fork the repo and create your branch from `main`: `git checkout -b feature/my-cool-feature`.
2. Ensure linting and type checks pass: `npm run lint && npm run type-check`.
3. Run the test suite: `npm test`.
4. Commit with conventional commit messages (e.g. `feat: add Shopify theme font display detector`).
5. Open a Pull Request with a clear description of the problem solved.
