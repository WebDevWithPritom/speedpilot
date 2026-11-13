import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { generateAIFixRecommendation, resolveCodeContext, AIProvider } from "@speedpilot/ai-engine";
import { crawlAndInspectSEO } from "@speedpilot/seo-engine";
import { TechStack } from "@speedpilot/shared";
import { getOrCreateDefaultWorkspace } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const { issueId } = await params;
    const body = await req.json().catch(() => ({}));
    const workspace = await getOrCreateDefaultWorkspace();

    const issue = await prisma.auditIssue.findFirst({
      where: { id: issueId, auditExecution: { auditJob: { workspaceId: workspace.id } } },
      include: {
        auditExecution: {
          include: {
            auditJob: {
              include: { project: true },
            },
          },
        },
        recommendations: { take: 1, select: { detectedStack: true } },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Audit issue not found" }, { status: 404 });
    }

    const [crawlResult, codeContext] = await Promise.all([
      crawlAndInspectSEO(issue.auditExecution.url).catch(() => null),
      resolveCodeContext({
        pastedCode: typeof body.pastedCode === "string" ? body.pastedCode : undefined,
        filename: typeof body.sourceFilename === "string" ? body.sourceFilename : undefined,
        githubUrl: typeof body.githubUrl === "string" ? body.githubUrl : undefined,
      }),
    ]);

    const rawRecStack = issue.recommendations?.[0]?.detectedStack;
    const projectStack = issue.auditExecution.auditJob?.project?.techStack;
    const detectedStack = (
      crawlResult?.techDetection?.detectedStack && crawlResult.techDetection.detectedStack !== "UNKNOWN"
        ? crawlResult.techDetection.detectedStack
        : rawRecStack && rawRecStack !== "UNKNOWN"
          ? rawRecStack
          : projectStack || "UNKNOWN"
    ) as TechStack;
    const evidenceItems = Array.isArray(issue.evidenceDetails) ? (issue.evidenceDetails as any[]) : [];

    const ai = await generateAIFixRecommendation({
      targetUrl: issue.auditExecution.url,
      techStack: detectedStack,
      subStacks: crawlResult?.techDetection?.subStacks,
      existingHints: crawlResult?.techDetection?.existingHints,
      responseHeaders: crawlResult?.techDetection?.responseHeaders,
      sourceCode: codeContext.sourceCode,
      sourceFilename: codeContext.sourceFilename,
      issue: {
        code: issue.code,
        title: issue.title,
        category: issue.category as any,
        severity: issue.severity as any,
        displayValue: issue.displayValue || undefined,
        score: 0.5,
        evidenceItems,
      },
      provider: (body.provider as AIProvider) || "AUTO",
      apiKey: body.apiKey,
      model: body.model,
      baseUrl: body.baseUrl,
    });

    await prisma.aIRecommendation.deleteMany({
      where: { auditIssueId: issue.id },
    });

    const saved = await prisma.aIRecommendation.create({
      data: {
        auditIssueId: issue.id,
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

    return NextResponse.json({
      success: true,
      source: ai.source,
      codeOrigin: codeContext.sourceOrigin,
      codeFilename: codeContext.sourceFilename,
      detectedSubStacks: crawlResult?.techDetection?.subStacks || [],
      data: saved,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to synthesize AI recommendation" },
      { status: 500 }
    );
  }
}
