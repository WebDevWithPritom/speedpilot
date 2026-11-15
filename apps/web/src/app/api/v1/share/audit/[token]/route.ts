import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, error: "Invalid share link" }, { status: 400 });
    }

    const job = await prisma.auditJob.findFirst({
      where: {
        shareToken: token,
        isPublic: true,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            primaryDomain: true,
            techStack: true,
          },
        },
        workspace: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        executions: {
          include: {
            lighthouse: true,
            crux: true,
            seo: true,
            _count: {
              select: { issues: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Audit report not found or link has been revoked." },
        { status: 404 }
      );
    }

    // Check optional password protection
    if (job.sharePassword) {
      const providedPassword =
        req.headers.get("x-share-password") ||
        new URL(req.url).searchParams.get("password");

      if (!providedPassword || providedPassword !== job.sharePassword) {
        return NextResponse.json(
          {
            success: false,
            requiresPassword: true,
            error: "This client audit is password protected. Please enter the passcode to access.",
          },
          { status: 403 }
        );
      }
    }

    const completedCount = job.executions.filter((e) => e.status === "COMPLETED").length;
    const failedCount = job.executions.filter((e) => e.status === "FAILED").length;
    const percentage = job.totalUrls > 0 ? Math.round((completedCount / job.totalUrls) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        clientName: job.clientName,
        status: job.status,
        deviceMode: job.deviceMode,
        project: job.project,
        agencyBranding: {
          name: job.workspace.name,
          logoUrl: job.workspace.logoUrl,
        },
        progress: {
          total: job.totalUrls,
          completed: completedCount,
          failed: failedCount,
          percentage,
        },
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        executions: job.executions,
      },
    });
  } catch (err: unknown) {
    console.error("[PublicShareAPI] Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to load shared audit." },
      { status: 500 }
    );
  }
}
