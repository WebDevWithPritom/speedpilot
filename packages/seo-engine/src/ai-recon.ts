import { safeFetch } from "@speedpilot/security";
import { validateAndNormalizeUrl, TechStack } from "@speedpilot/shared";
import { detectTechStack } from "./tech-detector.js";

export type RouteCategory =
  | "CHECKOUT_FUNNEL"
  | "LANDING_PAGE"
  | "CATALOG_PRODUCT"
  | "CONTENT_SEO"
  | "UTILITY_LEGAL";

export type BusinessImpact = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ReconDiscoveredPage {
  url: string;
  pathname: string;
  title: string | null;
  category: RouteCategory;
  categoryLabel: string;
  businessImpact: BusinessImpact;
  impactReason: string;
  statusCode: number;
  depth: number;
  discoverySource: "SITEMAP" | "NAVIGATION" | "HIGH_VALUE_PROBE" | "SPIDER";
}

export interface ReconBrokenLink {
  sourceUrl: string;
  targetUrl: string;
  statusCode?: number;
  errorMessage?: string;
}

export interface AIReconResult {
  rootUrl: string;
  domain: string;
  detectedStack: TechStack;
  totalPagesDiscovered: number;
  categoryCounts: Record<RouteCategory, number>;
  pages: ReconDiscoveredPage[];
  recommendedAuditUrls: string[];
  brokenLinks: ReconBrokenLink[];
  sitemapFound: boolean;
  sitemapUrl?: string;
}

export interface AIReconOptions {
  domainOrUrl: string;
  maxPages?: number;
  maxDepth?: number;
  timeoutMs?: number;
  probeHighValueRoutes?: boolean;
}

const ASSET_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".ico",
  ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
  ".mp4", ".webm", ".mp3", ".wav",
  ".css", ".js", ".mjs", ".json", ".xml", ".txt",
  ".woff", ".woff2", ".ttf", ".eot",
]);

const NOISE_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "fbclid", "msclkid", "mc_cid", "mc_eid",
  "ref", "source", "ptype", "pagevariation", "pagevariation", "root",
  "_ga", "_gl", "srsltid", "ved", "ei", "f", "nav_1", "nav_2", "nav_3",
]);

const HIGH_VALUE_PATHS = [
  "/pricing",
  "/plans",
  "/checkout",
  "/cart",
  "/basket",
  "/signup",
  "/register",
  "/onboarding",
  "/features",
  "/solutions",
  "/products",
  "/shop",
  "/blog",
  "/about",
  "/contact",
];

/**
 * Classifies a URL & Title into a business intent category & impact rating.
 */
export function classifyRoute(urlStr: string, pageTitle?: string | null): {
  category: RouteCategory;
  categoryLabel: string;
  businessImpact: BusinessImpact;
  impactReason: string;
} {
  let pathname = "";
  try {
    pathname = new URL(urlStr).pathname.toLowerCase();
  } catch {
    pathname = urlStr.toLowerCase();
  }
  const title = (pageTitle || "").toLowerCase();

  // 1. Checkout & Funnels (Critical revenue impact)
  const isCheckout =
    /\b(checkout|cart|basket|bag|billing|pay|payment|order|pricing|plans|signup|register|onboarding|join|subscribe|upgrade|quote)\b/i.test(pathname) ||
    /\b(checkout|shopping cart|pricing|sign up|create account|start free trial)\b/i.test(title);

  if (isCheckout) {
    return {
      category: "CHECKOUT_FUNNEL",
      categoryLabel: "Conversion & Checkout Funnel",
      businessImpact: "CRITICAL",
      impactReason: "Direct revenue driver. Latency or JS blocking directly spikes bounce and abandon rates.",
    };
  }

  // 2. High-Impact Landing & Acquisition Pages
  const isLanding =
    pathname === "/" ||
    pathname === "" ||
    /^\/lp(\/|$)/i.test(pathname) ||
    /\b(home|landing|features|solutions|platform|services|product-tour|demo|enterprise|why-|promo|campaign)\b/i.test(pathname) ||
    /\b(features|solutions|overview|platform|welcome|just do it)\b/i.test(title);

  if (isLanding) {
    return {
      category: "LANDING_PAGE",
      categoryLabel: "High-Impact Landing Page",
      businessImpact: "HIGH",
      impactReason: "Core customer acquisition surface. LCP & layout shift heavily impact first impressions.",
    };
  }

  // 3. E-commerce Products & Catalog
  const isProduct =
    /\/(c|p|d)\/\d+/i.test(pathname) ||
    /\b(product|products|item|items|collection|collections|catalog|shop|store|buy|category|categories|new-arrivals|best-sellers|sale|markdowns|deals|trending|shoes|sneakers|clothing|apparel|accessories|brands|men|women|kids|jordan)\b/i.test(pathname);

  if (isProduct) {
    return {
      category: "CATALOG_PRODUCT",
      categoryLabel: "Product & Catalog Page",
      businessImpact: "HIGH",
      impactReason: "Product discovery & organic shopping index. Heavy images and script payloads risk poor FID/INP.",
    };
  }

  // 4. Content & SEO Articles
  const isContent =
    /\b(blog|article|articles|news|post|posts|guide|guides|learn|resources|help|help-center|faq|docs|documentation|tutorial|case-studies|insights|stories)\b/i.test(pathname) ||
    /\b(blog|guide|documentation|tutorial|knowledge base)\b/i.test(title);

  if (isContent) {
    return {
      category: "CONTENT_SEO",
      categoryLabel: "Content & SEO Article",
      businessImpact: "MEDIUM",
      impactReason: "Organic search visibility. CWV pass rates influence Google search ranking algorithms.",
    };
  }

  // 5. Utility & Company
  return {
    category: "UTILITY_LEGAL",
    categoryLabel: "Utility & Company",
    businessImpact: "LOW",
    impactReason: "Informational or regulatory pages with moderate traffic sensitivity.",
  };
}

/**
 * Extracts basic page title from HTML.
 */
function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match || !match[1]) return null;
  return match[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/**
 * Cleans, unescapes, canonicalizes, and strips noise query parameters from a raw href.
 */
function cleanAndCanonicalizeUrl(
  rawHref: string,
  currentUrl: string,
  allowedHosts: Set<string>
): string | null {
  let decoded = rawHref
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

  if (
    !decoded ||
    decoded.startsWith("javascript:") ||
    decoded.startsWith("mailto:") ||
    decoded.startsWith("tel:")
  ) {
    return null;
  }

  try {
    const parsed = new URL(decoded, currentUrl);
    const parsedHost = parsed.hostname.toLowerCase();

    // Check if hostname matches any allowed host or base domain
    const isAllowed = Array.from(allowedHosts).some((h) => {
      const lh = h.toLowerCase();
      return parsedHost === lh || parsedHost.endsWith(`.${lh}`) || lh.endsWith(`.${parsedHost}`);
    });
    if (!isAllowed) return null;

    // Check file extension for assets
    const pathname = parsed.pathname.toLowerCase();
    const dotIndex = pathname.lastIndexOf(".");
    if (dotIndex !== -1) {
      const ext = pathname.slice(dotIndex);
      if (ASSET_EXTENSIONS.has(ext)) return null;
    }

    parsed.hash = "";

    // Strip tracking and navigation noise parameters
    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (NOISE_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      parsed.searchParams.delete(key);
    }

    // Standardize pathname (remove duplicate slashes)
    parsed.pathname = parsed.pathname.replace(/\/+/g, "/");
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    // Standardize root
    if (parsed.pathname === "" || parsed.pathname === "/") {
      parsed.pathname = "/";
      if (Array.from(parsed.searchParams.keys()).length === 0) {
        parsed.search = "";
      }
    }

    const norm = validateAndNormalizeUrl(parsed.toString());
    return norm.isValid ? norm.normalizedUrl || null : null;
  } catch {
    return null;
  }
}

/**
 * Extracts valid internal links from raw HTML text.
 */
function extractInternalLinks(
  html: string,
  currentUrl: string,
  allowedHosts: Set<string>
): string[] {
  const matches = Array.from(html.matchAll(/<a\s+[^>]*?href=["']([^"'#\s]+)["']/gi));
  const links: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const rawHref = match[1]?.trim();
    if (!rawHref) continue;

    const cleaned = cleanAndCanonicalizeUrl(rawHref, currentUrl, allowedHosts);
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      links.push(cleaned);
    }
  }

  return links;
}

/**
 * Probes for XML sitemaps via /robots.txt and standard endpoints.
 */
async function probeSitemaps(rootUrl: string, timeoutMs: number): Promise<string[]> {
  const sitemapUrls: string[] = [];
  const origin = new URL(rootUrl).origin;

  // 1. Probe robots.txt
  try {
    const robotsRes = await safeFetch(`${origin}/robots.txt`, {
      timeoutMs: Math.min(4000, timeoutMs),
      headers: { "User-Agent": "SpeedPilot-Intelligence-Recon/1.0" },
    });
    if (robotsRes.status >= 200 && robotsRes.status < 300) {
      const robotsText = await robotsRes.text();
      const matches = Array.from(robotsText.matchAll(/Sitemap:\s*([^\s]+)/gi));
      for (const m of matches) {
        if (m[1]) sitemapUrls.push(m[1].trim());
      }
    }
  } catch {
    // Ignore
  }

  // 2. Probe default sitemap paths if none found in robots.txt
  if (sitemapUrls.length === 0) {
    const candidatePaths = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"];
    for (const p of candidatePaths) {
      try {
        const check = await safeFetch(`${origin}${p}`, {
          method: "HEAD",
          timeoutMs: 2500,
          headers: { "User-Agent": "SpeedPilot-Intelligence-Recon/1.0" },
        });
        if (check.status >= 200 && check.status < 300) {
          sitemapUrls.push(`${origin}${p}`);
          break;
        }
      } catch {
        // Ignore
      }
    }
  }

  return sitemapUrls;
}

/**
 * Quick extraction of page URLs from raw sitemap XML text.
 */
function extractUrlsFromSitemapXml(
  xmlText: string,
  currentUrl: string,
  allowedHosts: Set<string>,
  maxLimit = 50
): string[] {
  const urls: string[] = [];
  const locMatches = Array.from(xmlText.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi));

  for (const m of locMatches) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    if (raw.endsWith(".xml") || raw.includes("sitemap")) continue;

    const cleaned = cleanAndCanonicalizeUrl(raw, currentUrl, allowedHosts);
    if (cleaned && !urls.includes(cleaned)) {
      urls.push(cleaned);
      if (urls.length >= maxLimit) break;
    }
  }

  return urls;
}

/**
 * Executes Autonomous AI Site Reconnaissance.
 * Discovers site routes via sitemaps, spidering, and high-value route probing,
 * verifies each URL with HTTP checks, and classifies each route by business intent.
 */
export async function runAIAutonomousRecon(
  options: AIReconOptions
): Promise<AIReconResult> {
  const {
    domainOrUrl,
    maxPages = 35,
    maxDepth = 2,
    timeoutMs = 6000,
    probeHighValueRoutes = true,
  } = options;

  let startInput = domainOrUrl.trim();
  if (!startInput.startsWith("http://") && !startInput.startsWith("https://")) {
    startInput = `https://${startInput}`;
  }

  const rootNorm = validateAndNormalizeUrl(startInput);
  if (!rootNorm.isValid || !rootNorm.normalizedUrl) {
    throw new Error(`Invalid domain or target URL syntax: ${domainOrUrl}`);
  }

  const initialRootUrl = rootNorm.normalizedUrl;
  const initialRootObj = new URL(initialRootUrl);
  const baseHostname = initialRootObj.hostname;

  let detectedStack: TechStack = "UNKNOWN";
  const visitedUrls = new Set<string>();
  const discoveredPagesMap = new Map<string, ReconDiscoveredPage>();
  const brokenLinks: ReconBrokenLink[] = [];
  const candidateUrls = new Set<string>();

  // Allowed hostnames set (includes both the user-entered domain and any canonical redirect domain)
  const allowedHosts = new Set<string>([baseHostname]);

  // Helper to add a page with classification
  const registerDiscoveredPage = (
    url: string,
    title: string | null,
    statusCode: number,
    depth: number,
    source: ReconDiscoveredPage["discoverySource"]
  ) => {
    if (discoveredPagesMap.has(url)) return;
    const pathname = new URL(url).pathname;
    const classification = classifyRoute(url, title);

    discoveredPagesMap.set(url, {
      url,
      pathname,
      title,
      category: classification.category,
      categoryLabel: classification.categoryLabel,
      businessImpact: classification.businessImpact,
      impactReason: classification.impactReason,
      statusCode,
      depth,
      discoverySource: source,
    });
  };

  let activeRootUrl = initialRootUrl;
  let activeOrigin = initialRootObj.origin;

  // --- Step 1: Probe Root Page & Follow Redirect to Canonical Origin ---
  try {
    const rootRes = await safeFetch(initialRootUrl, {
      timeoutMs,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "SpeedPilot-Intelligence-Recon/1.0",
      },
    });

    if (rootRes.status >= 200 && rootRes.status < 400) {
      // Adopt canonical redirect URL & origin (e.g. nike.com -> https://www.nike.in/ or https://www.nike.com/)
      activeRootUrl = rootRes.url;
      const canonicalObj = new URL(activeRootUrl);
      activeOrigin = canonicalObj.origin;
      allowedHosts.add(canonicalObj.hostname);

      const rootHtml = await rootRes.text();
      const rootTitle = extractTitle(rootHtml);
      const detection = detectTechStack(rootHtml, rootRes.headers);
      detectedStack = detection.detectedStack;

      registerDiscoveredPage(activeRootUrl, rootTitle, rootRes.status, 0, "NAVIGATION");
      visitedUrls.add(activeRootUrl);

      // Extract internal links from root HTML
      const rootLinks = extractInternalLinks(rootHtml, activeRootUrl, allowedHosts);
      for (const link of rootLinks) {
        if (link !== activeRootUrl) {
          candidateUrls.add(link);
        }
      }
    } else {
      brokenLinks.push({
        sourceUrl: initialRootUrl,
        targetUrl: initialRootUrl,
        statusCode: rootRes.status,
        errorMessage: `Root domain returned HTTP status ${rootRes.status}`,
      });
    }
  } catch (err: unknown) {
    brokenLinks.push({
      sourceUrl: initialRootUrl,
      targetUrl: initialRootUrl,
      errorMessage: (err as Error).message,
    });
  }

  // --- Step 2: Probe Sitemaps ---
  let sitemapFound = false;
  let primarySitemapUrl: string | undefined = undefined;

  try {
    const sitemaps = await probeSitemaps(activeRootUrl, timeoutMs);
    if (sitemaps.length > 0 && sitemaps[0]) {
      sitemapFound = true;
      primarySitemapUrl = sitemaps[0];
      const smRes = await safeFetch(primarySitemapUrl, {
        timeoutMs,
        headers: { "User-Agent": "SpeedPilot-Intelligence-Recon/1.0" },
      });

      if (smRes.status >= 200 && smRes.status < 300) {
        const smText = await smRes.text();
        const smUrls = extractUrlsFromSitemapXml(smText, activeRootUrl, allowedHosts, maxPages * 2);
        for (const u of smUrls) {
          if (u !== activeRootUrl) {
            candidateUrls.add(u);
          }
        }
      }
    }
  } catch {
    // Sitemaps optional
  }

  // --- Step 3: High-Value Route Probing (Check key conversion routes) ---
  if (probeHighValueRoutes) {
    const probeCandidates = HIGH_VALUE_PATHS.map((p) => `${activeOrigin}${p}`);
    for (const c of probeCandidates) {
      if (!candidateUrls.has(c) && c !== activeRootUrl) {
        candidateUrls.add(c);
      }
    }
  }

  // --- Step 4: Parallel Validation & Verification of Discovered Candidate URLs ---
  const candidatesToValidate = Array.from(candidateUrls).slice(0, Math.max(maxPages * 2, 50));
  
  // Concurrent worker batch validation (concurrency: 6)
  const concurrency = 6;
  const queue = [...candidatesToValidate];

  const validateWorker = async () => {
    while (queue.length > 0 && discoveredPagesMap.size < maxPages) {
      const targetUrl = queue.shift();
      if (!targetUrl || discoveredPagesMap.has(targetUrl)) continue;

      try {
        const res = await safeFetch(targetUrl, {
          timeoutMs: 4000,
          headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "User-Agent": "SpeedPilot-Intelligence-Recon/1.0",
          },
        });

        if (res.status >= 200 && res.status < 400) {
          // Verify final URL after redirect is within allowed hosts
          const finalUrl = res.url;
          const finalObj = new URL(finalUrl);
          const isAllowed = Array.from(allowedHosts).some((h) => {
            const lh = h.toLowerCase();
            const ph = finalObj.hostname.toLowerCase();
            return ph === lh || ph.endsWith(`.${lh}`) || lh.endsWith(`.${ph}`);
          });

          if (!isAllowed) continue;

          let title: string | null = null;
          try {
            const html = await res.text();
            title = extractTitle(html);
          } catch {
            // Ignore text parse errors
          }

          registerDiscoveredPage(finalUrl, title, res.status, 1, "SPIDER");
        } else if (res.status === 404 || res.status >= 500) {
          brokenLinks.push({
            sourceUrl: activeRootUrl,
            targetUrl,
            statusCode: res.status,
          });
        }
      } catch (err: unknown) {
        // Network timeout / DNS / connection errors
        brokenLinks.push({
          sourceUrl: activeRootUrl,
          targetUrl,
          errorMessage: (err as Error).message,
        });
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }).map(() => validateWorker()));

  // --- Step 5: Recursive Spider for Additional Depth if quota not yet met ---
  if (discoveredPagesMap.size < maxPages && maxDepth > 1) {
    const spiderTargets = Array.from(discoveredPagesMap.values())
      .filter((p) => p.depth < maxDepth && !visitedUrls.has(p.url))
      .slice(0, 6);

    for (const target of spiderTargets) {
      if (discoveredPagesMap.size >= maxPages) break;
      visitedUrls.add(target.url);

      try {
        const pageRes = await safeFetch(target.url, {
          timeoutMs: 4000,
          headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "User-Agent": "SpeedPilot-Intelligence-Recon/1.0",
          },
        });

        if (pageRes.status >= 200 && pageRes.status < 400) {
          const html = await pageRes.text();
          const title = extractTitle(html);
          if (title && !target.title) {
            target.title = title;
          }
          const childLinks = extractInternalLinks(html, target.url, allowedHosts);
          for (const childUrl of childLinks) {
            if (discoveredPagesMap.size >= maxPages) break;
            if (!discoveredPagesMap.has(childUrl) && childUrl !== activeRootUrl) {
              registerDiscoveredPage(childUrl, null, 200, target.depth + 1, "SPIDER");
            }
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  const allPages = Array.from(discoveredPagesMap.values());

  // Category counts
  const categoryCounts: Record<RouteCategory, number> = {
    CHECKOUT_FUNNEL: 0,
    LANDING_PAGE: 0,
    CATALOG_PRODUCT: 0,
    CONTENT_SEO: 0,
    UTILITY_LEGAL: 0,
  };

  allPages.forEach((p) => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  // Sort pages by Business Impact (CRITICAL -> HIGH -> MEDIUM -> LOW)
  const impactOrder: Record<BusinessImpact, number> = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
  };

  allPages.sort((a, b) => impactOrder[a.businessImpact] - impactOrder[b.businessImpact]);

  // Select top recommended audit URLs (Priority: Checkout & Landing pages, then Products, then Content)
  const recommendedAuditUrls = allPages.slice(0, 15).map((p) => p.url);

  return {
    rootUrl: activeRootUrl,
    domain: new URL(activeRootUrl).hostname,
    detectedStack,
    totalPagesDiscovered: allPages.length,
    categoryCounts,
    pages: allPages,
    recommendedAuditUrls,
    brokenLinks,
    sitemapFound,
    sitemapUrl: primarySitemapUrl,
  };
}
