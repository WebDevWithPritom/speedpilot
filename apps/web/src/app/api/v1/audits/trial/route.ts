import { NextRequest, NextResponse } from "next/server";
import { PageSpeedClient } from "@speedpilot/pagespeed";
import { validateAndNormalizeUrl } from "@speedpilot/shared";

export const maxDuration = 60;

const psiClient = new PageSpeedClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = body.url;
    const device = body.device === "DESKTOP" ? "DESKTOP" : "MOBILE";

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json(
        { error: "Please enter a valid website URL to test." },
        { status: 400 }
      );
    }

    const validation = validateAndNormalizeUrl(rawUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      return NextResponse.json(
        { error: validation.error || "Invalid URL format." },
        { status: 400 }
      );
    }

    const targetUrl = validation.normalizedUrl;

    // Use custom Google PSI key if provided by user (via header or body)
    const customKey = req.headers.get("x-custom-google-key") || body.apiKey || undefined;
    const client = customKey ? new PageSpeedClient({ apiKey: customKey }) : psiClient;

    // Run PSI single page test
    const result = await client.runAudit(targetUrl, device);

    // Extract top 3 highest impact opportunities
    const topOpportunities = (result.issues || [])
      .filter((i) => i.score !== undefined && i.score !== null && i.score < 0.9)
      .slice(0, 3)
      .map((i) => ({
        id: i.code,
        title: i.title,
        description: i.evidenceItems?.[0]?.description || i.displayValue || "Performance bottleneck detected.",
        score: i.score ?? null,
        savings: i.displayValue || undefined,
      }));

    return NextResponse.json({
      success: true,
      url: targetUrl,
      device,
      scores: result.scores,
      metrics: {
        lcp: result.labMetrics.lcpMs,
        fcp: result.labMetrics.fcpMs,
        cls: result.labMetrics.cls,
        tbt: result.labMetrics.tbtMs,
        si: result.labMetrics.speedIndexMs,
      },
      topOpportunities,
      unlockedWithAccount: [
        "Framework-specific AI code diffs (Next.js, React, WordPress, Laravel)",
        "Automated recurring audit schedules & regression tracking",
        "Full XML sitemap & bulk CSV imports (up to 500 URLs)",
        "Exportable branded PDF/CSV reports for clients & team sprints",
      ],
    });
  } catch (error: any) {
    console.error("[TrialAudit] Error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to complete audit. Please check that the URL is public and accessible.",
      },
      { status: 500 }
    );
  }
}
