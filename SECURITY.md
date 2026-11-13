# Security Policy

SpeedPilot takes security and data isolation seriously. Because our application ingests arbitrary user-supplied URLs and sitemaps, we maintain strict controls against Server-Side Request Forgery (SSRF), Denial of Service, and privilege escalation.

---

## Supported Versions

| Version | Supported |
| :--- | :--- |
| 1.0.x | Yes |
| < 1.0 | No |

---

## Reporting a Vulnerability

If you discover a security vulnerability within SpeedPilot, please **do not open a public GitHub issue**.

Instead, please send an email to **security@speedpilot.dev** with:
- Description of the vulnerability.
- Steps to reproduce or proof-of-concept payload.
- Potential impact.

We will acknowledge receipt within 48 hours and work with you to patch the issue before any public disclosure.

---

## Known Protections
- All target requests are verified against blocked private IPv4/IPv6 subnets, loopbacks, link-local addresses, and cloud metadata (`169.254.169.254`).
- DNS rebinding defense via pre-resolved socket pinning.
- Stream size limits (5MB) and redirect hop caps (5).
- Zero server-side JavaScript execution during crawls.
- Workspace data isolation enforced at the database query level.

