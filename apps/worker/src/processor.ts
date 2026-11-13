import { Job } from "bullmq";
import { prisma } from "@speedpilot/database";
import { TechStack } from "@speedpilot/shared";
import { PageSpeedClient } from "@speedpilot/pagespeed";
import { crawlAndInspectSEO } from "@speedpilot/seo-engine";
import { generateAIFixRecommendation } from "@speedpilot/ai-engine";
import { AuditJobPayload } from "./queue.js";

const psiClient = new PageSpeedClient();

export async function processAuditJob(job: Job<AuditJobPayload>): Promise<void> {
  const { executionId, jobId, url, device } = job.data;
  const startTime = Date.now();

  try {
    // 1. Mark execution as AUDITING
    await prisma.auditExecution.update({
      where: { id: executionId },
      data: { status: "AUDITING" },
    });

    // 2. Run Google PageSpeed Insights & CrUX
    const psiResult = await psiClient.runAudit(url, device);

    // 3. Run Static Technical SEO crawl
    let seoInspection = null;
    let detectedStack: TechStack = "UNKNOWN";
    try {
      const crawlResult = await crawlAndInspectSEO(url);
      seoInspection = crawlResult.inspection;
      detectedStack = crawlResult.techDetection.detectedStack;
    } catch {
      // SEO crawl might fail on strict firewalls, but PSI may have succeeded
    }

    // 4. Update status to ANALYZING_AI
    await prisma.auditExecution.update({
      where: { id: executionId },
      data: { status: "ANALYZING_AI" },
    });

    // 5. Persist Lighthouse Lab Results
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

    // 6. Persist CrUX Field Results
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

    // 7. Persist Technical SEO Results (if crawl succeeded)
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

    // 8. Persist Issues and AI Recommendations (Lighthouse diagnostics + Live Technical SEO crawler findings)
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

      // Generate AI Fix for High and Critical issues
      if (issue.severity === "HIGH" || issue.severity === "CRITICAL") {
        try {
          const aiResult = await generateAIFixRecommendation({
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
              detectedStack: aiResult.recommendation.detectedStack,
              explanationMarketer: aiResult.recommendation.explanationMarketer,
              explanationDeveloper: aiResult.recommendation.explanationDeveloper,
              explanationAgency: aiResult.recommendation.explanationAgency,
              explanationSaaSTeam: aiResult.recommendation.explanationSaaSTeam,
              remediationCodeSnippet: aiResult.recommendation.remediationCodeSnippet,
              implementationSteps: aiResult.recommendation.implementationSteps,
              verificationSteps: aiResult.recommendation.verificationSteps,
              estimatedDifficulty: aiResult.recommendation.estimatedDifficulty,
              estimatedImpact: aiResult.recommendation.estimatedImpact,
              promptTokens: aiResult.promptTokens || 0,
              completionTokens: aiResult.completionTokens || 0,
              signatureHash: aiResult.signature,
            },
          });
        } catch {
          // Continue if AI fix generation fails
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    // 9. Mark execution as COMPLETED
    await prisma.auditExecution.update({
      where: { id: executionId },
      data: {
        status: "COMPLETED",
        executionTimeMs,
        completedAt: new Date(),
      },
    });

    // 10. Increment completed count in parent AuditJob
    const updatedJob = await prisma.auditJob.update({
      where: { id: jobId },
      data: {
        completedUrls: { increment: 1 },
      },
      include: {
        executions: { select: { status: true } },
      },
    });

    // Check if entire batch job is done
    const allFinished = updatedJob.executions.every(
      (e) => e.status === "COMPLETED" || e.status === "FAILED" || e.status === "CANCELLED"
    );

    if (allFinished) {
      const anyFailed = updatedJob.executions.some((e) => e.status === "FAILED");
      await prisma.auditJob.update({
        where: { id: jobId },
        data: {
          status: anyFailed ? "PARTIAL_FAILURE" : "COMPLETED",
          completedAt: new Date(),
        },
      });
    }
  } catch (error: unknown) {
    const errMessage = (error as Error).message || "Unknown audit processing error";

    // Mark execution as FAILED (Never mark failed audit as successful)
    await prisma.auditExecution.update({
      where: { id: executionId },
      data: {
        status: "FAILED",
        errorMessage: errMessage,
        completedAt: new Date(),
      },
    });

    // Increment failedUrls in parent AuditJob
    const updatedJob = await prisma.auditJob.update({
      where: { id: jobId },
      data: {
        failedUrls: { increment: 1 },
      },
      include: {
        executions: { select: { status: true } },
      },
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

    throw error;
  }
}
