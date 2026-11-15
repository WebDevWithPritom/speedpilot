import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { trackSerpRank } from "@speedpilot/seo-engine";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateDefaultWorkspace } from "@/lib/db";

export const maxDuration = 45;
export const revalidate = 0;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const workspace = await getOrCreateDefaultWorkspace();
    const workspaceId = user?.workspaceId || workspace.id;

    const existing = await prisma.keywordRanking.findFirst({
      where: { id, project: { workspaceId } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Keyword not found." }, { status: 404 });
    }

    await prisma.keywordRanking.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Keyword deleted successfully." });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to delete keyword." },
      { status: 500 }
    );
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const workspace = await getOrCreateDefaultWorkspace();
    const workspaceId = user?.workspaceId || workspace.id;

    const keywordRecord = await prisma.keywordRanking.findFirst({
      where: { id, project: { workspaceId } },
      include: { project: true },
    });

    if (!keywordRecord) {
      return NextResponse.json({ success: false, error: "Keyword not found." }, { status: 404 });
    }

    const googleApiKey = process.env.GOOGLE_CSE_KEY || process.env.GOOGLE_PAGESPEED_API_KEY;
    const googleCx = process.env.GOOGLE_CSE_CX;

    const serpResult = await trackSerpRank({
      keyword: keywordRecord.keyword,
      targetDomain: keywordRecord.targetDomain,
      googleApiKey,
      googleCx,
    });

    const newRank = serpResult.targetRank ?? null;
    const previousRank = keywordRecord.currentRank;
    const topCompetitor = serpResult.competitors[0]?.domain ?? null;
    const topCompetitorUrl = serpResult.competitors[0]?.url ?? null;

    const currentHistory = Array.isArray(keywordRecord.history) ? (keywordRecord.history as any[]) : [];
    const updatedHistory = [
      ...currentHistory,
      {
        rank: newRank,
        topCompetitor,
        checkedAt: new Date().toISOString(),
      },
    ].slice(-20); // Keep last 20 snapshots

    const updated = await prisma.keywordRanking.update({
      where: { id },
      data: {
        previousRank,
        currentRank: newRank,
        intent: serpResult.intent,
        country: serpResult.country,
        targetUrl: serpResult.targetUrl,
        topCompetitor,
        topCompetitorUrl,
        history: updatedHistory,
        lastCheckedAt: new Date(),
      },
      include: {
        project: { select: { id: true, name: true, primaryDomain: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      serpDetails: serpResult,
    });
  } catch (err: unknown) {
    console.error("[KeywordRefresh POST] Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to refresh keyword." },
      { status: 500 }
    );
  }
}
