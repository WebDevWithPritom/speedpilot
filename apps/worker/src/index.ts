import { Worker } from "bullmq";
import { prisma } from "@speedpilot/database";
import { validateAndNormalizeUrl } from "@speedpilot/shared";
import { AUDIT_QUEUE_NAME, createRedisConnection, createAuditQueue, AuditJobPayload } from "./queue.js";
import { processAuditJob } from "./processor.js";

const redis = createRedisConnection();
const auditQueue = createAuditQueue(redis);

function computeNextRunAt(frequency: string, fromDate = new Date()): Date {
  const next = new Date(fromDate);
  if (frequency === "DAILY") next.setDate(next.getDate() + 1);
  else if (frequency === "MONTHLY") next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  return next;
}

async function tickDueSchedules() {
  const now = new Date();
  const dueSchedules = await prisma.schedule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: { project: true },
    take: 10,
  });

  for (const sched of dueSchedules) {
    try {
      const nextRunAt = computeNextRunAt(sched.frequency, now);
      // Atomically claim the schedule tick so multiple workers never double-enqueue
      const claimed = await prisma.schedule.updateMany({
        where: { id: sched.id, isActive: true, nextRunAt: sched.nextRunAt },
        data: { lastRunAt: now, nextRunAt },
      });
      if (claimed.count === 0) continue;

      const rawDomain = sched.project.primaryDomain.startsWith("http")
        ? sched.project.primaryDomain
        : `https://${sched.project.primaryDomain}`;
      const norm = validateAndNormalizeUrl(rawDomain);
      if (!norm.isValid || !norm.normalizedUrl) continue;

      const devices: Array<"MOBILE" | "DESKTOP"> =
        sched.deviceMode === "BOTH" ? ["MOBILE", "DESKTOP"] : [sched.deviceMode === "DESKTOP" ? "DESKTOP" : "MOBILE"];

      const job = await prisma.auditJob.create({
        data: {
          projectId: sched.projectId,
          workspaceId: sched.project.workspaceId,
          source: "SCHEDULED_CRON",
          deviceMode: sched.deviceMode,
          status: "PROCESSING",
          totalUrls: devices.length,
          startedAt: now,
        },
      });

      const projectUrl = await prisma.projectURL.upsert({
        where: { projectId_normalizedUrl: { projectId: sched.projectId, normalizedUrl: norm.normalizedUrl } },
        update: {},
        create: { projectId: sched.projectId, url: norm.normalizedUrl, normalizedUrl: norm.normalizedUrl },
      });

      for (const device of devices) {
        const exec = await prisma.auditExecution.create({
          data: { auditJobId: job.id, projectUrlId: projectUrl.id, url: norm.normalizedUrl, device, status: "QUEUED" },
        });
        await auditQueue.add(`sched-${exec.id}`, {
          executionId: exec.id,
          jobId: job.id,
          projectId: sched.projectId,
          url: norm.normalizedUrl,
          device,
        });
      }
      console.log(`[Scheduler] Enqueued scheduled audit job ${job.id} for ${norm.normalizedUrl}`);
    } catch (err: any) {
      console.error(`[Scheduler] Failed schedule ${sched.id}:`, err?.message || err);
    }
  }
}

console.log("⚡ Starting SpeedPilot Background Audit Worker...");

const worker = new Worker<AuditJobPayload>(
  AUDIT_QUEUE_NAME,
  async (job) => {
    console.log(`[Worker] Processing Job ${job.id} for URL: ${job.data.url} (${job.data.device})`);
    await processAuditJob(job);
    console.log(`[Worker] Finished Job ${job.id} successfully.`);
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 audits concurrently
    limiter: {
      max: 200,      // Max 200 requests
      duration: 60000, // Per 1 minute window (Google PSI quota safe buffer)
    },
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Audit execution completed: ${job.data.url}`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Audit execution failed for ${job?.data?.url}:`, err.message);
});

const scheduleTimer = setInterval(() => {
  tickDueSchedules().catch((err) => console.error("[Scheduler] Tick error:", err?.message || err));
}, 60_000);
tickDueSchedules().catch(() => {});

// Graceful shutdown handling
const shutdown = async () => {
  console.log("\n[Worker] Gracefully closing worker connections...");
  clearInterval(scheduleTimer);
  await auditQueue.close();
  await worker.close();
  await redis.quit();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

