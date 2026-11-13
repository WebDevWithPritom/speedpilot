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

