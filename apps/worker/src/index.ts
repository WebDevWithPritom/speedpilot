import { Worker } from "bullmq";
import { AUDIT_QUEUE_NAME, createRedisConnection, AuditJobPayload } from "./queue.js";
import { processAuditJob } from "./processor.js";

const redis = createRedisConnection();

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

// Graceful shutdown handling
const shutdown = async () => {
  console.log("\n[Worker] Gracefully closing worker connections...");
  await worker.close();
  await redis.quit();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

