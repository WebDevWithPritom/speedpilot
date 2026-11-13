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
    const project = await prisma.project.findFirst({
      where: { id, workspaceId: workspace.id },
      include: {
        urls: {
          take: 100,
          orderBy: { createdAt: "desc" },
        },
        auditJobs: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            executions: {
              take: 5,
              include: {
                lighthouse: true,
                crux: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspace = await getOrCreateDefaultWorkspace();
    const deleted = await prisma.project.deleteMany({
      where: { id, workspaceId: workspace.id },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete project" },
      { status: 500 }
    );
  }
}

