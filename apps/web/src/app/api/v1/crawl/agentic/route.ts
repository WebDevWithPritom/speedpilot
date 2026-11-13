import { NextRequest, NextResponse } from "next/server";
import { runAgenticSiteCrawl } from "@speedpilot/seo-engine";
import { validateAndNormalizeUrl } from "@speedpilot/shared";

export async function POST(req: NextRequest) {
  try {
    const { rootUrl, maxPages = 30, maxDepth = 2 } = await req.json();

    if (!rootUrl || typeof rootUrl !== "string") {
      return NextResponse.json({ error: "Root website URL is required" }, { status: 400 });
    }

    const norm = validateAndNormalizeUrl(rootUrl);
    if (!norm.isValid || !norm.normalizedUrl) {
      return NextResponse.json({ error: "Invalid target website URL syntax" }, { status: 400 });
    }

    const result = await runAgenticSiteCrawl({
      startUrl: norm.normalizedUrl,
      maxPages: Math.min(100, Math.max(5, maxPages)),
      maxDepth: Math.min(4, Math.max(1, maxDepth)),
      timeoutMs: 10_000,
    });

    return NextResponse.json({
      success: true,
      data: result,
      urls: result.pages.map((p) => p.url),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Agentic crawl failed" },
      { status: 500 }
    );
  }
}
