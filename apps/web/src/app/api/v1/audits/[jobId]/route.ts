import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const workspace = await getOrCreateDefaultWorkspace();
    const job = await prisma.auditJob.findFirst({
      where: { id: jobId, workspaceId: workspace.id },
      include: {
        project: { select: { id: true, name: true, primaryDomain: true } },
        executions: {
          include: {
            lighthouse: true,
            crux: true,
            _count: {
              select: { issues: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Audit job not found" }, { status: 404 });
    }

    // Watchdog: detect and auto-recover serverless timeout drops (>90s with pending executions)
    const isStale =
      (job.status === "PROCESSING" || job.status === "QUEUED") &&
      job.startedAt &&
      Date.now() - new Date(job.startedAt).getTime() > 90_000;

    if (isStale) {
      const pending = job.executions.filter(
        (e) => e.status === "QUEUED" || e.status === "AUDITING" || e.status === "FETCHING"
      );

      if (pending.length > 0) {
        await prisma.auditExecution.updateMany({
          where: { id: { in: pending.map((e) => e.id) } },
          data: {
            status: "FAILED",
            errorMessage: "Paused by serverless host (60s limit). Click 'Resume Audit' to process remaining URLs.",
          },
        });

        const newFailed = job.failedUrls + pending.length;
        const newStatus = job.completedUrls > 0 ? "PARTIAL_FAILURE" : "FAILED";

        await prisma.auditJob.update({
          where: { id: job.id },
          data: {
            failedUrls: newFailed,
            status: newStatus,
            completedAt: new Date(),
          },
        });

        job.status = newStatus;
        job.failedUrls = newFailed;
        pending.forEach((p) => {
          p.status = "FAILED";
          p.errorMessage = "Paused by serverless host (60s limit). Click 'Resume Audit' to process remaining URLs.";
        });
      }
    }

    const progressPercentage =
      job.totalUrls > 0 ? Math.round(((job.completedUrls + job.failedUrls) / job.totalUrls) * 100) : 0;

    return NextResponse.json({
      data: {
        jobId: job.id,
        project: job.project,
        status: job.status,
        deviceMode: job.deviceMode,
        progress: {
          total: job.totalUrls,
          completed: job.completedUrls,
          failed: job.failedUrls,
          percentage: progressPercentage,
        },
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        executions: job.executions,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const workspace = await getOrCreateDefaultWorkspace();

    const job = await prisma.auditJob.findFirst({
      where: { id: jobId, workspaceId: workspace.id },
    });

    if (!job) {
      return NextResponse.json({ error: "Audit job not found" }, { status: 404 });
    }

    // Cascade delete is configured in Prisma schema (AuditExecution, LighthouseResult, CrUXResult, AuditIssue, SEOResult)
    await prisma.auditJob.delete({
      where: { id: jobId },
    });

    return NextResponse.json({
      success: true,
      message: "Audit job and associated telemetry records deleted successfully",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}


