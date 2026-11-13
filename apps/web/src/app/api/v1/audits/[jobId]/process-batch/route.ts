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

    const body = await req.json().catch(() => ({}));
    const retryTimeouts = Boolean(body?.retryTimeouts);

    // If requested, reset timed-out executions back to QUEUED
    if (retryTimeouts) {
      const timedOutExecutions = job.executions.filter(
        (e) =>
          e.status === "FAILED" &&
          (e.errorMessage?.includes("Timed out") || e.errorMessage?.includes("serverless"))
      );

      if (timedOutExecutions.length > 0) {
        await prisma.auditExecution.updateMany({
          where: { id: { in: timedOutExecutions.map((e) => e.id) } },
          data: {
            status: "QUEUED",
            errorMessage: null,
          },
        });

        const newFailedCount = Math.max(0, job.failedUrls - timedOutExecutions.length);
        await prisma.auditJob.update({
          where: { id: job.id },
          data: {
            status: "PROCESSING",
            failedUrls: newFailedCount,
          },
        });

        timedOutExecutions.forEach((e) => {
          e.status = "QUEUED";
          e.errorMessage = null;
        });
      }
    }

    // Get up to 15 pending queued executions to run in this serverless batch
    const BATCH_SIZE = 15;
    const queuedExecutions = job.executions
      .filter((e) => e.status === "QUEUED")
      .slice(0, BATCH_SIZE);

    if (queuedExecutions.length === 0) {
      const allDone = job.executions.every((e) => e.status === "COMPLETED" || e.status === "FAILED");
      const finalStatus = job.executions.every((e) => e.status === "COMPLETED")
        ? "COMPLETED"
        : job.executions.some((e) => e.status === "COMPLETED")
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
          status: allDone ? finalStatus : job.status,
          message: "All executions have already completed or no queued executions remain.",
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
    let index = 0;
    async function worker() {
      while (index < queuedExecutions.length) {
        const item = queuedExecutions[index++];
        if (!item) break;
        try {
          await executeAuditAsync(
            item.id,
            jobId,
            item.url,
            item.device as "MOBILE" | "DESKTOP",
            customKeys
          );
        } catch (err) {
          console.error(`Batch worker error for ${item.url}:`, err);
        }
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, queuedExecutions.length) }, () => worker());
    await Promise.all(workers);

    // Refresh job status after this batch
    const updatedJob = await prisma.auditJob.findUnique({
      where: { id: job.id },
      include: {
        executions: { select: { status: true } },
      },
    });

    const totalRemainingQueued =
      updatedJob?.executions.filter((e) => e.status === "QUEUED").length || 0;

    return NextResponse.json({
      data: {
        batchProcessed: queuedExecutions.length,
        remainingQueued: totalRemainingQueued,
        completedUrls: updatedJob?.completedUrls ?? 0,
        failedUrls: updatedJob?.failedUrls ?? 0,
        totalUrls: updatedJob?.totalUrls ?? 0,
        status: updatedJob?.status ?? "PROCESSING",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
