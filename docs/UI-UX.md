# SpeedPilot — UI/UX Design System & Experience Architecture

**Document Version:** 1.0.0  
**Design Philosophy:** Precision engineering, spacious hierarchy, calm data density (Linear/Vercel/Stripe aesthetic)  
**Accessibility Target:** WCAG 2.2 AA  

---

## 1. Visual Identity & Design Principles

SpeedPilot's design avoids unnecessary glow, heavy gradients, or generic toy AI styling. It delivers a high-trust, fast, keyboard-friendly developer and agency experience.

### Key Principles:
1. **Calm Density:** High information density without visual chaos. Micro-borders (`border-zinc-200 dark:border-zinc-800`), subtle backgrounds (`bg-zinc-50 dark:bg-zinc-950`), and crisp monospace metrics.
2. **Predictable Typography:** Clean sans-serif hierarchy (Geist / Inter) paired with a tabular mono font (Geist Mono / JetBrains Mono) for numbers, scores, and code.
3. **Semantic Status Colors:**
   - **Good / Fast:** Emerald (`#10b981`)
   - **Needs Improvement / Moderate:** Amber (`#f59e0b`)
   - **Poor / Critical:** Rose (`#f43f5e`)
   - **Informational / Neutral:** Blue / Slate (`#3b82f6` / `#64748b`)
4. **Strict Empty States:** Clear, helpful empty states with single-click actions. Never show fake or mock data disguised as user metrics.

---

## 2. Core Navigation Structure

```
SpeedPilot
├── Overview (Main Dashboard, site health, aggregate scores, recent audits)
├── Projects (Project list, multi-site management, domain stats)
├── Bulk Auditor (New audit modal, URL input, CSV upload, sitemap crawler)
├── Audits & History (Audit execution logs, batch progress, historical runs)
├── Performance & CWV (Deep-dive Lighthouse lab metrics & CrUX field data)
├── SEO Intelligence (Technical SEO crawler results, canonicals, robots, meta)
├── AI Fix Assistant (Audience-aware fix recommendations & code diffs)
├── Cross-Page Issues (Systemic issue groups across multiple URLs)
├── Monitoring (Scheduled audit rules, regression alerts)
├── Comparisons (Before vs. After, Competitor benchmark matrix)
├── Reports (Customizable PDF, CSV, XLSX exporter)
├── Developer API (API keys, webhooks, interactive API documentation)
└── Settings (Workspace members, plan & usage, billing, environment status)
```

---

## 3. Bulk Results Table Specification

The central workhorse interface is the Bulk Audit Results Table:

| Column | Data Source | Visual Representation |
| :--- | :--- | :--- |
| **URL** | `ProjectURL` | Truncated path with full-URL hover tooltip and external link icon. |
| **Device** | `device` | Mobile / Desktop icon badge. |
| **Performance** | PSI Lighthouse | 0–100 circular gauge or colored pill (Green 90-100, Amber 50-89, Red 0-49). |
| **Accessibility** | PSI Lighthouse | Score pill with tooltip. |
| **Best Practices**| PSI Lighthouse | Score pill with tooltip. |
| **SEO Score** | PSI Lighthouse | Score pill with tooltip. |
| **LCP (Lab)** | PSI Lighthouse | Milliseconds formatted (e.g. `2.4s`) with color threshold. |
| **CLS (Lab)** | PSI Lighthouse | Formatted decimal (e.g. `0.02`). |
| **INP (Field)** | CrUX API | Formatted milliseconds (e.g. `120ms`) or distinct "No Field Data" badge. |
| **Issues** | `AuditIssues` | Badge count broken down by severity (e.g., `2 Critical, 4 High`). |
| **Status** | `status` | Spinner (Processing), Check (Completed), Alert (Failed), Retrying. |
| **Actions** | Action Menu | View Details, Rerun Audit, View AI Fix, Export PDF. |

### Interactive Capabilities:
- Instant client-side search across URLs.
- Multi-column sorting (by Performance Score, LCP, CLS, Issue Count).
- Filter dropdowns: By Device (Mobile/Desktop), Score Status (Poor/Needs Improvement/Good), and Issue Category.
- Pagination with selectable page sizes (10, 25, 50, 100).
- Row expansion to view top 3 high-impact opportunities without navigating away.

---

## 4. Accessibility & Responsive Standards

- **Keyboard Navigation:** Full tab-order navigation across all tables, modal dialogues, and action dropdowns.
- **Color Contrast:** Minimum 4.5:1 text-to-background contrast ratio across both Light and Dark modes.
- **Screen Reader Support:** All metric charts include hidden `aria-label` descriptions explaining data points.
