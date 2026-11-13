import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { TriggerAuditSchema, validateAndNormalizeUrl, TechStack } from "@speedpilot/shared";
import { PageSpeedClient } from "@speedpilot/pagespeed";
import { crawlAndInspectSEO } from "@speedpilot/seo-engine";
import { generateAIFixRecommendation } from "@speedpilot/ai-engine";

const psiClient = new PageSpeedClient();

// In-process runner function that processes an execution without blocking HTTP response
async function executeAuditAsync(executionId: string, jobId: string, url: string, device: "MOBILE" | "DESKTOP") {
  const startTime = Date.now();
  try {
    await prisma.auditExecution.update({
      where: { id: executionId },
      data: { status: "AUDITING" },
    });

    const psiResult = await psiClient.runAudit(url, device);

    let seoInspection = null;
    let detectedStack: TechStack = "UNKNOWN";
    try {
      const crawlResult = await crawlAndInspectSEO(url);
      seoInspection = crawlResult.inspection;
      detectedStack = crawlResult.techDetection.detectedStack;
    } catch {
      // SEO crawl might encounter strict firewalls
    }

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

    for (const issue of allIssuesToPersist) {
      const createdIssue = await prisma.auditIssue.create({
        data: {
          auditExecutionId: executionId,
          code: issue.code,
          title: issue.title,
          category: issue.category,
          severity: issue.severity,
          displayValue: issue.displayValue,
          evidenceDetails: issue.evidenceDetails,
        },
      });

      if (issue.severity === "HIGH" || issue.severity === "CRITICAL") {
        try {
          const ai = await generateAIFixRecommendation({
            targetUrl: url,
            techStack: detectedStack,
            issue: {
              code: issue.code,
              title: issue.title,
              category: issue.category,
              severity: issue.severity,
              displayValue: issue.displayValue,
              score: 0.5,
              evidenceItems: issue.evidenceDetails,
            },
          });

          await prisma.aIRecommendation.create({
            data: {
              auditIssueId: createdIssue.id,
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
      }
    }

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
    const jobs = await prisma.auditJob.findMany({
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

    const project = await prisma.project.findUnique({
      where: { id: projectId },
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

    if (normalizedList.length === 0) {
      return NextResponse.json({ error: "No valid URLs provided" }, { status: 400 });
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

    // Trigger async processing in background using controlled concurrency queue
    // Google PageSpeed Insights performs best with 3-4 parallel browser sessions
    const CONCURRENCY_LIMIT = 3;
    (async () => {
      let taskIndex = 0;
      async function runWorker() {
        while (taskIndex < executionTasks.length) {
          const currentTask = executionTasks[taskIndex++];
          if (!currentTask) break;
          try {
            await executeAuditAsync(currentTask.executionId, auditJob.id, currentTask.url, currentTask.device);
          } catch (e) {
            console.error(`Audit error for ${currentTask.url}:`, e);
          }
          // Brief pacing delay between tasks
          await new Promise((r) => setTimeout(r, 250));
        }
      }

      const workers = Array.from(
        { length: Math.min(CONCURRENCY_LIMIT, executionTasks.length) },
        () => runWorker()
      );
      await Promise.all(workers);
    })().catch(console.error);

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
