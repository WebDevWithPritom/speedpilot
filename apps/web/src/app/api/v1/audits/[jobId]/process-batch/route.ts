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

    const BATCH_SIZE = 6;

    // 1. Fetch existing queued executions
    let queuedExecutions = await prisma.auditExecution.findMany({
      where: {
        auditJobId: job.id,
        status: "QUEUED",
      },
      take: BATCH_SIZE,
      select: { id: true, url: true, device: true },
    });

    // 2. If no QUEUED executions remain, check for any orphaned in-flight executions (AUDITING, FETCHING) from crashed serverless calls
    if (queuedExecutions.length === 0) {
      const stuckExecutions = await prisma.auditExecution.findMany({
        where: {
          auditJobId: job.id,
          status: { in: ["AUDITING", "FETCHING"] },
        },
        select: { id: true },
      });

      if (stuckExecutions.length > 0) {
        // Recover orphaned executions back to QUEUED
        await prisma.auditExecution.updateMany({
          where: {
            id: { in: stuckExecutions.map((e) => e.id) },
          },
          data: {
            status: "QUEUED",
            errorMessage: null,
          },
        });

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

    // 3. If there are still 0 executions, then every execution in the job is finished (COMPLETED or FAILED)
    if (queuedExecutions.length === 0) {
      const allExecutions = await prisma.auditExecution.findMany({
        where: { auditJobId: job.id },
        select: { status: true },
      });

      const completedCount = allExecutions.filter((e) => e.status === "COMPLETED").length;
      const failedCount = allExecutions.filter((e) => e.status === "FAILED").length;
      const finalStatus = failedCount > 0
        ? (completedCount > 0 ? "PARTIAL_FAILURE" : "FAILED")
        : "COMPLETED";

      await prisma.auditJob.update({
        where: { id: job.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          completedUrls: completedCount,
          failedUrls: failedCount,
        },
      });

      return NextResponse.json({
        data: {
          batchProcessed: 0,
          remainingQueued: 0,
          totalCompleted: completedCount,
          totalUrls: job.totalUrls,
          isAllFinished: true,
          status: finalStatus,
          message: failedCount > 0
            ? `Audit finished: ${completedCount} completed, ${failedCount} failed.`
            : "All audit executions have completed.",
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

    // Run batch with controlled concurrency (6 parallel workers for rapid micro-batches)
    const CONCURRENCY = 6;
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

    // Refresh remaining pending executions (queued, in-flight, or paused)
    const remainingPending = await prisma.auditExecution.count({
      where: {
        auditJobId: job.id,
        status: { in: ["QUEUED", "AUDITING", "FETCHING", "PAUSED"] },
      },
    });

    const refreshedJob = await prisma.auditJob.findUnique({
      where: { id: job.id },
      select: { completedUrls: true, failedUrls: true, totalUrls: true, status: true },
    });

    const isAllFinished = remainingPending === 0;
    let finalJobStatus = refreshedJob?.status ?? "PROCESSING";

    if (isAllFinished) {
      const failedCount = refreshedJob?.failedUrls ?? 0;
      const completedCount = refreshedJob?.completedUrls ?? 0;
      finalJobStatus = failedCount > 0 ? (completedCount > 0 ? "PARTIAL_FAILURE" : "FAILED") : "COMPLETED";

      await prisma.auditJob.update({
        where: { id: job.id },
        data: { status: finalJobStatus, completedAt: new Date() },
      });
    }

    return NextResponse.json({
      data: {
        batchProcessed: queuedExecutions.length,
        remainingQueued: remainingPending,
        totalCompleted: refreshedJob?.completedUrls ?? 0,
        totalUrls: refreshedJob?.totalUrls ?? 0,
        isAllFinished,
        status: isAllFinished ? finalJobStatus : "PROCESSING",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
