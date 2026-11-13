import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@speedpilot/database";

export const maxDuration = 60;
import { TriggerAuditSchema, validateAndNormalizeUrl, TechStack } from "@speedpilot/shared";
import { PageSpeedClient } from "@speedpilot/pagespeed";
import { crawlAndInspectSEO } from "@speedpilot/seo-engine";
import { generateAIFixRecommendation, computeIssueSignature } from "@speedpilot/ai-engine";
import { getOrCreateDefaultWorkspace } from "@/lib/db";

const psiClient = new PageSpeedClient();

// In-process runner function that processes an execution without blocking HTTP response
async function executeAuditAsync(
  executionId: string,
  jobId: string,
  url: string,
  device: "MOBILE" | "DESKTOP",
  customKeys?: {
    googleKey?: string;
    aiKey?: string;
    aiProvider?: string;
    aiModel?: string;
    aiBaseUrl?: string;
  }
) {
  const startTime = Date.now();
  try {
    await prisma.auditExecution.update({
      where: { id: executionId },
      data: { status: "AUDITING" },
    });

    const activeClient = customKeys?.googleKey
      ? new PageSpeedClient({ apiKey: customKeys.googleKey })
      : psiClient;

    // Run PSI Audit and Technical SEO Crawl concurrently for maximum speed
    const [psiResult, crawlResult] = await Promise.all([
      activeClient.runAudit(url, device),
      crawlAndInspectSEO(url).catch(() => null),
    ]);

    const seoInspection = crawlResult?.inspection ?? null;
    const detectedStack: TechStack = crawlResult?.techDetection?.detectedStack ?? "UNKNOWN";

    await prisma.auditExecution.update({
      where: { id: executionId },
      data: { status: "ANALYZING_AI" },
    });

    // 1. Persist Lighthouse Lab Result
    await prisma.lighthouseResult.create({
      data: {
        auditExecutionId: executionId,
        performanceScore: psiResult.scores.performance,
        accessibilityScore: psiResult.scores.accessibility,
        bestPracticesScore: psiResult.scores.bestPractices,
        seoScore: psiResult.scores.seo,
        agenticScore: psiResult.scores.agenticBrowsing ?? null,
        agenticRatio: psiResult.scores.agenticRatio ?? null,
        fcpMs: psiResult.labMetrics.fcpMs,
        lcpMs: psiResult.labMetrics.lcpMs,
        tbtMs: psiResult.labMetrics.tbtMs,
        cls: psiResult.labMetrics.cls,
        speedIndexMs: psiResult.labMetrics.speedIndexMs,
      },
    });

    // 2. Persist CrUX Field Result
    await prisma.crUXResult.create({
      data: {
        auditExecutionId: executionId,
        scope: psiResult.cruxFieldData.scope,
        lcpValueMs: psiResult.cruxFieldData.lcpValueMs,
        lcpCategory: psiResult.cruxFieldData.lcpCategory,
        inpValueMs: psiResult.cruxFieldData.inpValueMs,
        inpCategory: psiResult.cruxFieldData.inpCategory,
        clsValue: psiResult.cruxFieldData.clsValue,
        clsCategory: psiResult.cruxFieldData.clsCategory,
        collectionPeriod: psiResult.cruxFieldData.collectionPeriod,
      },
    });

    // 3. Persist SEO Result
    if (seoInspection) {
      const d = seoInspection.seoData;
      await prisma.sEOResult.create({
        data: {
          auditExecutionId: executionId,
          httpStatus: d.httpStatus,
          isHttps: d.isHttps,
          pageTitle: d.pageTitle,
          titleLength: d.titleLength,
          metaDescription: d.metaDescription,
          descriptionLength: d.descriptionLength,
          canonicalUrl: d.canonicalUrl,
          isCanonicalMatch: d.isCanonicalMatch,
          robotsDirectives: d.robotsDirectives,
          h1Count: d.h1Count,
          h1Text: d.h1Text,
          hasBrokenInternalLinks: d.hasBrokenInternalLinks,
          brokenLinksCount: d.brokenLinksCount,
          missingAltImagesCount: d.missingAltImagesCount,
          hasOpenGraph: d.hasOpenGraph,
          hasStructuredData: d.hasStructuredData,
        },
      });
    }

    // 4. Persist Issues & AI Recommendations (Lighthouse diagnostics + Live Technical SEO crawler findings)
    const allIssuesToPersist: Array<{
      code: string;
      title: string;
      category: "PERFORMANCE" | "ACCESSIBILITY" | "BEST_PRACTICES" | "SEO" | "TECHNICAL_SEO";
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      displayValue: string | undefined;
      evidenceDetails: any;
    }> = psiResult.issues.map((i) => ({
      code: i.code,
      title: i.title,
      category: i.category,
      severity: i.severity,
      displayValue: i.displayValue,
      evidenceDetails: i.evidenceItems,
    }));

    if (seoInspection && seoInspection.issues && seoInspection.issues.length > 0) {
      for (const seoIssue of seoInspection.issues) {
        allIssuesToPersist.push({
          code: seoIssue.code,
          title: seoIssue.title,
          category: "SEO",
          severity: seoIssue.severity,
          displayValue: seoIssue.displayValue,
          evidenceDetails: [{ url, explanation: seoIssue.evidence }],
        });
      }
    }

    // 4. Concurrently persist Issues & generate AI recommendations
    const createdIssues = await Promise.all(
      allIssuesToPersist.map((issue) =>
        prisma.auditIssue.create({
          data: {
            auditExecutionId: executionId,
            code: issue.code,
            title: issue.title,
            category: issue.category,
            severity: issue.severity,
            displayValue: issue.displayValue,
            evidenceDetails: issue.evidenceDetails,
          },
        })
      )
    );

    const sevRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const aiSynthTasks = createdIssues
      .map((created, i) => ({ created, raw: allIssuesToPersist[i] }))
      .filter((p) => Boolean(p.raw))
      .sort((a, b) => (sevRank[b.raw.severity] || 0) - (sevRank[a.raw.severity] || 0))
      .slice(0, 15);

    await Promise.allSettled(
      aiSynthTasks.map(async ({ created, raw }) => {
        try {
          const sig = computeIssueSignature(raw.code, detectedStack, raw.evidenceDetails?.[0]?.url);
          const cached = await prisma.aIRecommendation.findFirst({
            where: { signatureHash: sig },
          });

          if (cached) {
            await prisma.aIRecommendation.create({
              data: {
                auditIssueId: created.id,
                detectedStack: cached.detectedStack,
                explanationMarketer: cached.explanationMarketer,
                explanationDeveloper: cached.explanationDeveloper,
                explanationAgency: cached.explanationAgency,
                explanationSaaSTeam: cached.explanationSaaSTeam,
                remediationCodeSnippet: cached.remediationCodeSnippet,
                implementationSteps: cached.implementationSteps as any,
                verificationSteps: cached.verificationSteps as any,
                estimatedDifficulty: cached.estimatedDifficulty,
                estimatedImpact: cached.estimatedImpact,
                promptTokens: 0,
                completionTokens: 0,
                signatureHash: sig,
              },
            });
            return;
          }

          const ai = await generateAIFixRecommendation({
            targetUrl: url,
            techStack: detectedStack,
            subStacks: crawlResult?.techDetection?.subStacks,
            existingHints: crawlResult?.techDetection?.existingHints,
            responseHeaders: crawlResult?.techDetection?.responseHeaders,
            issue: {
              code: raw.code,
              title: raw.title,
              category: raw.category,
              severity: raw.severity,
              displayValue: raw.displayValue,
              score: 0.5,
              evidenceItems: raw.evidenceDetails,
            },
            apiKey: customKeys?.aiKey,
            provider: (customKeys?.aiProvider as any) || "AUTO",
            baseUrl: customKeys?.aiBaseUrl,
            model: customKeys?.aiModel,
          });

          await prisma.aIRecommendation.create({
            data: {
              auditIssueId: created.id,
              detectedStack: ai.recommendation.detectedStack,
              explanationMarketer: ai.recommendation.explanationMarketer,
              explanationDeveloper: ai.recommendation.explanationDeveloper,
              explanationAgency: ai.recommendation.explanationAgency,
              explanationSaaSTeam: ai.recommendation.explanationSaaSTeam,
              remediationCodeSnippet: ai.recommendation.remediationCodeSnippet,
              implementationSteps: ai.recommendation.implementationSteps,
              verificationSteps: ai.recommendation.verificationSteps,
              estimatedDifficulty: ai.recommendation.estimatedDifficulty,
              estimatedImpact: ai.recommendation.estimatedImpact,
              promptTokens: ai.promptTokens || 0,
              completionTokens: ai.completionTokens || 0,
              signatureHash: ai.signature,
            },
          });
        } catch {
          // Continue
        }
      })
    );

    const executionTimeMs = Date.now() - startTime;

    await prisma.auditExecution.update({
      where: { id: executionId },
      data: {
        status: "COMPLETED",
        executionTimeMs,
        completedAt: new Date(),
      },
    });

    const updatedJob = await prisma.auditJob.update({
      where: { id: jobId },
      data: { completedUrls: { increment: 1 } },
      include: { executions: { select: { status: true } } },
    });

    const allFinished = updatedJob.executions.every((e) => e.status === "COMPLETED" || e.status === "FAILED");
    if (allFinished) {
      await prisma.auditJob.update({
        where: { id: jobId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }
  } catch (error: unknown) {
    await prisma.auditExecution.update({
      where: { id: executionId },
      data: {
        status: "FAILED",
        errorMessage: (error as Error).message || "Audit failed",
        completedAt: new Date(),
      },
    });

    const updatedJob = await prisma.auditJob.update({
      where: { id: jobId },
      data: { failedUrls: { increment: 1 } },
      include: { executions: { select: { status: true } } },
    });

    const allFinished = updatedJob.executions.every(
      (e) => e.status === "COMPLETED" || e.status === "FAILED" || e.status === "CANCELLED"
    );

    if (allFinished) {
      const anyCompleted = updatedJob.executions.some((e) => e.status === "COMPLETED");
      await prisma.auditJob.update({
        where: { id: jobId },
        data: {
          status: anyCompleted ? "PARTIAL_FAILURE" : "FAILED",
          completedAt: new Date(),
        },
      });
    }
  }
}

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

    const userTier = req.headers.get("x-user-tier") || "FREE";
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
