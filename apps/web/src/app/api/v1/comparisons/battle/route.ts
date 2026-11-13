import { NextRequest, NextResponse } from "next/server";
import { PageSpeedClient } from "@speedpilot/pagespeed";
import { validateAndNormalizeUrl } from "@speedpilot/shared";

export const maxDuration = 60;

const psiClient = new PageSpeedClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { urlA, urlB, device = "MOBILE" } = body;

    if (!urlA || !urlB) {
      return NextResponse.json(
        { error: "Please provide both URLs (Your Site and Competitor Site) to compare." },
        { status: 400 }
      );
    }

    const normA = validateAndNormalizeUrl(urlA);
    const normB = validateAndNormalizeUrl(urlB);

    if (!normA.isValid || !normA.normalizedUrl) {
      return NextResponse.json({ error: `Invalid URL A: ${normA.error || "Malformed URL"}` }, { status: 400 });
    }

    if (!normB.isValid || !normB.normalizedUrl) {
      return NextResponse.json({ error: `Invalid URL B: ${normB.error || "Malformed URL"}` }, { status: 400 });
    }

    const targetA = normA.normalizedUrl;
    const targetB = normB.normalizedUrl;
    const targetDevice = device === "DESKTOP" ? "DESKTOP" : "MOBILE";

    // Run both audits concurrently
    const [resultA, resultB] = await Promise.all([
      psiClient.runAudit(targetA, targetDevice),
      psiClient.runAudit(targetB, targetDevice),
    ]);

    // Calculate score deltas (A minus B)
    const perfDelta = resultA.scores.performance - resultB.scores.performance;
    const lcpDelta = resultA.labMetrics.lcpMs - resultB.labMetrics.lcpMs; // Negative is better (faster)
    const tbtDelta = resultA.labMetrics.tbtMs - resultB.labMetrics.tbtMs; // Negative is better
    const clsDelta = Number((resultA.labMetrics.cls - resultB.labMetrics.cls).toFixed(3)); // Negative is better
    const seoDelta = resultA.scores.seo - resultB.scores.seo;
    const a11yDelta = resultA.scores.accessibility - resultB.scores.accessibility;

    // Tally wins
    let winsA = 0;
    let winsB = 0;

    if (perfDelta > 0) winsA++; else if (perfDelta < 0) winsB++;
    if (lcpDelta < 0) winsA++; else if (lcpDelta > 0) winsB++;
    if (tbtDelta < 0) winsA++; else if (tbtDelta > 0) winsB++;
    if (clsDelta < 0) winsA++; else if (clsDelta > 0) winsB++;
    if (seoDelta > 0) winsA++; else if (seoDelta < 0) winsB++;
    if (a11yDelta > 0) winsA++; else if (a11yDelta < 0) winsB++;

    let overallWinner: "A" | "B" | "TIE" = "TIE";
    if (winsA > winsB) overallWinner = "A";
    else if (winsB > winsA) overallWinner = "B";

    return NextResponse.json({
      success: true,
      device: targetDevice,
      siteA: {
        url: targetA,
        scores: resultA.scores,
        metrics: resultA.labMetrics,
        wins: winsA,
      },
      siteB: {
        url: targetB,
        scores: resultB.scores,
        metrics: resultB.labMetrics,
        wins: winsB,
      },
      comparison: {
        overallWinner,
        perfDelta,
        lcpDeltaMs: lcpDelta,
        tbtDeltaMs: tbtDelta,
        clsDelta,
        seoDelta,
        a11yDelta,
        verdict:
          overallWinner === "A"
            ? `${targetA} outperforms ${targetB} on ${winsA} of 6 key performance & Core Web Vitals signals.`
            : overallWinner === "B"
            ? `${targetB} is faster and higher-scoring than ${targetA} across ${winsB} of 6 key metrics.`
            : "Both websites perform neck-and-neck across Core Web Vitals.",
      },
    });
  } catch (err: any) {
    console.error("[BattleAPI] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to execute competitor comparison battle" },
      { status: 500 }
    );
  }
}
