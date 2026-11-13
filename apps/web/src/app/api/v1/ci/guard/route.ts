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
        { error: "Missing required 'url' parameter to benchmark." },
        { status: 400 }
      );
    }

    const validation = validateAndNormalizeUrl(rawUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      return NextResponse.json(
        { error: validation.error || "Invalid target URL." },
        { status: 400 }
      );
    }

    const targetUrl = validation.normalizedUrl;

    // Optional user-specified performance budgets (with sane sensible defaults)
    const minPerformance = typeof body.minPerformance === "number" ? body.minPerformance : 85;
    const maxLcpMs = typeof body.maxLcpMs === "number" ? body.maxLcpMs : 2500;
    const maxCls = typeof body.maxCls === "number" ? body.maxCls : 0.1;
    const maxTbtMs = typeof body.maxTbtMs === "number" ? body.maxTbtMs : 200;

    // Use custom API key if provided in request
    const customKey = req.headers.get("x-custom-google-key") || body.apiKey || undefined;
    const client = customKey ? new PageSpeedClient({ apiKey: customKey }) : psiClient;

    const result = await client.runAudit(targetUrl, device);

    const violations: string[] = [];

    if (result.scores.performance < minPerformance) {
      violations.push(
        `Performance score is ${result.scores.performance}/100, which is below budget of ${minPerformance}/100.`
      );
    }

    if (result.labMetrics.lcpMs > maxLcpMs) {
      violations.push(
        `Largest Contentful Paint (LCP) is ${result.labMetrics.lcpMs}ms, exceeding budget of ${maxLcpMs}ms.`
      );
    }

    if (result.labMetrics.cls > maxCls) {
      violations.push(
        `Cumulative Layout Shift (CLS) is ${result.labMetrics.cls}, exceeding budget of ${maxCls}.`
      );
    }

    if (result.labMetrics.tbtMs > maxTbtMs) {
      violations.push(
        `Total Blocking Time (TBT) is ${result.labMetrics.tbtMs}ms, exceeding budget of ${maxTbtMs}ms.`
      );
    }

    const passed = violations.length === 0;

    return NextResponse.json(
      {
        pass: passed,
        status: passed ? "PASSED" : "FAILED",
        url: targetUrl,
        device,
        budgets: { minPerformance, maxLcpMs, maxCls, maxTbtMs },
        scores: result.scores,
        metrics: result.labMetrics,
        violations,
      },
      { status: passed ? 200 : 422 }
    );
  } catch (error: any) {
    console.error("[CIGuard] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal error running performance budget check." },
      { status: 500 }
    );
  }
}
