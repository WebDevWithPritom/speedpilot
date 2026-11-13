import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { generateAuditCSV, generateExecutiveHTMLReport, AuditReportData } from "@speedpilot/report-generator";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const format = (searchParams.get("format") || "HTML").toUpperCase();
    const companyName = searchParams.get("companyName") || "SpeedPilot Intelligence";

    if (!jobId) {
      return NextResponse.json({ error: "jobId query parameter is required" }, { status: 400 });
    }

    const job = await prisma.auditJob.findUnique({
      where: { id: jobId },
      include: {
        project: true,
        executions: {
          include: {
            lighthouse: true,
            crux: true,
            seo: true,
            issues: {
              include: {
                recommendations: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Audit job not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reportData: AuditReportData = {
      reportTitle: `${job.project.name} Performance Audit Report`,
      projectName: job.project.name,
      primaryDomain: job.project.primaryDomain,
      createdAt: job.createdAt,
      deviceMode: job.deviceMode,
      whiteLabel: {
        companyName,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      executions: job.executions.map((e: any) => ({
        id: e.id,
        url: e.url,
        device: e.device as "MOBILE" | "DESKTOP",
        status: e.status,
        executionTimeMs: e.executionTimeMs,
        scores: e.lighthouse
          ? {
              performance: e.lighthouse.performanceScore,
              accessibility: e.lighthouse.accessibilityScore,
              bestPractices: e.lighthouse.bestPracticesScore,
              seo: e.lighthouse.seoScore,
            }
          : null,
        labMetrics: e.lighthouse
          ? {
              fcpMs: e.lighthouse.fcpMs,
              lcpMs: e.lighthouse.lcpMs,
              tbtMs: e.lighthouse.tbtMs,
              cls: e.lighthouse.cls,
              speedIndexMs: e.lighthouse.speedIndexMs,
            }
          : null,
        crux: e.crux
          ? {
              scope: e.crux.scope as "URL" | "ORIGIN" | "UNAVAILABLE",
              lcpValueMs: e.crux.lcpValueMs,
              lcpCategory: e.crux.lcpCategory as "GOOD" | "NEEDS_IMPROVEMENT" | "POOR" | null,
              inpValueMs: e.crux.inpValueMs,
              inpCategory: e.crux.inpCategory as "GOOD" | "NEEDS_IMPROVEMENT" | "POOR" | null,
              clsValue: e.crux.clsValue,
              clsCategory: e.crux.clsCategory as "GOOD" | "NEEDS_IMPROVEMENT" | "POOR" | null,
              collectionPeriod: e.crux.collectionPeriod,
            }
          : null,
        seo: e.seo || null,
        issues: e.issues.map((i: any) => ({
          code: i.code,
          title: i.title,
          severity: i.severity,
          displayValue: i.displayValue,
          recommendation: i.recommendations?.[0]
            ? {
                detectedStack: i.recommendations[0].detectedStack as any,
                explanationMarketer: i.recommendations[0].explanationMarketer,
                explanationDeveloper: i.recommendations[0].explanationDeveloper,
                explanationAgency: i.recommendations[0].explanationAgency,
                explanationSaaSTeam: i.recommendations[0].explanationSaaSTeam,
                remediationCodeSnippet: i.recommendations[0].remediationCodeSnippet,
                implementationSteps: i.recommendations[0].implementationSteps,
                verificationSteps: i.recommendations[0].verificationSteps,
                estimatedDifficulty: i.recommendations[0].estimatedDifficulty as any,
                estimatedImpact: i.recommendations[0].estimatedImpact as any,
              }
            : undefined,
        })),
      })),
    };

    if (format === "CSV") {
      const csv = generateAuditCSV(reportData);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${job.project.primaryDomain}-audit.csv"`,
        },
      });
    }

    // Default HTML executive printable report
    const html = generateExecutiveHTMLReport(reportData);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

