# ADR 0001: Monorepo Architecture, Next.js App Router, Prisma ORM, and BullMQ

**Status:** Accepted  
**Date:** 2026-11-06  
**Deciders:** Founding Engineering Team  

---

## 1. Context & Problem Statement

SpeedPilot requires both a high-interactivity modern web frontend for dashboards, real-time audit progress, and report viewing, as well as a resilient background worker system capable of executing rate-limited external network requests (Google PageSpeed API, Chrome UX Report, target website HTML crawling, OpenAI LLM calls).

We need a project structure and technology stack that:
1. Allows clean code sharing (TypeScript types, Zod validation schemas, security utilities) between the web frontend and background worker.
2. Prevents worker dependencies (Cheerio, BullMQ, heavy headless exporters) from bloating frontend client bundles.
3. Provides reliable asynchronous queueing with concurrency and rate-limiting controls.
4. Ensures strict multi-tenant database access with typed queries.

---

## 2. Considered Options

- **Option A: Monolithic Next.js Application with in-process queue (e.g. p-queue / in-memory).**
  - *Pros:* Simplest single repository and single deployment target.
  - *Cons:* In-memory queues lose all state on container restart or serverless cold boot. Heavy background jobs block the Node event loop for interactive web requests. Cannot scale workers independently.
- **Option B: Polyglot Multi-Repo (e.g. Python Celery worker + Next.js frontend).**
  - *Pros:* Independent languages and deployment cycles.
  - *Cons:* Duplication of data models, schemas, and API definitions across two distinct languages. High maintenance overhead for a small engineering team.
- **Option C: TypeScript Monorepo (`npm/pnpm workspaces`) with Next.js 15 Web App + BullMQ Worker + Shared Engine Packages.**
  - *Pros:* Single language (TypeScript end-to-end), unified dependency management, atomic type checking, independent container scaling (`web` vs. `worker`), zero bundle bloat in the frontend.
  - *Cons:* Requires proper monorepo configuration and separate Dockerfiles.

---

## 3. Decision Outcome

**Chosen Option: Option C (TypeScript Monorepo).**

### Key Stack Components:
- **Workspace Manager:** npm workspaces (native to Node.js v24 LTS, zero external installer friction).
- **Frontend & Web API:** Next.js 15+ with React 19, TypeScript, App Router, Tailwind CSS, shadcn/ui, and Recharts.
- **Database & ORM:** PostgreSQL 16+ managed via Prisma ORM for type-safe relational modeling and migrations.
- **Background Queue & Cache:** Redis 7+ with BullMQ for token-bucket rate limiting, backoff retries, and job state tracking.
- **Domain Engines:** Pure TypeScript packages (`@speedpilot/database`, `@speedpilot/shared`, `@speedpilot/security`, `@speedpilot/pagespeed`, `@speedpilot/seo-engine`, `@speedpilot/ai-engine`, `@speedpilot/report-generator`).

### Consequences:
- High architectural cleanliness with strict boundaries.
- Ability to deploy the web application and worker processes independently or together via `docker-compose.yml`.
- Type changes in shared schemas immediately propagate across API route handlers and background jobs.

