import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { executeAuditAsync, CustomAuditKeys } from "@/lib/audit-runner";

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const workspace = await getOrCreateDefaultWorkspace();

    const job = await prisma.auditJob.findFirst({
      where: { id: jobId, workspaceId: workspace.id },
      include: {
        executions: {
          select: { id: true, url: true, device: true, status: true, errorMessage: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Audit job not found" }, { status: 404 });
    }

    // Auto-recover any executions that were paused/timed-out by serverless host limits
    const timedOutCount = await prisma.auditExecution.count({
      where: {
        auditJobId: job.id,
        status: "FAILED",
        OR: [
          { errorMessage: { contains: "Timed out" } },
          { errorMessage: { contains: "serverless" } },
          { errorMessage: { contains: "Paused" } },
          { errorMessage: null },
        ],
      },
    });

    if (timedOutCount > 0) {
      await prisma.auditExecution.updateMany({
        where: {
          auditJobId: job.id,
          status: "FAILED",
          OR: [
            { errorMessage: { contains: "Timed out" } },
            { errorMessage: { contains: "serverless" } },
            { errorMessage: { contains: "Paused" } },
            { errorMessage: null },
          ],
        },
        data: {
          status: "QUEUED",
          errorMessage: null,
        },
      });

      const newFailedCount = Math.max(0, job.failedUrls - timedOutCount);
      await prisma.auditJob.update({
        where: { id: job.id },
        data: {
          status: "PROCESSING",
          startedAt: new Date(),
          failedUrls: newFailedCount,
        },
      });
    } else {
      await prisma.auditJob.update({
        where: { id: job.id },
        data: {
          status: "PROCESSING",
          startedAt: new Date(),
        },
      });
    }

    // Fetch the next batch of queued executions (batch size 15)
    const BATCH_SIZE = 15;
    const queuedExecutions = await prisma.auditExecution.findMany({
      where: {
        auditJobId: job.id,
        status: "QUEUED",
      },
      take: BATCH_SIZE,
      select: { id: true, url: true, device: true },
    });

    if (queuedExecutions.length === 0) {
      const allExecutions = await prisma.auditExecution.findMany({
        where: { auditJobId: job.id },
        select: { status: true },
      });

      const allDone = allExecutions.every((e) => e.status === "COMPLETED" || e.status === "FAILED");
      const anyCompleted = allExecutions.some((e) => e.status === "COMPLETED");
      const finalStatus = allExecutions.every((e) => e.status === "COMPLETED")
        ? "COMPLETED"
        : anyCompleted
        ? "PARTIAL_FAILURE"
        : "FAILED";

      if (allDone && job.status !== finalStatus) {
        await prisma.auditJob.update({
          where: { id: job.id },
          data: { status: finalStatus, completedAt: new Date() },
        });
      }

      return NextResponse.json({
        data: {
          batchProcessed: 0,
          remainingQueued: 0,
          totalCompleted: job.completedUrls,
          totalUrls: job.totalUrls,
          isAllFinished: true,
          status: allDone ? finalStatus : job.status,
          message: "All audit executions have completed.",
        },
      });
    }

    const customKeys: CustomAuditKeys = {
      googleKey: req.headers.get("x-custom-google-key") || undefined,
      aiKey: req.headers.get("x-custom-ai-key") || undefined,
      aiProvider: req.headers.get("x-custom-ai-provider") || undefined,
      aiModel: req.headers.get("x-custom-ai-model") || undefined,
      aiBaseUrl: req.headers.get("x-custom-ai-base-url") || undefined,
    };

    // Run batch with controlled concurrency (5 workers)
    const CONCURRENCY = 5;
    const targetJobId = jobId;
    let index = 0;
    async function worker() {
      while (index < queuedExecutions.length) {
        const item = queuedExecutions[index++];
        if (!item) break;
        try {
          await executeAuditAsync(
            item.id,
            targetJobId,
            item.url,
            item.device as "MOBILE" | "DESKTOP",
            customKeys
          );
        } catch (err) {
          console.error(`Batch worker error for ${item.url}:`, err);
        }
      }
    }

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, queuedExecutions.length) },
      () => worker()
    );
    await Promise.all(workers);

    // Refresh remaining queued count
    const totalRemainingQueued = await prisma.auditExecution.count({
      where: {
        auditJobId: job.id,
        status: "QUEUED",
      },
    });

    const refreshedJob = await prisma.auditJob.findUnique({
      where: { id: job.id },
      select: { completedUrls: true, failedUrls: true, totalUrls: true, status: true },
    });

    return NextResponse.json({
      data: {
        batchProcessed: queuedExecutions.length,
        remainingQueued: totalRemainingQueued,
        totalCompleted: refreshedJob?.completedUrls ?? 0,
        totalUrls: refreshedJob?.totalUrls ?? 0,
        isAllFinished: totalRemainingQueued === 0,
        status: refreshedJob?.status ?? "PROCESSING",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
