import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";

export async function POST(req: NextRequest) {
  try {
    const { baselineExecutionId, targetExecutionId } = await req.json();

    if (!baselineExecutionId || !targetExecutionId) {
      return NextResponse.json(
        { error: "baselineExecutionId and targetExecutionId are required" },
        { status: 400 }
      );
    }

    const [baseline, target] = await Promise.all([
      prisma.auditExecution.findUnique({
        where: { id: baselineExecutionId },
        include: {
          lighthouse: true,
          crux: true,
          seo: true,
          issues: true,
          auditJob: { include: { project: true } },
        },
      }),
      prisma.auditExecution.findUnique({
        where: { id: targetExecutionId },
        include: {
          lighthouse: true,
          crux: true,
          seo: true,
          issues: true,
          auditJob: { include: { project: true } },
        },
      }),
    ]);

    if (!baseline || !target) {
      return NextResponse.json({ error: "One or both execution records could not be found" }, { status: 404 });
    }

    const baseLh = baseline.lighthouse;
    const targetLh = target.lighthouse;

    // Compute deltas (Positive delta on score is good, negative delta on ms/CLS is good)
    const deltas = {
      performance: (targetLh?.performanceScore ?? 0) - (baseLh?.performanceScore ?? 0),
      accessibility: (targetLh?.accessibilityScore ?? 0) - (baseLh?.accessibilityScore ?? 0),
      bestPractices: (targetLh?.bestPracticesScore ?? 0) - (baseLh?.bestPracticesScore ?? 0),
      seo: (targetLh?.seoScore ?? 0) - (baseLh?.seoScore ?? 0),
      lcpMs: (targetLh?.lcpMs ?? 0) - (baseLh?.lcpMs ?? 0),
      tbtMs: (targetLh?.tbtMs ?? 0) - (baseLh?.tbtMs ?? 0),
      cls: parseFloat(((targetLh?.cls ?? 0) - (baseLh?.cls ?? 0)).toFixed(3)),
    };

    // Calculate resolved issues vs newly introduced regressions
    const baseIssueCodes = new Set(baseline.issues.map((i) => i.code));
    const targetIssueCodes = new Set(target.issues.map((i) => i.code));

    const resolvedIssues = baseline.issues.filter((i) => !targetIssueCodes.has(i.code));
    const newRegressions = target.issues.filter((i) => !baseIssueCodes.has(i.code));

    return NextResponse.json({
      data: {
        baseline: {
          id: baseline.id,
          url: baseline.url,
          device: baseline.device,
          createdAt: baseline.createdAt,
          scores: baseLh,
          issuesCount: baseline.issues.length,
        },
        target: {
          id: target.id,
          url: target.url,
          device: target.device,
          createdAt: target.createdAt,
          scores: targetLh,
          issuesCount: target.issues.length,
        },
        deltas,
        resolvedIssues,
        newRegressions,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

