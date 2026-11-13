import { SEOResultData } from "@speedpilot/shared";

export interface ParsedSEOInspection {
  seoData: SEOResultData;
  issues: Array<{
    code: string;
    title: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    displayValue: string;
    evidence: string;
  }>;
}

/**
 * Parses raw HTML string and evaluates Technical SEO signals statically.
 */
export function inspectHtmlSEO(
  html: string,
  targetUrl: string,
  httpStatus = 200,
  isHttps = true
): ParsedSEOInspection {
  const issues: ParsedSEOInspection["issues"] = [];

  // 1. Extract Page Title (<title>...</title>)
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const rawTitle = titleMatch ? titleMatch[1]?.trim() : null;
  // Decode basic HTML entities
  const pageTitle = rawTitle ? rawTitle.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : null;
  const titleLength = pageTitle ? pageTitle.length : 0;

  if (!pageTitle) {
    issues.push({
      code: "missing-page-title",
      title: "Missing Document Title",
      severity: "CRITICAL",
      displayValue: "Page has no <title> element",
      evidence: "HTML does not contain a <title> tag in the document <head>.",
    });
  } else if (titleLength < 20) {
    issues.push({
      code: "short-page-title",
      title: "Title Tag Too Short",
      severity: "LOW",
      displayValue: `Title length is ${titleLength} chars (recommended: 30-60)`,
      evidence: `Title: "${pageTitle}"`,
    });
  } else if (titleLength > 65) {
    issues.push({
      code: "long-page-title",
      title: "Title Tag May Be Truncated in SERP",
      severity: "MEDIUM",
      displayValue: `Title length is ${titleLength} chars (recommended: max 60)`,
      evidence: `Title: "${pageTitle}"`,
    });
  }

  // 2. Extract Meta Description (<meta name="description" content="...">)
  const descMatch = /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html) ||
                    /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i.exec(html);
  const metaDescription = descMatch ? descMatch[1]?.trim() : null;
  const descriptionLength = metaDescription ? metaDescription.length : 0;

  if (!metaDescription) {
    issues.push({
      code: "missing-meta-description",
      title: "Missing Meta Description",
      severity: "HIGH",
      displayValue: "Page does not have a meta description",
      evidence: "No <meta name='description'> tag found in <head>.",
    });
  } else if (descriptionLength < 50) {
    issues.push({
      code: "short-meta-description",
      title: "Meta Description Too Short",
      severity: "LOW",
      displayValue: `Length is ${descriptionLength} chars (recommended: 120-160)`,
      evidence: `Description: "${metaDescription}"`,
    });
  } else if (descriptionLength > 165) {
    issues.push({
      code: "long-meta-description",
      title: "Meta Description May Truncate",
      severity: "LOW",
      displayValue: `Length is ${descriptionLength} chars (recommended: max 160)`,
      evidence: `Description: "${metaDescription.slice(0, 100)}..."`,
    });
  }

  // 3. Extract Canonical URL (<link rel="canonical" href="...">)
  const canonicalMatch = /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i.exec(html) ||
                         /<link\s+[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i.exec(html);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1]?.trim() : null;

  let isCanonicalMatch = true;
  if (!canonicalUrl) {
    issues.push({
      code: "missing-canonical",
      title: "Missing Canonical Link",
      severity: "MEDIUM",
      displayValue: "Page lacks a canonical link declaration",
      evidence: "No <link rel='canonical'> element found in <head>.",
    });
    isCanonicalMatch = false;
  } else {
    try {
      const parsedCanonical = new URL(canonicalUrl, targetUrl).toString();
      const parsedTarget = new URL(targetUrl).toString();
      isCanonicalMatch = parsedCanonical.toLowerCase() === parsedTarget.toLowerCase();
      if (!isCanonicalMatch) {
        issues.push({
          code: "mismatched-canonical",
          title: "Canonical URL Points to Different Destination",
          severity: "MEDIUM",
          displayValue: `Canonical points to: ${canonicalUrl}`,
          evidence: `Page target: ${targetUrl} vs Canonical: ${canonicalUrl}`,
        });
      }
    } catch {
      isCanonicalMatch = false;
    }
  }

  // 4. Extract Robots Meta (<meta name="robots" content="...">)
  const robotsMatch = /<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i.exec(html) ||
                      /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']robots["']/i.exec(html);
  const robotsDirectives = robotsMatch ? robotsMatch[1]?.trim().toLowerCase() : null;

  if (robotsDirectives && robotsDirectives.includes("noindex")) {
    issues.push({
      code: "page-noindex",
      title: "Page Blocked from Indexing ('noindex' detected)",
      severity: "HIGH",
      displayValue: `Robots directive contains 'noindex'`,
      evidence: `Meta robots content: "${robotsDirectives}"`,
    });
  }

  // 5. Extract Headings (H1)
  const h1Matches = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi));
  const h1Count = h1Matches.length;
  let h1Text: string | null = null;

  if (h1Count === 0) {
    issues.push({
      code: "missing-h1",
      title: "Missing Primary Heading (H1)",
      severity: "HIGH",
      displayValue: "Page has 0 <h1> elements",
      evidence: "No <h1> tag was found in the document structure.",
    });
  } else {
    // Strip nested tags from first H1 text
    h1Text = (h1Matches[0]?.[1] || "").replace(/<[^>]*>/g, "").trim();
    if (h1Count > 1) {
      issues.push({
        code: "multiple-h1",
        title: "Multiple H1 Headings Detected",
        severity: "MEDIUM",
        displayValue: `Page contains ${h1Count} <h1> elements (single H1 recommended)`,
        evidence: `Found ${h1Count} separate <h1> instances.`,
      });
    }
  }

  // 6. Extract Images and Alt Attributes
  const imgMatches = Array.from(html.matchAll(/<img\s+([^>]*?)>/gi));
  let missingAltImagesCount = 0;

  for (const match of imgMatches) {
    const attrs = match[1] || "";
    const altMatch = /alt=["']([^"']*)["']/i.exec(attrs);
    if (!altMatch || altMatch[1]?.trim() === "") {
      missingAltImagesCount++;
    }
  }

  if (missingAltImagesCount > 0) {
    issues.push({
      code: "missing-image-alt",
      title: "Images Missing Descriptive Alt Text",
      severity: missingAltImagesCount > 5 ? "HIGH" : "MEDIUM",
      displayValue: `${missingAltImagesCount} image(s) lack an alt attribute`,
      evidence: `${missingAltImagesCount} of ${imgMatches.length} <img> elements have empty or missing alt attributes.`,
    });
  }

  // 7. Open Graph Tags
  const hasOpenGraph = /<meta\s+[^>]*property=["']og:title["']/i.test(html) ||
                       /<meta\s+[^>]*name=["']og:title["']/i.test(html);

  if (!hasOpenGraph) {
    issues.push({
      code: "missing-open-graph",
      title: "Missing Open Graph Metadata",
      severity: "LOW",
      displayValue: "No og:title meta tag found",
      evidence: "Social media link previews will fall back to basic snippet parsing.",
    });
  }

  // 8. Structured Data (JSON-LD)
  const jsonLdMatch = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  let hasStructuredData = false;
  const schemaTypes: string[] = [];

  if (jsonLdMatch && jsonLdMatch[1]) {
    try {
      const parsedLd = JSON.parse(jsonLdMatch[1].trim());
      hasStructuredData = true;

      const findTypes = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        if (obj["@type"]) {
          const t = obj["@type"];
          if (Array.isArray(t)) t.forEach((item) => schemaTypes.push(String(item)));
          else schemaTypes.push(String(t));
        }
        for (const k of Object.keys(obj)) {
          if (typeof obj[k] === "object") findTypes(obj[k]);
        }
      };
      findTypes(parsedLd);
    } catch {
      issues.push({
        code: "invalid-json-ld",
        title: "Invalid JSON-LD Structured Data",
        severity: "HIGH",
        displayValue: "Syntax error in application/ld+json script",
        evidence: "JSON-LD structured data script failed to parse as valid JSON.",
      });
    }
  }

  // 9. Links Analysis (Screaming Frog Style)
  const linkMatches = Array.from(
    html.matchAll(/<a\s+([^>]*?)href=["']([^"'#][^"']*)["']([^>]*?)>([\s\S]*?)<\/a>/gi)
  );
  let internalLinksCount = 0;
  let externalLinksCount = 0;
  let nofollowLinksCount = 0;

  let targetOrigin = "";
  try {
    targetOrigin = new URL(targetUrl).origin.toLowerCase();
  } catch {}

  for (const match of linkMatches) {
    const rawHref = match[2]?.trim() || "";
    const attrs = `${match[1] || ""} ${match[3] || ""}`;
    const isNofollow = /rel=["'][^"']*nofollow[^"']*["']/i.test(attrs);
    if (isNofollow) nofollowLinksCount++;

    if (
      rawHref.startsWith("/") ||
      rawHref.startsWith("./") ||
      (targetOrigin && rawHref.toLowerCase().startsWith(targetOrigin))
    ) {
      internalLinksCount++;
    } else if (rawHref.startsWith("http://") || rawHref.startsWith("https://")) {
      externalLinksCount++;
    }
  }

  // 10. Word Count & Content Depth (Semrush Style)
  const cleanBodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleanBodyText ? cleanBodyText.split(/\s+/).filter((w) => w.length > 1) : [];
  const wordCount = words.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 225));

  if (wordCount > 0 && wordCount < 50 && html.length > 1500 && httpStatus === 200) {
    issues.push({
      code: "thin-content",
      title: "Thin Content Warning",
      severity: "MEDIUM",
      displayValue: `Only ${wordCount} words detected (recommended: 300+)`,
      evidence: "Low word count pages struggle to rank on competitive search terms.",
    });
  }

  // 11. Headings Hierarchy Tree (H2, H3)
  const h2Count = Array.from(html.matchAll(/<h2[^>]*>/gi)).length;
  const h3Count = Array.from(html.matchAll(/<h3[^>]*>/gi)).length;

  if (h1Count > 0 && h2Count === 0 && wordCount >= 250) {
    issues.push({
      code: "missing-h2",
      title: "No Subheadings (H2) Found",
      severity: "LOW",
      displayValue: "Page lacks H2 subheadings to organize content",
      evidence: "Proper H2 headings improve scan-ability and search topical relevance.",
    });
  }

  // 12. Content Keyword Density & TF-IDF Extraction (Semrush Style)
  const stopWords = new Set([
    "about", "above", "across", "after", "again", "against", "almost", "along", "already",
    "also", "although", "always", "among", "another", "because", "before", "behind", "below",
    "between", "could", "every", "first", "found", "great", "group", "having", "however",
    "large", "later", "little", "might", "never", "number", "often", "other", "place",
    "point", "right", "shall", "should", "since", "small", "still", "their", "there",
    "these", "thing", "think", "those", "through", "under", "until", "water", "where",
    "which", "while", "would", "years", "your", "with", "from", "that", "this", "have"
  ]);

  const wordFrequency: Record<string, number> = {};
  for (const w of words) {
    const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanWord.length >= 4 && !stopWords.has(cleanWord) && !/^\d+$/.test(cleanWord)) {
      wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
    }
  }

  const topKeywords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => {
      const densityPercent = wordCount > 0 ? Number(((count / wordCount) * 100).toFixed(1)) : 0;
      const inTitle = pageTitle ? pageTitle.toLowerCase().includes(word) : false;
      const inH1 = h1Text ? h1Text.toLowerCase().includes(word) : false;
      return {
        word,
        count,
        densityPercent,
        inTitle,
        inH1,
      };
    });

  // Flag keyword stuffing only on substantive copy if top keyword density > 4%
  const leadKeyword = topKeywords[0];
  if (wordCount >= 100 && leadKeyword && leadKeyword.densityPercent > 4.0) {
    issues.push({
      code: "keyword-stuffing",
      title: "Potential Keyword Stuffing Detected",
      severity: "HIGH",
      displayValue: `Term "${leadKeyword.word}" has ${leadKeyword.densityPercent}% density`,
      evidence: `Term appears ${leadKeyword.count} times. Google penalizes unnatural keyword repetition.`,
    });
  }

  // 13. Google SERP Snippet Simulator (Semrush Style)
  const pixelWidthEstimate = Math.round(titleLength * 9.5);
  const isTitleTruncated = pixelWidthEstimate > 600;
  let previewUrlDisplay = targetUrl;
  try {
    const parsed = new URL(targetUrl);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    previewUrlDisplay = parsed.hostname + (pathParts.length > 0 ? ` › ${pathParts.join(" › ")}` : "");
  } catch {}

  const serpSnippetPreview = {
    pixelWidthEstimate,
    isTitleTruncated,
    previewUrlDisplay,
    snippet: metaDescription || cleanBodyText.slice(0, 155) || "No snippet available for this destination.",
  };

  // 14. Open Graph & Twitter Cards Details
  const ogTitleMatch =
    /<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i.exec(html) ||
    /<meta\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i.exec(html);
  const ogDescMatch =
    /<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i.exec(html) ||
    /<meta\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i.exec(html);
  const ogImgMatch =
    /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i.exec(html) ||
    /<meta\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i.exec(html);
  const twitterCardMatch =
    /<meta\s+[^>]*name=["']twitter:card["'][^>]*content=["']([^"']*)["']/i.exec(html) ||
    /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']twitter:card["']/i.exec(html);

  const openGraphData = {
    ogTitle: ogTitleMatch ? ogTitleMatch[1]?.trim() : null,
    ogDescription: ogDescMatch ? ogDescMatch[1]?.trim() : null,
    ogImage: ogImgMatch ? ogImgMatch[1]?.trim() : null,
    twitterCard: twitterCardMatch ? twitterCardMatch[1]?.trim() : null,
  };

  // 15. Indexability Verdict (Screaming Frog Style)
  let isIndexable = true;
  let indexabilityReason = "Indexable";
  if (httpStatus >= 400) {
    isIndexable = false;
    indexabilityReason = `HTTP Error ${httpStatus}`;
  } else if (robotsDirectives && robotsDirectives.includes("noindex")) {
    isIndexable = false;
    indexabilityReason = "Blocked by meta robots: 'noindex'";
  } else if (!isCanonicalMatch && canonicalUrl) {
    isIndexable = false;
    indexabilityReason = `Canonicalized to ${canonicalUrl}`;
  }

  // 16. Ahrefs-Style Site Health Score (0-100)
  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const highCount = issues.filter((i) => i.severity === "HIGH").length;
  const mediumCount = issues.filter((i) => i.severity === "MEDIUM").length;
  const lowCount = issues.filter((i) => i.severity === "LOW").length;
  const ahrefsHealthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(100 - (criticalCount * 7 + highCount * 4 + mediumCount * 2 + lowCount * 0.5))
    )
  );

  // 17. Semrush-Style On-Page Score (0-100)
  let semrushScore = 100;
  if (!pageTitle) semrushScore -= 15;
  else if (isTitleTruncated) semrushScore -= 5;
  if (!metaDescription) semrushScore -= 10;
  if (h1Count === 0) semrushScore -= 15;
  if (!canonicalUrl) semrushScore -= 10;
  if (missingAltImagesCount > 0) semrushScore -= Math.min(10, missingAltImagesCount * 2);
  if (!hasStructuredData) semrushScore -= 10;
  if (!hasOpenGraph) semrushScore -= 5;
  if (wordCount < 250) semrushScore -= 10;
  if (!isHttps) semrushScore -= 10;
  semrushScore = Math.max(10, semrushScore);

  const seoData: SEOResultData = {
    httpStatus,
    isHttps,
    pageTitle: pageTitle ?? null,
    titleLength: titleLength ?? null,
    metaDescription: metaDescription ?? null,
    descriptionLength: descriptionLength ?? null,
    canonicalUrl: canonicalUrl ?? null,
    isCanonicalMatch,
    robotsDirectives: robotsDirectives ?? null,
    h1Count,
    h1Text: h1Text ?? null,
    hasBrokenInternalLinks: false,
    brokenLinksCount: 0,
    missingAltImagesCount,
    hasOpenGraph,
    hasStructuredData,
    internalLinksCount,
    externalLinksCount,
    nofollowLinksCount,
    h2Count,
    h3Count,
    wordCount,
    readingTimeMin,
    isIndexable,
    indexabilityReason,
    totalImagesCount: imgMatches.length,
    semrushScore,
    topKeywords,
    serpSnippetPreview,
    ahrefsHealthScore,
    schemaTypes: Array.from(new Set(schemaTypes)),
    openGraphData,
  };

  return {
    seoData,
    issues,
  };
}
