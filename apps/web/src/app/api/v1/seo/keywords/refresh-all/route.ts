import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { trackSerpRank } from "@speedpilot/seo-engine";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateDefaultWorkspace } from "@/lib/db";

export const maxDuration = 60;
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const workspace = await getOrCreateDefaultWorkspace();
    const workspaceId = user?.workspaceId || workspace.id;

    const body = await req.json().catch(() => ({}));
    const { projectId } = body;

    const where: any = {
      project: { workspaceId },
    };

    if (projectId && projectId !== "all") {
      where.projectId = projectId;
    }

    const keywords = await prisma.keywordRanking.findMany({
      where,
      take: 12, // Safely within serverless 60s limit for live network SERP queries
      orderBy: { lastCheckedAt: "asc" },
    });

    const googleApiKey = process.env.GOOGLE_CSE_KEY || process.env.GOOGLE_PAGESPEED_API_KEY;
    const googleCx = process.env.GOOGLE_CSE_CX;

    let refreshedCount = 0;

    for (const kw of keywords) {
      try {
        const serpResult = await trackSerpRank({
          keyword: kw.keyword,
          targetDomain: kw.targetDomain,
          googleApiKey,
          googleCx,
        });

        const newRank = serpResult.targetRank ?? null;
        const previousRank = kw.currentRank;
        const topCompetitor = serpResult.competitors[0]?.domain ?? null;
        const topCompetitorUrl = serpResult.competitors[0]?.url ?? null;

        const currentHistory = Array.isArray(kw.history) ? (kw.history as any[]) : [];
        const updatedHistory = [
          ...currentHistory,
          {
            rank: newRank,
            topCompetitor,
            checkedAt: new Date().toISOString(),
          },
        ].slice(-20);

        await prisma.keywordRanking.update({
          where: { id: kw.id },
          data: {
            previousRank,
            currentRank: newRank,
            targetUrl: serpResult.targetUrl,
            topCompetitor,
            topCompetitorUrl,
            history: updatedHistory,
            lastCheckedAt: new Date(),
          },
        });

        refreshedCount++;
        // Polite delay between outbound search queries
        await new Promise((r) => setTimeout(r, 600));
      } catch (e) {
        console.warn(`[RefreshAll] Failed for ${kw.keyword}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      refreshedCount,
      totalCount: keywords.length,
    });
  } catch (err: unknown) {
    console.error("[RefreshAll POST] Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to refresh keywords." },
      { status: 500 }
    );
  }
}
