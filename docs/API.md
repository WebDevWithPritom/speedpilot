# SpeedPilot — REST API Specification (v1)

**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Authentication:** HTTP Bearer Token (`sp_live_...`) or Session Cookie  

---

## 1. Authentication & Security

All API requests must include authentication headers unless accessing public health checks.

### Headers
```http
Authorization: Bearer sp_live_9f81a7b6c5d4e3f2...
Content-Type: application/json
Accept: application/json
```

### Rate Limiting
- Community Edition: Configurable per-IP rate limit (default: 120 req/min).
- Cloud SaaS Edition: Tiered limits enforced via Redis token-bucket algorithm with headers:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining quota in current window
  - `X-RateLimit-Reset`: Unix timestamp when quota resets

---

## 2. API Endpoints

### 2.1 Projects & Target URLs

#### `GET /api/v1/projects`
List all projects accessible in the active workspace.
- **Response 200 OK:**
```json
{
  "data": [
    {
      "id": "e2a4a750-7164-42f8-9580-2a818c39cf10",
      "name": "E-Commerce Flagship",
      "primaryDomain": "store.example.com",
      "techStack": "SHOPIFY",
      "urlCount": 42,
      "latestAuditScore": 84,
      "createdAt": "2026-11-01T10:00:00Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

#### `POST /api/v1/projects`
Create a new project.
- **Request Body:**
```json
{
  "name": "Corporate Portal",
  "primaryDomain": "https://example.com",
  "description": "Main public marketing site",
  "techStack": "NEXTJS"
}
```

#### `POST /api/v1/projects/:projectId/urls/bulk`
Ingest URLs via raw string array or parsed sitemap/CSV.
- **Request Body:**
```json
{
  "urls": [
    "https://example.com/",
    "https://example.com/pricing",
    "https://example.com/blog/speed-guide"
  ]
}
```
- **Response 200 OK:**
```json
{
  "addedCount": 3,
  "skippedDuplicates": 0,
  "invalidUrls": []
}
```

#### `POST /api/v1/projects/:projectId/sitemap`
Discover and ingest URLs from an XML sitemap or sitemap index.
- **Request Body:**
```json
{
  "sitemapUrl": "https://example.com/sitemap.xml",
  "maxUrls": 100
}
```

---

### 2.2 Audits & Execution Jobs

#### `POST /api/v1/audits`
Trigger an asynchronous audit job across URLs.
- **Request Body:**
```json
{
  "projectId": "e2a4a750-7164-42f8-9580-2a818c39cf10",
  "deviceMode": "BOTH",
  "urls": [
    "https://example.com/",
    "https://example.com/pricing"
  ]
}
```
- **Response 202 Accepted:**
```json
{
  "jobId": "f7d98341-9252-47d9-bfbf-265103c80a01",
  "status": "QUEUED",
  "totalExecutions": 4,
  "message": "Audit job successfully enqueued across 2 URLs for Mobile and Desktop."
}
```

#### `GET /api/v1/audits/:jobId`
Poll status and progress of an active or completed audit job.
- **Response 200 OK:**
```json
{
  "jobId": "f7d98341-9252-47d9-bfbf-265103c80a01",
  "status": "PROCESSING",
  "progress": {
    "total": 4,
    "completed": 2,
    "failed": 0,
    "percentage": 50
  },
  "executions": [
    {
      "id": "18cf701c-6b58-47c3-889a-05a8f58b9f9e",
      "url": "https://example.com/",
      "device": "MOBILE",
      "status": "COMPLETED",
      "performanceScore": 78,
      "seoScore": 92,
      "lcpMs": 2840,
      "tbtMs": 310,
      "cls": 0.04
    },
    {
      "id": "29ef812d-7c69-48d4-990b-16b9f69c0a0f",
      "url": "https://example.com/",
      "device": "DESKTOP",
      "status": "PROCESSING"
    }
  ]
}
```

#### `GET /api/v1/audits/executions/:executionId`
Fetch full diagnostic telemetry, field CWV, technical SEO hygiene, and AI recommendations.
- **Response 200 OK:**
```json
{
  "executionId": "18cf701c-6b58-47c3-889a-05a8f58b9f9e",
  "url": "https://example.com/",
  "device": "MOBILE",
  "status": "COMPLETED",
  "scores": {
    "performance": 78,
    "accessibility": 94,
    "bestPractices": 88,
    "seo": 92
  },
  "labMetrics": {
    "fcpMs": 1420,
    "lcpMs": 2840,
    "tbtMs": 310,
    "cls": 0.04,
    "speedIndexMs": 2210
  },
  "fieldCrUX": {
    "scope": "URL",
    "lcpValueMs": 2400,
    "lcpCategory": "GOOD",
    "inpValueMs": 160,
    "inpCategory": "GOOD",
    "clsValue": 0.03,
    "clsCategory": "GOOD",
    "collectionPeriod": "2026-10-01 to 2026-10-28"
  },
  "technicalSEO": {
    "httpStatus": 200,
    "isHttps": true,
    "pageTitle": "Fast Modern Cloud Solutions",
    "metaDescription": "Scalable enterprise cloud systems designed for performance.",
    "canonicalUrl": "https://example.com/",
    "isCanonicalMatch": true,
    "h1Count": 1,
    "h1Text": "Fast Modern Cloud Solutions",
    "missingAltImagesCount": 0
  },
  "issuesCount": 4,
  "issues": [
    {
      "id": "iss_91029",
      "code": "render-blocking-resources",
      "title": "Eliminate render-blocking resources",
      "severity": "HIGH",
      "displayValue": "Potential savings of 820 ms",
      "evidenceDetails": {
        "items": [
          { "url": "https://example.com/assets/theme.css", "wastedMs": 540 }
        ]
      }
    }
  ]
}
```

---

### 2.3 AI Fix Recommendations

#### `GET /api/v1/issues/:issueId/ai-fix`
Fetch audience-aware AI guidance and remediation snippets for an issue.
- **Response 200 OK:**
```json
{
  "issueId": "iss_91029",
  "detectedStack": "NEXTJS",
  "recommendation": {
    "marketer": "The website takes an extra 0.8 seconds to display visible content because fonts and styles load before the text. Fixing this improves search ranking and mobile conversion.",
    "developer": "Critical stylesheet 'theme.css' is linked synchronously in the document <head>. In Next.js App Router, extract critical styles or use Next.js built-in CSS modules with link rel='preload' as='style'.",
    "agency": "High ROI optimization. Eliminating this block will recover ~820ms from mobile FCP and directly lift the PageSpeed score by 8-12 points.",
    "saasTeam": "Core layout blocker on landing page. Resolving this protects the 75th percentile LCP target during incoming marketing campaigns.",
    "remediationCodeSnippet": "<!-- Before -->\n<link rel=\"stylesheet\" href=\"/assets/theme.css\">\n\n<!-- After: Preload non-critical theme CSS -->\n<link rel=\"preload\" href=\"/assets/theme.css\" as=\"style\" onload=\"this.onload=null;this.rel='stylesheet'\">\n<noscript><link rel=\"stylesheet\" href=\"/assets/theme.css\"></noscript>",
    "implementationSteps": [
      "Identify above-the-fold inline critical styles",
      "Update next/font and layout.tsx to preload non-critical CSS",
      "Test mobile FCP on staging"
    ],
    "verificationSteps": [
      "Run speedpilot audit on staging preview",
      "Verify Lighthouse opportunity 'render-blocking-resources' shows 0ms wasted"
    ],
    "estimatedDifficulty": "MEDIUM",
    "estimatedImpact": "HIGH"
  }
}
```

---

### 2.4 Reports & Exports

#### `POST /api/v1/reports/export`
Trigger document export.
- **Request Body:**
```json
{
  "jobId": "f7d98341-9252-47d9-bfbf-265103c80a01",
  "format": "PDF",
  "includeAIRecommendations": true,
  "whiteLabel": {
    "companyName": "Acme Digital Agency",
    "logoUrl": "https://agency.com/logo.png"
  }
}
```
- **Response 200 OK:** Streams PDF binary or returns pre-signed download URL.
