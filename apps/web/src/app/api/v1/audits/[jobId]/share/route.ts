import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import crypto from "crypto";

export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const user = await getCurrentUser();
    const workspace = await getOrCreateDefaultWorkspace();
    const workspaceId = user?.workspaceId || workspace.id;

    const job = await prisma.auditJob.findFirst({
      where: { id: jobId, workspaceId },
      select: {
        id: true,
        isPublic: true,
        shareToken: true,
        clientName: true,
        sharePassword: true,
      },
    });

    if (!job) {
      return NextResponse.json({ success: false, error: "Audit not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        isPublic: job.isPublic,
        shareToken: job.shareToken,
        clientName: job.clientName,
        hasPassword: Boolean(job.sharePassword),
        shareUrl: job.shareToken ? `/share/audit/${job.shareToken}` : null,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to fetch share status" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const user = await getCurrentUser();
    const workspace = await getOrCreateDefaultWorkspace();
    const workspaceId = user?.workspaceId || workspace.id;

    const job = await prisma.auditJob.findFirst({
      where: { id: jobId, workspaceId },
    });

    if (!job) {
      return NextResponse.json({ success: false, error: "Audit not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { isPublic, clientName, sharePassword } = body;

    let shareToken = job.shareToken;
    if (isPublic && !shareToken) {
      // Generate clean 16-char URL-safe random token
      shareToken = crypto.randomBytes(12).toString("base64url");
    }

    const updated = await prisma.auditJob.update({
      where: { id: jobId },
      data: {
        isPublic: Boolean(isPublic),
        shareToken: isPublic ? shareToken : null,
        clientName: clientName !== undefined ? clientName?.trim() : job.clientName,
        sharePassword: sharePassword !== undefined ? (sharePassword?.trim() || null) : job.sharePassword,
      },
      select: {
        id: true,
        isPublic: true,
        shareToken: true,
        clientName: true,
        sharePassword: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isPublic: updated.isPublic,
        shareToken: updated.shareToken,
        clientName: updated.clientName,
        hasPassword: Boolean(updated.sharePassword),
        shareUrl: updated.shareToken ? `/share/audit/${updated.shareToken}` : null,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to update share settings" },
      { status: 500 }
    );
  }
}
