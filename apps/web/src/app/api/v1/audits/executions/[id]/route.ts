import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspace = await getOrCreateDefaultWorkspace();
    const execution = await prisma.auditExecution.findFirst({
      where: { id, auditJob: { workspaceId: workspace.id } },
      include: {
        auditJob: {
          select: {
            id: true,
            project: { select: { id: true, name: true, primaryDomain: true } },
          },
        },
        lighthouse: true,
        crux: true,
        seo: true,
        issues: {
          include: {
            recommendations: true,
          },
          orderBy: { severity: "desc" },
        },
      },
    });

    if (!execution) {
      return NextResponse.json({ error: "Audit execution not found" }, { status: 404 });
    }

    // Find sibling/companion execution for the other device on the same URL within the same job
    const companionDevice = execution.device === "MOBILE" ? "DESKTOP" : "MOBILE";
    const siblingExecution = await prisma.auditExecution.findFirst({
      where: {
        auditJobId: execution.auditJobId,
        url: execution.url,
        device: companionDevice,
      },
      select: {
        id: true,
        device: true,
        status: true,
        lighthouse: {
          select: {
            performanceScore: true,
            accessibilityScore: true,
            bestPracticesScore: true,
            seoScore: true,
            agenticScore: true,
            lcpMs: true,
            tbtMs: true,
            cls: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: {
        ...execution,
        siblingExecution,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

