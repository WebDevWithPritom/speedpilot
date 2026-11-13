import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@speedpilot/database";

export const maxDuration = 60;
import { TriggerAuditSchema, validateAndNormalizeUrl } from "@speedpilot/shared";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { getWorkspaceTier } from "@/lib/subscription";
import { executeAuditAsync } from "@/lib/audit-runner";

export async function GET() {
  try {
    const workspace = await getOrCreateDefaultWorkspace();
    const jobs = await prisma.auditJob.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        project: { select: { name: true, primaryDomain: true } },
        executions: {
          select: {
            id: true,
            url: true,
            device: true,
            status: true,
            lighthouse: {
              select: { performanceScore: true, seoScore: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ data: jobs });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TriggerAuditSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const { projectId, deviceMode, urls } = parsed.data;
    const workspace = await getOrCreateDefaultWorkspace();

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: workspace.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Deduplicate and normalize URLs
    const normalizedList: string[] = [];
    const seen = new Set<string>();

    for (const raw of urls) {
      const res = validateAndNormalizeUrl(raw);
      if (res.isValid && res.normalizedUrl && !seen.has(res.normalizedUrl)) {
        seen.add(res.normalizedUrl);
        normalizedList.push(res.normalizedUrl);
      }
    }

    const dbTier = await getWorkspaceTier(workspace.id);
    const userTier = dbTier !== "FREE" ? dbTier : (req.headers.get("x-user-tier") || "FREE");
    const customGoogleKey = req.headers.get("x-custom-google-key") || undefined;
    const customAiKey = req.headers.get("x-custom-ai-key") || undefined;
    const customAiProvider = req.headers.get("x-custom-ai-provider") || undefined;
    const customAiModel = req.headers.get("x-custom-ai-model") || undefined;
    const customAiBaseUrl = req.headers.get("x-custom-ai-base-url") || undefined;

    if (normalizedList.length === 0) {
      return NextResponse.json({ error: "No valid URLs provided" }, { status: 400 });
    }

    // Tier enforcement:
    // If the server has a platform key configured or user provides their own, allow large bulk audits
    const hasPlatformKey = Boolean(process.env.GOOGLE_PAGESPEED_API_KEY);
    if (!hasPlatformKey && userTier === "FREE" && !customGoogleKey && normalizedList.length > 5) {
      return NextResponse.json(
        {
          error: "Free community tier without API keys is limited to 5 URLs per bulk audit. Add your own free Google PageSpeed API key in Settings or upgrade to Pro for unlimited bulk audits.",
          code: "TIER_LIMIT_REACHED",
          upgradeRequired: true,
          limit: 5,
          requested: normalizedList.length,
        },
        { status: 403 }
      );
    }

    const devicesToRun: Array<"MOBILE" | "DESKTOP"> =
      deviceMode === "BOTH" ? ["MOBILE", "DESKTOP"] : [deviceMode as "MOBILE" | "DESKTOP"];

    const totalExecutionsCount = normalizedList.length * devicesToRun.length;

    // Create AuditJob container
    const auditJob = await prisma.auditJob.create({
      data: {
        projectId: project.id,
        workspaceId: project.workspaceId,
        deviceMode,
        status: "PROCESSING",
        totalUrls: totalExecutionsCount,
        startedAt: new Date(),
      },
    });

    // Create ProjectURLs and AuditExecutions
    const executionTasks: Array<{ executionId: string; url: string; device: "MOBILE" | "DESKTOP" }> = [];

    for (const url of normalizedList) {
      const projectUrl = await prisma.projectURL.upsert({
        where: {
          projectId_normalizedUrl: {
            projectId: project.id,
            normalizedUrl: url,
          },
        },
        update: {},
        create: {
          projectId: project.id,
          url,
          normalizedUrl: url,
        },
      });

      for (const device of devicesToRun) {
        const execution = await prisma.auditExecution.create({
          data: {
            auditJobId: auditJob.id,
            projectUrlId: projectUrl.id,
            url,
            device,
            status: "QUEUED",
          },
        });

        executionTasks.push({
          executionId: execution.id,
          url,
          device,
        });
      }
    }

    // Trigger async processing in background using turbo parallel concurrency queue
    // Using Next.js after() ensures Vercel Serverless keeps the function alive after 202 response
    const CONCURRENCY_LIMIT = 8;
    after(async () => {
      try {
        let taskIndex = 0;
        async function runWorker() {
          while (taskIndex < executionTasks.length) {
            const currentTask = executionTasks[taskIndex++];
            if (!currentTask) break;
            try {
              await executeAuditAsync(
                currentTask.executionId,
                auditJob.id,
                currentTask.url,
                currentTask.device,
                {
                  googleKey: customGoogleKey,
                  aiKey: customAiKey,
                  aiProvider: customAiProvider,
                  aiModel: customAiModel,
                  aiBaseUrl: customAiBaseUrl,
                }
              );
            } catch (e) {
              console.error(`Audit error for ${currentTask.url}:`, e);
            }
            // Ultra-brief pacing delay (50ms) between tasks to maximize throughput
            await new Promise((r) => setTimeout(r, 50));
          }
        }

        const workers = Array.from(
          { length: Math.min(CONCURRENCY_LIMIT, executionTasks.length) },
          () => runWorker()
        );
        await Promise.all(workers);
      } catch (err) {
        console.error("Background audit runner error:", err);
      }
    });

    return NextResponse.json(
      {
        jobId: auditJob.id,
        status: "PROCESSING",
        totalExecutions: totalExecutionsCount,
        message: `Successfully initiated audit for ${normalizedList.length} URL(s) on ${devicesToRun.join(" & ")}.`,
      },
      { status: 202 }
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
