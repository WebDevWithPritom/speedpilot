import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { trackSerpRank } from "@speedpilot/seo-engine";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateDefaultWorkspace } from "@/lib/db";

export const maxDuration = 45;
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const workspace = await getOrCreateDefaultWorkspace();
    const workspaceId = user?.workspaceId || workspace.id;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: any = {
      project: { workspaceId },
    };

    if (projectId && projectId !== "all") {
      where.projectId = projectId;
    }

    const keywords = await prisma.keywordRanking.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        project: {
          select: { id: true, name: true, primaryDomain: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: keywords,
    });
  } catch (err: unknown) {
    console.error("[KeywordsAPI GET] Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to load tracked keywords." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const workspace = await getOrCreateDefaultWorkspace();
    const workspaceId = user?.workspaceId || workspace.id;

    const body = await req.json().catch(() => ({}));
    const { keyword, projectId, domain } = body;

    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid keyword to track." },
        { status: 400 }
      );
    }

    // Resolve or fallback to project
    let targetProject = await prisma.project.findFirst({
      where: projectId && projectId !== "all" ? { id: projectId, workspaceId } : { workspaceId },
    });

    if (!targetProject) {
      targetProject = await prisma.project.create({
        data: {
          name: "Default Project",
          primaryDomain: domain || "mysite.com",
          workspaceId,
        },
      });
    }

    const cleanKeyword = keyword.trim();
    const targetDomain = domain?.trim() || targetProject.primaryDomain;

    // Run initial SERP search
    const googleApiKey = process.env.GOOGLE_CSE_KEY || process.env.GOOGLE_PAGESPEED_API_KEY;
    const googleCx = process.env.GOOGLE_CSE_CX;

    let serpResult;
    try {
      serpResult = await trackSerpRank({
        keyword: cleanKeyword,
        targetDomain,
        googleApiKey,
        googleCx,
      });
    } catch (e) {
      console.warn("[KeywordsAPI] Initial SERP lookup warning:", e);
    }

    const currentRank = serpResult?.targetRank ?? null;
    const targetUrl = serpResult?.targetUrl ?? null;
    const topCompetitor = serpResult?.competitors?.[0]?.domain ?? null;
    const topCompetitorUrl = serpResult?.competitors?.[0]?.url ?? null;

    const historyEntry = {
      rank: currentRank,
      topCompetitor,
      checkedAt: new Date().toISOString(),
    };

    const existingKeyword = await prisma.keywordRanking.findUnique({
      where: {
        projectId_keyword: {
          projectId: targetProject.id,
          keyword: cleanKeyword,
        },
      },
    });

    const previousRank = existingKeyword ? existingKeyword.currentRank : null;
    const existingHistory = Array.isArray(existingKeyword?.history)
      ? (existingKeyword.history as any[])
      : [];
    const updatedHistory = [...existingHistory, historyEntry].slice(-20);

    const savedKeyword = await prisma.keywordRanking.upsert({
      where: {
        projectId_keyword: {
          projectId: targetProject.id,
          keyword: cleanKeyword,
        },
      },
      create: {
        projectId: targetProject.id,
        keyword: cleanKeyword,
        targetDomain,
        currentRank,
        previousRank: null,
        intent: serpResult?.intent || null,
        country: serpResult?.country || "GLOBAL",
        targetUrl,
        topCompetitor,
        topCompetitorUrl,
        history: [historyEntry],
        lastCheckedAt: new Date(),
      },
      update: {
        targetDomain,
        previousRank,
        currentRank,
        intent: serpResult?.intent || null,
        country: serpResult?.country || "GLOBAL",
        targetUrl,
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
      data: savedKeyword,
      serpDetails: serpResult || null,
    });
  } catch (err: unknown) {
    console.error("[KeywordsAPI POST] Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to add tracked keyword." },
      { status: 500 }
    );
  }
}
