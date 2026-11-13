import { NextRequest, NextResponse } from "next/server";
import { trackSerpRank } from "@speedpilot/seo-engine";
import { SecurityError } from "@speedpilot/security";
import { getCurrentUser } from "@/lib/auth";

export const maxDuration = 30;
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { keyword, domain, country = "us" } = body;

    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid target search keyword." },
        { status: 400 }
      );
    }

    if (!domain || typeof domain !== "string" || !domain.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide your target website domain (e.g. mysite.com)." },
        { status: 400 }
      );
    }

    const googleApiKey = process.env.GOOGLE_CSE_KEY || process.env.GOOGLE_PAGESPEED_API_KEY;
    const googleCx = process.env.GOOGLE_CSE_CX;

    const result = await trackSerpRank({
      keyword: keyword.trim(),
      targetDomain: domain.trim(),
      country: String(country).toLowerCase(),
      googleApiKey,
      googleCx,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    if (err instanceof SecurityError) {
      return NextResponse.json(
        { success: false, error: `Security validation blocked request: ${err.message}` },
        { status: 400 }
      );
    }

    console.error("[SerpRankAPI] Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to execute SERP rank lookup." },
      { status: 500 }
    );
  }
}
