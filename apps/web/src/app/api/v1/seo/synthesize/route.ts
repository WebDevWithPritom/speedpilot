import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { url, pageTitle, metaDescription, h1Text, topKeywords } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: "Target URL is required." }, { status: 400 });
    }

    let parsedHostname = "example.com";
    try {
      parsedHostname = new URL(url).hostname.replace(/^www\./, "");
    } catch {}

    const primaryBrand = parsedHostname.split(".")[0] || "Platform";
    const brandCapitalized = primaryBrand.charAt(0).toUpperCase() + primaryBrand.slice(1);

    const leadKeywords = Array.isArray(topKeywords) && topKeywords.length > 0
      ? topKeywords.slice(0, 3).map((k: any) => k.word || String(k))
      : ["performance", "intelligence", "solutions"];

    const kw1 = leadKeywords[0] ? leadKeywords[0].charAt(0).toUpperCase() + leadKeywords[0].slice(1) : "Solutions";
    const kw2 = leadKeywords[1] ? leadKeywords[1].charAt(0).toUpperCase() + leadKeywords[1].slice(1) : "Platform";

    // 1. Synthesize high-CTR Title (< 60 chars / < 580px in Google Arial)
    let recommendedTitle = `${brandCapitalized} — High Performance ${kw1} & ${kw2}`;
    if (recommendedTitle.length > 58) {
      recommendedTitle = `${brandCapitalized} — ${kw1} & ${kw2} Platform`;
    }

    // 2. Synthesize High-CTR Meta Description (135 - 155 chars)
    let recommendedDescription = `Discover ${brandCapitalized}: the next-generation ${kw1.toLowerCase()} platform. Optimize operations, streamline workflows, and scale results today.`;
    if (recommendedDescription.length > 155) {
      recommendedDescription = recommendedDescription.slice(0, 152) + "...";
    }

    // 3. Synthesize Valid JSON-LD Schema
    const schemaObj = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": recommendedTitle,
      "description": recommendedDescription,
      "url": url,
      "publisher": {
        "@type": "Organization",
        "name": brandCapitalized,
        "url": `https://${parsedHostname}`
      }
    };

    const jsonLdSchema = JSON.stringify(schemaObj, null, 2);

    const htmlCodeSnippet = `<!-- Recommended Technical SEO Optimization Head Tags -->
<title>${recommendedTitle}</title>
<meta name="description" content="${recommendedDescription}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow">

<!-- OpenGraph Social Cards -->
<meta property="og:title" content="${recommendedTitle}">
<meta property="og:description" content="${recommendedDescription}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">

<!-- Structured Data (JSON-LD) -->
<script type="application/ld+json">
${jsonLdSchema}
</script>`;

    return NextResponse.json({
      success: true,
      patch: {
        recommendedTitle,
        recommendedDescription,
        jsonLdSchema,
        htmlCodeSnippet,
        explanation: `Targeted primary search topics (${leadKeywords.join(", ")}) while calibrating title to ~${Math.round(recommendedTitle.length * 9.5)}px to prevent Google SERP clipping, and added valid Organization Schema.org structured data.`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate SEO fix." },
      { status: 500 }
    );
  }
}

