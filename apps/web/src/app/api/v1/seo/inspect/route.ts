import { NextRequest, NextResponse } from "next/server";
import { safeFetch, SecurityError } from "@speedpilot/security";
import { inspectHtmlSEO } from "@speedpilot/seo-engine";
import { getCurrentUser } from "@/lib/auth";

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "A valid URL string is required." },
        { status: 400 }
      );
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    // SSRF-safe HTTP request with real browser headers
    const res = await safeFetch(targetUrl, {
      timeoutMs: 12_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SpeedPilot/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const html = await res.text();
    const isHttps = res.url.startsWith("https://");

    const inspection = inspectHtmlSEO(html, res.url, res.status, isHttps);

    return NextResponse.json({
      success: true,
      url: res.url,
      httpStatus: res.status,
      inspection,
    });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json(
        { success: false, error: `Security check rejected URL: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to inspect target URL." },
      { status: 500 }
    );
  }
}

