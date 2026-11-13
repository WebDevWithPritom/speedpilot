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

function categorizeSitemap(childUrl: string): { label: string; description: string; isRecommended: boolean } {
  const fileName = (childUrl.split("/").pop() || "").toLowerCase();
  if (fileName.includes("post") || fileName.includes("article")) {
    return {
      label: "Blog Posts & Articles",
      description: "Individual blog articles, guides, and editorial content",
      isRecommended: true,
    };
  }
  if (fileName.includes("page")) {
    return {
      label: "Static & Marketing Pages",
      description: "Core landing pages, pricing, features, and company info",
      isRecommended: true,
    };
  }
  if (fileName.includes("author") || fileName.includes("user")) {
    return {
      label: "Author Profiles",
      description: "Author bios and contributor archive pages",
      isRecommended: false,
    };
  }
  if (fileName.includes("home")) {
    return {
      label: "Homepage & Pagination",
      description: "Main front landing page and pagination archives",
      isRecommended: true,
    };
  }
  if (fileName.includes("product") || fileName.includes("item") || fileName.includes("catalog")) {
    return {
      label: "Product Catalog",
      description: "E-commerce and store item pages",
      isRecommended: true,
    };
  }
  if (fileName.includes("category") || fileName.includes("tag") || fileName.includes("taxonomy")) {
    return {
      label: "Categories & Taxonomies",
      description: "Topic and tag archive index listings",
      isRecommended: false,
    };
  }
  return {
    label: "Web Content Pages",
    description: "General publication pages",
    isRecommended: true,
  };
}

export interface DiscoveredChildSitemap {
  url: string;
  fileName: string;
  label: string;
  description: string;
  isRecommended: boolean;
  urlCount: number;
  urls: string[];
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
    const childSitemaps: DiscoveredChildSitemap[] = [];
    const allDiscovered = new Set<string>();

    if (isSitemapIndex) {
      // It's a sitemap index containing child sitemaps
      const rawChildUrls = extractLocs(rootXml);

      for (const childUrl of rawChildUrls.slice(0, 10)) {
        const childNorm = validateAndNormalizeUrl(childUrl);
        if (!childNorm.isValid || !childNorm.normalizedUrl) continue;

        const fileName = childNorm.normalizedUrl.split("/").pop() || "sitemap.xml";
        const meta = categorizeSitemap(childNorm.normalizedUrl);
        const childUrls: string[] = [];

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
              childUrls.push(pageNorm.normalizedUrl);
              allDiscovered.add(pageNorm.normalizedUrl);
            }
          }
        } catch {
          // If a single child sitemap fails to fetch, keep going
        }

        childSitemaps.push({
          url: childNorm.normalizedUrl,
          fileName,
          label: meta.label,
          description: meta.description,
          isRecommended: meta.isRecommended,
          urlCount: childUrls.length,
          urls: childUrls,
        });
      }
    } else {
      // Direct urlset (single sitemap file)
      const pageUrls = extractLocs(rootXml);
      for (const pageUrl of pageUrls) {
        const pageNorm = validateAndNormalizeUrl(pageUrl);
        if (pageNorm.isValid && pageNorm.normalizedUrl && !pageNorm.normalizedUrl.endsWith(".xml")) {
          allDiscovered.add(pageNorm.normalizedUrl);
        }
      }
    }

    const allUrlsArray = Array.from(allDiscovered).slice(0, maxUrls);

    return NextResponse.json({
      sitemapUrl: norm.normalizedUrl,
      isSitemapIndex,
      childSitemaps,
      discoveredCount: allUrlsArray.length,
      urls: allUrlsArray,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to discover sitemap URLs" },
      { status: 500 }
    );
  }
}
