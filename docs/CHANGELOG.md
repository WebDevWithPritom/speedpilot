# SpeedPilot — Changelog

All notable changes to the SpeedPilot project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Phase 0 — Complete System Specifications & Technical Architecture:**
  - Product Requirements Document (`docs/PRD.md`) covering all personas, use cases, and feature modules.
  - System Architecture Blueprint (`docs/ARCHITECTURE.md`) defining monorepo boundaries and sequence flows.
  - Relational Database Schema (`docs/DATABASE.md`) with 22 PostgreSQL entities modeled for Prisma.
  - REST API Specification (`docs/API.md`) defining v1 routes, auth headers, and response formats.
  - Security & SSRF Defense Architecture (`docs/SECURITY.md`) specifying private CIDR filtering, DNS rebinding mitigation, and streaming caps.
  - AI Fix Assistant Prompt Architecture (`docs/AI-ENGINE.md`) detailing token compression, framework detection, and audience modes.
  - Asynchronous Job Queue Specification (`docs/JOB-QUEUE.md`) with BullMQ rate limiting and exponential backoff.
  - UI/UX Design System Specification (`docs/UI-UX.md`) with WCAG 2.2 AA standards and table interactions.
  - Comprehensive 12-Phase Roadmap (`docs/DEVELOPMENT-PLAN.md`).
  - Deployment & Docker Topology Guide (`docs/DEPLOYMENT.md`).
  - Open-Source & Commercial SaaS Licensing Plan (`docs/LICENSING.md`).
  - Testing Strategy & Quality Assurance Architecture (`docs/TESTING.md`).
  - Active Development Status Tracker (`DEVELOPMENT-STATUS.md`).
