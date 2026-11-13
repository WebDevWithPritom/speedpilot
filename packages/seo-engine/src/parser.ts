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

  if (jsonLdMatch && jsonLdMatch[1]) {
    try {
      JSON.parse(jsonLdMatch[1].trim());
      hasStructuredData = true;
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
  };

  return {
    seoData,
    issues,
  };
}
