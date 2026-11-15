import { NextRequest, NextResponse } from "next/server";
import { runWebsiteDiff, GOOGLE_ALGORITHM_UPDATES } from "@speedpilot/seo-engine";

export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      updates: GOOGLE_ALGORITHM_UPDATES,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { url, targetQuery, posOld, posNew, dateOld, dateNew } = body;

    if (!url || typeof url !== "string" || !url.trim().startsWith("http")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid landing page URL (http/https)." },
        { status: 400 }
      );
    }

    const result = await runWebsiteDiff({
      url: url.trim(),
      targetQuery: targetQuery ? String(targetQuery).trim() : undefined,
      posOld: posOld ? Number(posOld) : undefined,
      posNew: posNew ? Number(posNew) : undefined,
      dateOld: dateOld ? String(dateOld).trim() : undefined,
      dateNew: dateNew ? String(dateNew).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to generate SEO diff diagnostics." },
      { status: 500 }
    );
  }
}
