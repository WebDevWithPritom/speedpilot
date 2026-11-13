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

    const BATCH_SIZE = 15;

    // 1. Fetch existing queued executions
    let queuedExecutions = await prisma.auditExecution.findMany({
      where: {
        auditJobId: job.id,
        status: "QUEUED",
      },
      take: BATCH_SIZE,
      select: { id: true, url: true, device: true },
    });

    // 2. If no QUEUED executions remain, check for any uncompleted executions (FAILED, AUDITING, FETCHING)
    if (queuedExecutions.length === 0) {
      const incompleteCount = await prisma.auditExecution.count({
        where: {
          auditJobId: job.id,
          status: { not: "COMPLETED" },
        },
      });

      if (incompleteCount > 0) {
        // Recover all non-completed executions to QUEUED so batching continues
        await prisma.auditExecution.updateMany({
          where: {
            auditJobId: job.id,
            status: { not: "COMPLETED" },
          },
          data: {
            status: "QUEUED",
            errorMessage: null,
          },
        });

        // Now pick up the first batch from the newly re-queued executions
        queuedExecutions = await prisma.auditExecution.findMany({
          where: {
            auditJobId: job.id,
            status: "QUEUED",
          },
          take: BATCH_SIZE,
          select: { id: true, url: true, device: true },
        });
      }
    }

    // 3. If there are still 0 executions, then literally every execution in the job is COMPLETED
    if (queuedExecutions.length === 0) {
      const refreshedJob = await prisma.auditJob.findUnique({
        where: { id: job.id },
        select: { completedUrls: true, totalUrls: true },
      });

      await prisma.auditJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          failedUrls: 0,
        },
      });

      return NextResponse.json({
        data: {
          batchProcessed: 0,
          remainingQueued: 0,
          totalCompleted: refreshedJob?.completedUrls ?? job.totalUrls,
          totalUrls: refreshedJob?.totalUrls ?? job.totalUrls,
          isAllFinished: true,
          status: "COMPLETED",
          message: "All audit executions have completed.",
        },
      });
    }

    // Keep job in PROCESSING state and update startedAt
    await prisma.auditJob.update({
      where: { id: job.id },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

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

    // Refresh remaining incomplete count (anything not COMPLETED)
    const remainingIncomplete = await prisma.auditExecution.count({
      where: {
        auditJobId: job.id,
        status: { not: "COMPLETED" },
      },
    });

    const refreshedJob = await prisma.auditJob.findUnique({
      where: { id: job.id },
      select: { completedUrls: true, failedUrls: true, totalUrls: true, status: true },
    });

    if (remainingIncomplete === 0 && refreshedJob?.status !== "COMPLETED") {
      await prisma.auditJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    return NextResponse.json({
      data: {
        batchProcessed: queuedExecutions.length,
        remainingQueued: remainingIncomplete,
        totalCompleted: refreshedJob?.completedUrls ?? 0,
        totalUrls: refreshedJob?.totalUrls ?? 0,
        isAllFinished: remainingIncomplete === 0,
        status: remainingIncomplete === 0 ? "COMPLETED" : "PROCESSING",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
