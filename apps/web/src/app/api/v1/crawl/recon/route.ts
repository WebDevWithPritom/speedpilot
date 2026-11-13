import { NextRequest, NextResponse } from "next/server";
import { runAIAutonomousRecon } from "@speedpilot/seo-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      domainOrUrl,
      maxPages = 35,
      maxDepth = 2,
      probeHighValueRoutes = true,
    } = body || {};

    if (!domainOrUrl || typeof domainOrUrl !== "string") {
      return NextResponse.json(
        { error: "Target domain or root URL is required" },
        { status: 400 }
      );
    }

    const result = await runAIAutonomousRecon({
      domainOrUrl,
      maxPages: Math.min(100, Math.max(5, Number(maxPages) || 35)),
      maxDepth: Math.min(3, Math.max(1, Number(maxDepth) || 2)),
      probeHighValueRoutes: probeHighValueRoutes !== false,
      timeoutMs: 6_000,
    });

    return NextResponse.json({
      success: true,
      data: result,
      urls: result.pages.map((p) => p.url),
      recommendedUrls: result.recommendedAuditUrls,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "AI Recon crawl failed" },
      { status: 500 }
    );
  }
}

