import { safeFetch } from "@speedpilot/security";
import { validateAndNormalizeUrl } from "@speedpilot/shared";

export interface DiscoveredCrawlPage {
  url: string;
  depth: number;
  title: string | null;
  statusCode: number;
  internalLinksFound: number;
}

export interface BrokenLinkRecord {
  sourceUrl: string;
  targetUrl: string;
  statusCode?: number;
  errorMessage?: string;
}

export interface AgenticCrawlResult {
  rootUrl: string;
  domain: string;
  totalPagesDiscovered: number;
  pages: DiscoveredCrawlPage[];
  brokenLinks: BrokenLinkRecord[];
}

export interface AgenticCrawlOptions {
  startUrl: string;
  maxPages?: number;
  maxDepth?: number;
  timeoutMs?: number;
}

const ASSET_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".ico",
  ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
  ".mp4", ".webm", ".mp3", ".wav",
  ".css", ".js", ".mjs", ".json", ".xml", ".txt",
  ".woff", ".woff2", ".ttf", ".eot",
]);

/**
 * Extracts all valid internal hyperlinks from raw HTML text.
 */
function extractInternalLinks(html: string, currentUrl: string, baseHostname: string): string[] {
  const matches = Array.from(html.matchAll(/<a\s+[^>]*?href=["']([^"'#\s]+)["']/gi));
  const links: string[] = [];

  for (const match of matches) {
    const rawHref = match[1]?.trim();
    if (!rawHref) continue;

    // Skip javascript:, mailto:, tel:
    if (rawHref.startsWith("javascript:") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
      continue;
    }

    try {
      const resolved = new URL(rawHref, currentUrl);
      // Strictly maintain same hostname boundary
      if (resolved.hostname.toLowerCase() !== baseHostname.toLowerCase()) {
        continue;
      }

      // Check file extension
      const pathname = resolved.pathname.toLowerCase();
      const dotIndex = pathname.lastIndexOf(".");
      if (dotIndex !== -1) {
        const ext = pathname.slice(dotIndex);
        if (ASSET_EXTENSIONS.has(ext)) continue;
      }

      const normalized = validateAndNormalizeUrl(resolved.toString());
      if (normalized.isValid && normalized.normalizedUrl) {
        links.push(normalized.normalizedUrl);
      }
    } catch {
      // Ignore malformed href
    }
  }

  return links;
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
 * Autonomously crawls an entire domain by starting at a root URL and recursively
 * following internal links, discovering site architecture without requiring a sitemap.
 */
export async function runAgenticSiteCrawl(
  options: AgenticCrawlOptions
): Promise<AgenticCrawlResult> {
  const { startUrl, maxPages = 30, maxDepth = 2, timeoutMs = 8_000 } = options;

  const rootNorm = validateAndNormalizeUrl(startUrl);
  if (!rootNorm.isValid || !rootNorm.normalizedUrl) {
    throw new Error(`Invalid start URL: ${startUrl}`);
  }

  const rootUrl = rootNorm.normalizedUrl;
  const rootObj = new URL(rootUrl);
  const baseHostname = rootObj.hostname;

  const queue: Array<{ url: string; depth: number; sourceUrl?: string }> = [
    { url: rootUrl, depth: 0 },
  ];
  const visited = new Set<string>();
  const discoveredPages: DiscoveredCrawlPage[] = [];
  const brokenLinks: BrokenLinkRecord[] = [];

  while (queue.length > 0 && discoveredPages.length < maxPages) {
    const item = queue.shift();
    if (!item) break;

    const { url, depth, sourceUrl } = item;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const response = await safeFetch(url, {
        timeoutMs,
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": "SpeedPilot-Intelligence-Crawler/1.0",
        },
      });

      const isOk = response.status >= 200 && response.status < 400;
      if (!isOk) {
        if (response.status === 404 || response.status >= 500) {
          brokenLinks.push({
            sourceUrl: sourceUrl || rootUrl,
            targetUrl: url,
            statusCode: response.status,
          });
        }
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        // Not an HTML document
        continue;
      }

      const html = await response.text();
      const title = extractTitle(html);
      const internalLinks = extractInternalLinks(html, url, baseHostname);

      discoveredPages.push({
        url,
        depth,
        title,
        statusCode: response.status,
        internalLinksFound: internalLinks.length,
      });

      // Enqueue subsequent child links if depth allows
      if (depth < maxDepth) {
        for (const childUrl of internalLinks) {
          if (!visited.has(childUrl) && !queue.some((q) => q.url === childUrl)) {
            queue.push({ url: childUrl, depth: depth + 1, sourceUrl: url });
          }
        }
      }
    } catch (err: unknown) {
      brokenLinks.push({
        sourceUrl: sourceUrl || rootUrl,
        targetUrl: url,
        errorMessage: (err as Error).message || "Connection failed",
      });
    }
  }

  return {
    rootUrl,
    domain: baseHostname,
    totalPagesDiscovered: discoveredPages.length,
    pages: discoveredPages,
    brokenLinks,
  };
}
