import { NextRequest, NextResponse } from "next/server";
import { executeDeepSearch, DeepSearchRequest } from "@speedpilot/ai-engine";

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
