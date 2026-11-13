import { NextRequest, NextResponse } from "next/server";
import { safeFetch } from "@speedpilot/security";
import { validateAndNormalizeUrl } from "@speedpilot/shared";

/**
 * Extracts all <loc> values from an XML string.
 */
function extractLocs(xml: string): string[] {
  const matches = Array.from(xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi));
  return matches.map((m) => m[1]?.trim()).filter((url): url is string => Boolean(url));
}

/**
 * Recursively discovers page URLs from XML sitemaps and sitemap indexes.
 */
export async function POST(req: NextRequest) {
  try {
    const { sitemapUrl, maxUrls = 50 } = await req.json();

    if (!sitemapUrl || typeof sitemapUrl !== "string") {
      return NextResponse.json({ error: "Sitemap URL is required" }, { status: 400 });
    }

    const norm = validateAndNormalizeUrl(sitemapUrl);
    if (!norm.isValid || !norm.normalizedUrl) {
      return NextResponse.json({ error: "Invalid sitemap URL syntax" }, { status: 400 });
    }

    // SSRF-guarded fetch of root sitemap
    const rootResp = await safeFetch(norm.normalizedUrl, {
      timeoutMs: 15_000,
      headers: { Accept: "application/xml,text/xml,*/*" },
    });

    const rootXml = await rootResp.text();
    const isSitemapIndex = rootXml.includes("<sitemapindex") || rootXml.includes("<sitemap>");
    const discovered = new Set<string>();

    if (isSitemapIndex) {
      // It's a sitemap index containing child sitemaps
      const childSitemaps = extractLocs(rootXml);

      // Fetch up to 5 child sitemaps to collect real HTML URLs
      for (const childUrl of childSitemaps.slice(0, 5)) {
        if (discovered.size >= maxUrls) break;

        const childNorm = validateAndNormalizeUrl(childUrl);
        if (!childNorm.isValid || !childNorm.normalizedUrl) continue;

        try {
          const childResp = await safeFetch(childNorm.normalizedUrl, {
            timeoutMs: 10_000,
            headers: { Accept: "application/xml,text/xml,*/*" },
          });
          const childXml = await childResp.text();
          const pageUrls = extractLocs(childXml);

          for (const pageUrl of pageUrls) {
            const pageNorm = validateAndNormalizeUrl(pageUrl);
            if (pageNorm.isValid && pageNorm.normalizedUrl && !pageNorm.normalizedUrl.endsWith(".xml")) {
              discovered.add(pageNorm.normalizedUrl);
            }
            if (discovered.size >= maxUrls) break;
          }
        } catch {
          // If a single child sitemap fails, continue to next
        }
      }
    } else {
      // Direct urlset
      const pageUrls = extractLocs(rootXml);
      for (const pageUrl of pageUrls) {
        const pageNorm = validateAndNormalizeUrl(pageUrl);
        if (pageNorm.isValid && pageNorm.normalizedUrl && !pageNorm.normalizedUrl.endsWith(".xml")) {
          discovered.add(pageNorm.normalizedUrl);
        }
        if (discovered.size >= maxUrls) break;
      }
    }

    return NextResponse.json({
      sitemapUrl: norm.normalizedUrl,
      isSitemapIndex,
      discoveredCount: discovered.size,
      urls: Array.from(discovered),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to discover sitemap URLs" },
      { status: 500 }
    );
  }
}
