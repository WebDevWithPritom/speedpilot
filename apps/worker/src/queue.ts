import { Queue, QueueOptions } from "bullmq";
import { Redis } from "ioredis";

export const AUDIT_QUEUE_NAME = "audit-execution-queue";

export interface AuditJobPayload {
  executionId: string;
  jobId: string;
  projectId: string;
  url: string;
  device: "MOBILE" | "DESKTOP";
}

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export function createRedisConnection(): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 200, 3000),
  });
}

export function createAuditQueue(redis?: Redis): Queue<AuditJobPayload> {
  const connection = redis || createRedisConnection();
  const options: QueueOptions = {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: {
        age: 3600 * 24, // 24 hours
        count: 5000,
      },
      removeOnFail: {
        age: 3600 * 24 * 7, // 7 days
      },
    },
  };

  return new Queue(AUDIT_QUEUE_NAME, options);
}
