import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";

function avg(nums: Array<number | null | undefined>, decimals = 0): number {
  const valid = nums.filter((n): n is number => n != null);
  if (valid.length === 0) return 0;
  const val = valid.reduce((a, b) => a + b, 0) / valid.length;
  return decimals > 0 ? parseFloat(val.toFixed(decimals)) : Math.round(val);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baselineExecutionId, targetExecutionId, baselineJobId, targetJobId } = body;

    const workspace = await getOrCreateDefaultWorkspace();

    // 1. Bulk Job-vs-Job Site-Wide Comparison
    if (baselineJobId && targetJobId) {
      const [baseJob, targetJob] = await Promise.all([
        prisma.auditJob.findFirst({
          where: { id: baselineJobId, workspaceId: workspace.id },
          include: {
            project: true,
            executions: { where: { status: "COMPLETED" }, include: { lighthouse: true, issues: true } },
          },
        }),
        prisma.auditJob.findFirst({
          where: { id: targetJobId, workspaceId: workspace.id },
          include: {
            project: true,
            executions: { where: { status: "COMPLETED" }, include: { lighthouse: true, issues: true } },
          },
        }),
      ]);

      if (!baseJob || !targetJob) {
        return NextResponse.json({ error: "One or both audit jobs could not be found" }, { status: 404 });
      }

      const summarize = (job: typeof baseJob) => ({
        id: job.id,
        projectName: job.project.name,
        domain: job.project.primaryDomain,
        createdAt: job.createdAt,
        urlsCount: job.executions.length,
        issuesCount: job.executions.reduce((s, e) => s + e.issues.length, 0),
        scores: {
          performanceScore: avg(job.executions.map((e) => e.lighthouse?.performanceScore)),
          accessibilityScore: avg(job.executions.map((e) => e.lighthouse?.accessibilityScore)),
          bestPracticesScore: avg(job.executions.map((e) => e.lighthouse?.bestPracticesScore)),
          seoScore: avg(job.executions.map((e) => e.lighthouse?.seoScore)),
          lcpMs: avg(job.executions.map((e) => e.lighthouse?.lcpMs)),
          tbtMs: avg(job.executions.map((e) => e.lighthouse?.tbtMs)),
          cls: avg(job.executions.map((e) => e.lighthouse?.cls), 3),
        },
      });

      const baseSummary = summarize(baseJob);
      const targetSummary = summarize(targetJob);

      // Match URLs across both jobs for row-by-row ROI table
      const baseByUrl = new Map(baseJob.executions.map((e) => [`${e.url}|${e.device}`, e]));
      const urlPairs = targetJob.executions.map((te) => {
        const be = baseByUrl.get(`${te.url}|${te.device}`);
        return {
          url: te.url,
          device: te.device,
          beforePerf: be?.lighthouse?.performanceScore ?? null,
          afterPerf: te.lighthouse?.performanceScore ?? null,
          beforeLcp: be?.lighthouse?.lcpMs ?? null,
          afterLcp: te.lighthouse?.lcpMs ?? null,
          perfDelta:
            te.lighthouse?.performanceScore != null && be?.lighthouse?.performanceScore != null
              ? te.lighthouse.performanceScore - be.lighthouse.performanceScore
              : null,
        };
      });

      return NextResponse.json({
        data: {
          mode: "JOB",
          baseline: baseSummary,
          target: targetSummary,
          deltas: {
            performance: targetSummary.scores.performanceScore - baseSummary.scores.performanceScore,
            accessibility: targetSummary.scores.accessibilityScore - baseSummary.scores.accessibilityScore,
            bestPractices: targetSummary.scores.bestPracticesScore - baseSummary.scores.bestPracticesScore,
            seo: targetSummary.scores.seoScore - baseSummary.scores.seoScore,
            lcpMs: targetSummary.scores.lcpMs - baseSummary.scores.lcpMs,
            tbtMs: targetSummary.scores.tbtMs - baseSummary.scores.tbtMs,
            cls: parseFloat((targetSummary.scores.cls - baseSummary.scores.cls).toFixed(3)),
          },
          urlPairs,
        },
      });
    }

    if (!baselineExecutionId || !targetExecutionId) {
      return NextResponse.json(
        { error: "baselineExecutionId and targetExecutionId (or baselineJobId and targetJobId) are required" },
        { status: 400 }
      );
    }

    const [baseline, target] = await Promise.all([
      prisma.auditExecution.findFirst({
        where: { id: baselineExecutionId, auditJob: { workspaceId: workspace.id } },
        include: {
          lighthouse: true,
          crux: true,
          seo: true,
          issues: true,
          auditJob: { include: { project: true } },
        },
      }),
      prisma.auditExecution.findFirst({
        where: { id: targetExecutionId, auditJob: { workspaceId: workspace.id } },
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

    const historyRows = await prisma.auditExecution.findMany({
      where: {
        url: target.url,
        device: target.device,
        status: "COMPLETED",
        auditJob: { workspaceId: workspace.id },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
      include: { lighthouse: true },
    });

    const history = historyRows.map((h) => ({
      id: h.id,
      date: h.createdAt,
      performanceScore: h.lighthouse?.performanceScore ?? 0,
      seoScore: h.lighthouse?.seoScore ?? 0,
      lcpMs: h.lighthouse?.lcpMs ?? 0,
    }));

    return NextResponse.json({
      data: {
        mode: "EXECUTION",
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
        history,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

