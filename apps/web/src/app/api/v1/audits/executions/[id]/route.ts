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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspace = await getOrCreateDefaultWorkspace();

    const execution = await prisma.auditExecution.findFirst({
      where: { id, auditJob: { workspaceId: workspace.id } },
      select: { id: true, auditJobId: true },
    });

    if (!execution) {
      return NextResponse.json({ error: "Audit execution not found" }, { status: 404 });
    }

    await prisma.auditExecution.delete({
      where: { id },
    });

    // Update job counters in a single grouped query
    const statusGroups = await prisma.auditExecution.groupBy({
      by: ["status"],
      where: { auditJobId: execution.auditJobId },
      _count: { id: true },
    });

    let remaining = 0;
    let completed = 0;
    let failed = 0;

    for (const group of statusGroups) {
      remaining += group._count.id;
      if (group.status === "COMPLETED") completed = group._count.id;
      if (group.status === "FAILED") failed = group._count.id;
    }

    await prisma.auditJob.update({
      where: { id: execution.auditJobId },
      data: {
        totalUrls: remaining,
        completedUrls: completed,
        failedUrls: failed,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Audit execution deleted successfully",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}


