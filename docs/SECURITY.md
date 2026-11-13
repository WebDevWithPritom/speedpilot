# SpeedPilot — Security Model & SSRF Defense Architecture

**Document Version:** 1.0.0  
**Security Classification:** High  

---

## 1. Threat Model Overview

Because SpeedPilot ingests arbitrary URLs, sitemaps, and remote HTML documents from users, the primary application threats are:
1. **Server-Side Request Forgery (SSRF):** Malicious attempts to probe local networks (`localhost`, `127.0.0.1`), cloud instance metadata services (`169.254.169.254`), or internal microservices.
2. **DNS Rebinding Attacks:** Attackers configuring DNS servers that initially resolve to a public IP to bypass validation, then rebind to `127.0.0.1` upon subsequent HTTP connection.
3. **Denial of Service via Payload Flooding:** Sitemaps with billions of URLs (Billion Laughs / Zip Bomb equivalent), or infinite HTTP redirect loops designed to crash the worker process.
4. **Remote Code Execution via Dynamic Scripts:** Untrusted JavaScript execution in audited web pages.

---

## 2. Server-Side Request Forgery (SSRF) Defense

The `@speedpilot/security` package implements strict layered safeguards through a dedicated `safeFetch` client:

```mermaid
flowchart TD
    Req["Incoming URL Request"] --> ProtoCheck{"1. Protocol Check"}
    ProtoCheck -->|Not HTTP/HTTPS| Reject1["Reject (400 Invalid Protocol)"]
    ProtoCheck -->|http:// or https://| HostCheck{"2. Hostname Check"}
    
    HostCheck -->|IP Literal or Localhost| IPCheck{"2a. Is Private/Loopback/LinkLocal?"}
    IPCheck -->|Yes| Reject2["Reject (403 Forbidden Host)"]
    IPCheck -->|No| DNSResolve["3. Secure DNS Lookup (A & AAAA records)"]
    
    HostCheck -->|Domain Name| DNSResolve
    
    DNSResolve --> ResolveCheck{"4. Are ANY resolved IPs Private?"}
    ResolveCheck -->|Contains Private / Metadata IP| Reject3["Reject (403 SSRF Blocked)"]
    ResolveCheck -->|All IPs Public| Connect["5. Establish Socket to Validated IP"]
    
    Connect --> StreamResp["6. Stream Response with 5MB Cap & 10s Timeout"]
    StreamResp --> RedirectCheck{"7. HTTP 3xx Redirect?"}
    RedirectCheck -->|Yes (Redirect Count < 5)| ProtoCheck
    RedirectCheck -->|Redirect Count >= 5| Reject4["Reject (400 Too Many Redirects)"]
    RedirectCheck -->|No (200 OK)| SafeBody["Return Sanitized Response"]
```

### 2.1 Blocked IP Ranges (IPv4 & IPv6)

SpeedPilot blocks all incoming IP ranges corresponding to RFC 1918, RFC 3927, RFC 1122, and RFC 4291:
- `0.0.0.0/8` (Current network)
- `10.0.0.0/8` (Private network)
- `127.0.0.0/8` (Loopback / localhost)
- `169.254.0.0/16` (Link-local, including Cloud Metadata `169.254.169.254`)
- `172.16.0.0/12` (Private network)
- `192.168.0.0/16` (Private network)
- `100.64.0.0/10` (Carrier-grade NAT)
- `192.0.0.0/24` (IETF protocol assignments)
- `198.18.0.0/15` (Benchmark testing)
- `224.0.0.0/4` (Multicast)
- `240.0.0.0/4` (Reserved)
- `::1/128` (IPv6 Loopback)
- `fc00::/7` (IPv6 Unique Local)
- `fe80::/10` (IPv6 Link-Local)

### 2.2 DNS Rebinding Protection
To prevent DNS rebinding attacks where an attacker's DNS nameserver alters its response between lookup time and HTTP connection time:
1. `safeFetch` resolves DNS records using Node.js `dns.promises.lookup` with `{ all: true }`.
2. Every resolved address (IPv4 and IPv6) is validated against the blocked CIDR masks.
3. The HTTP connection is pinned directly to the validated IP address, with the original hostname passed explicitly in the `Host` header and TLS SNI extension.

### 2.3 Strict Response Guardrails
- **Max Response Size:** 5 MB ceiling. Streams are aborted immediately if `content-length` or cumulative bytes exceed this limit.
- **Max Redirects:** Hard limit of 5 hops. Every redirect destination is subject to full recursive SSRF checks.
- **Connection Timeout:** Strict 10-second socket timeout.

---

## 3. Safe Crawling & HTML Parsing Guarantees

1. **Zero JavaScript Execution:** SpeedPilot never runs audited web pages in an active headless browser or JavaScript VM inside the application server during Technical SEO crawls.
2. **Safe Static DOM Parsing:** SEO analysis utilizes Cheerio / htmlparser2 to parse the static HTML DOM tree. Script tags are ignored and never evaluated.
3. **Crawl Boundaries:** When auditing XML sitemaps or crawling internal links:
   - Scope is locked to the primary target hostname.
   - Max depth is restricted (default: 3 levels).
   - Max pages per run is enforced (default: 50 in Community, 500 in Pro).

---

## 4. Multi-Tenant Workspace Isolation

- Every database query for projects, target URLs, audit jobs, recommendations, and reports is scoped by `workspaceId`.
- API keys and user session tokens are cryptographically associated with a single workspace.
- API Key secrets are hashed using SHA-256 before persistence in PostgreSQL (`keyHash`). The raw key is shown to the user only once at creation time.

---

## 5. Secret & Credential Management

- All sensitive keys (`GOOGLE_PAGESPEED_API_KEY`, `GOOGLE_CRUX_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`) are loaded exclusively from environment variables.
- Secrets are never committed to version control.
- Logs and error stack traces automatically sanitize and redact authorization headers, tokens, and sensitive URL query parameters.
