import { NextRequest, NextResponse } from "next/server";
import { safeFetch } from "@speedpilot/security";
import { validateAndNormalizeUrl } from "@speedpilot/shared";

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

    // SSRF safe fetch of XML sitemap
    const response = await safeFetch(norm.normalizedUrl, {
      timeoutMs: 15_000,
      headers: {
        Accept: "application/xml,text/xml,*/*",
      },
    });

    const xml = await response.text();

    // Extract <loc>...</loc> tags
    const locMatches = Array.from(xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi));
    const discovered = new Set<string>();

    for (const match of locMatches) {
      const rawLoc = match[1]?.trim();
      if (!rawLoc) continue;

      const urlNorm = validateAndNormalizeUrl(rawLoc);
      if (urlNorm.isValid && urlNorm.normalizedUrl) {
        // If it's a child sitemap (sitemap index), note it or skip recursion for safety
        if (!urlNorm.normalizedUrl.endsWith(".xml")) {
          discovered.add(urlNorm.normalizedUrl);
        }
      }

      if (discovered.size >= maxUrls) break;
    }

    return NextResponse.json({
      sitemapUrl: norm.normalizedUrl,
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
