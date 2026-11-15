import { NextRequest, NextResponse } from "next/server";
import { executeDeepSearch, DeepSearchRequest, extractSearchKeyword } from "@speedpilot/ai-engine";
import { trackSerpRank } from "@speedpilot/seo-engine";
import { prisma } from "@speedpilot/database";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DeepSearchRequest;

    if (!body.targetUrl || !body.issue) {
      return NextResponse.json(
        { error: "targetUrl and issue payload are required for deep search" },
        { status: 400 }
      );
    }

    const result = await executeDeepSearch({
      targetUrl: body.targetUrl,
      techStack: body.techStack || "CUSTOM",
      issue: body.issue,
      persona: body.persona || "ALL",
      apiKey: body.apiKey,
      provider: body.provider,
      model: body.model,
      baseUrl: body.baseUrl,
    });

    if (result.marketer) {
      try {
        const u = new URL(body.targetUrl);
        const host = u.hostname.replace(/^www\./, "").toLowerCase();
        const ranking = await prisma.keywordRanking.findFirst({
          where: {
            OR: [
              { targetUrl: { equals: body.targetUrl } },
              { targetDomain: { equals: host } },
            ],
          },
          orderBy: { currentRank: "asc" },
        });

        if (ranking && ranking.currentRank) {
          result.marketer.currentSearchRank = ranking.currentRank;
          result.marketer.currentSearchKeyword = ranking.keyword;
          result.marketer.serpPositionStatus =
            ranking.currentRank === 1
              ? "Rank #1 on Google • Featured Position"
              : ranking.currentRank <= 3
              ? `Top 3 on Google (Rank #${ranking.currentRank})`
              : ranking.currentRank <= 10
              ? `Page 1 on Google (Rank #${ranking.currentRank})`
              : `Page 2+ on Google (Rank #${ranking.currentRank})`;
        } else {
          // Perform real-time live SERP verification
          const kw = result.marketer.currentSearchKeyword || extractSearchKeyword(body.targetUrl);
          const liveSerp = await trackSerpRank({
            keyword: kw,
            targetDomain: host,
          });

          if (liveSerp && liveSerp.targetRank) {
            result.marketer.currentSearchRank = liveSerp.targetRank;
            result.marketer.currentSearchKeyword = kw;
            result.marketer.serpPositionStatus =
              liveSerp.targetRank === 1
                ? "Rank #1 in Web Search • Top Result"
                : liveSerp.targetRank <= 3
                ? `Top 3 in Web Search (Rank #${liveSerp.targetRank})`
                : `Page 1 in Web Search (Rank #${liveSerp.targetRank})`;
          } else {
            result.marketer.currentSearchRank = null;
            result.marketer.currentSearchKeyword = kw;
            result.marketer.serpPositionStatus = "Unranked in Top 10 • Optimization Needed";
          }
        }
      } catch (serpErr) {
        console.warn("[DeepSearchAPI] Live SERP check error:", serpErr);
        result.marketer.currentSearchRank = null;
        result.marketer.serpPositionStatus = "Unranked in Top 10 • Optimization Needed";
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error during deep search" },
      { status: 500 }
    );
  }
}
