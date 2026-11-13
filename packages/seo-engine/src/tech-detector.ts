import { TechStack } from "@speedpilot/shared";

export interface TechDetectionResult {
  detectedStack: TechStack;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: string[];
  subStacks: string[];
  existingHints: string[];
  responseHeaders: {
    cacheControl?: string;
    contentEncoding?: string;
    server?: string;
  };
}

function extractHeadHints(html: string): string[] {
  const hints: string[] = [];
  const linkRegex = /<link\b[^>]*rel\s*=\s*["']([^"']*(?:preload|preconnect|prefetch|dns-prefetch)[^"']*)["'][^>]*>/gi;
  for (const m of html.matchAll(linkRegex)) {
    const tag = m[0];
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (hrefMatch?.[1] && !hints.includes(hrefMatch[1])) {
      hints.push(hrefMatch[1].trim());
    }
    if (hints.length >= 20) break;
  }
  return hints;
}

function detectSubStacksAndHeaders(html: string, lowerHtml: string, headers: Headers) {
  const subStacks: string[] = [];
  const server = headers.get("server") || undefined;
  const cacheControl = headers.get("cache-control") || undefined;
  const contentEncoding = headers.get("content-encoding") || undefined;
  const serverLower = (server || "").toLowerCase();

  const rules: Array<[boolean, string]> = [
    [lowerHtml.includes("/wp-content/litespeed/") || lowerHtml.includes("litespeed") || serverLower.includes("litespeed"), "LiteSpeed Cache"],
    [lowerHtml.includes("wp-rocket") || lowerHtml.includes("rocket-lazyload"), "WP Rocket"],
    [lowerHtml.includes("/wp-content/cache/autoptimize"), "Autoptimize"],
    [lowerHtml.includes("/themes/divi/") || lowerHtml.includes("et_pb_"), "Divi Theme"],
    [lowerHtml.includes("/plugins/elementor/"), "Elementor"],
    [Boolean(headers.get("cf-ray")) || serverLower.includes("cloudflare"), "Cloudflare CDN"],
    [lowerHtml.includes("googletagmanager.com/gtm.js"), "Google Tag Manager"],
    [lowerHtml.includes("astro-island") || lowerHtml.includes("/_astro/"), "Astro"],
    [lowerHtml.includes("data-wf-site") || lowerHtml.includes("website-files.com"), "Webflow"],
    [lowerHtml.includes("/@vite/") || /src=["'][^"']*\/assets\/index-[a-z0-9_-]+\.js/i.test(html), "Vite"],
  ];

  for (const [matched, label] of rules) {
    if (matched) subStacks.push(label);
  }

  return {
    subStacks,
    existingHints: extractHeadHints(html),
    responseHeaders: { cacheControl, contentEncoding, server },
  };
}

/**
 * Deterministically detects CMS, plugins, CDN layers, and existing <head> hints from HTML & headers.
 */
export function detectTechStack(html: string, headers: Headers = new Headers()): TechDetectionResult {
  const evidence: string[] = [];
  const lowerHtml = html.toLowerCase();
  const serverHeader = (headers.get("server") || "").toLowerCase();
  const poweredBy = (headers.get("x-powered-by") || "").toLowerCase();
  const meta = detectSubStacksAndHeaders(html, lowerHtml, headers);

  const finish = (detectedStack: TechStack, confidence: "HIGH" | "MEDIUM" | "LOW"): TechDetectionResult => ({
    detectedStack,
    confidence,
    evidence,
    ...meta,
  });

  // 1. Next.js Check
  if (
    lowerHtml.includes("/_next/static/") ||
    lowerHtml.includes('id="__next_data__"') ||
    lowerHtml.includes('id="__next"') ||
    poweredBy.includes("next.js")
  ) {
    if (lowerHtml.includes("/_next/static/")) evidence.push("Found Next.js static asset chunk path '/_next/static/'");
    if (lowerHtml.includes('id="__next_data__"')) evidence.push("Found Next.js data hydration script '__NEXT_DATA__'");
    if (poweredBy.includes("next.js")) evidence.push("Header 'x-powered-by: Next.js' present");
    return finish("NEXTJS", "HIGH");
  }

  // 2. WooCommerce Check (Must check before general WordPress)
  if (
    (lowerHtml.includes("/wp-content/") || lowerHtml.includes("wordpress")) &&
    (lowerHtml.includes("woocommerce") || lowerHtml.includes("wc-ajax") || lowerHtml.includes("woocommerce-cart"))
  ) {
    evidence.push("WordPress core structure identified");
    evidence.push("WooCommerce shopping cart / script modules detected");
    return finish("WOOCOMMERCE", "HIGH");
  }

  // 3. WordPress Check
  if (
    lowerHtml.includes("/wp-content/") ||
    lowerHtml.includes("/wp-includes/") ||
    lowerHtml.includes('content="wordpress')
  ) {
    if (lowerHtml.includes("/wp-content/")) evidence.push("Theme and plugin directory '/wp-content/' referenced");
    if (lowerHtml.includes("/wp-includes/")) evidence.push("WordPress core scripts in '/wp-includes/' referenced");
    if (lowerHtml.includes('content="wordpress')) evidence.push("Generator meta tag specifies WordPress");
    return finish("WORDPRESS", "HIGH");
  }

  // 4. Shopify Check
  if (
    lowerHtml.includes("cdn.shopify.com") ||
    lowerHtml.includes("shopify.theme") ||
    lowerHtml.includes("myshopify.com")
  ) {
    if (lowerHtml.includes("cdn.shopify.com")) evidence.push("Shopify CDN assets referenced 'cdn.shopify.com'");
    if (lowerHtml.includes("shopify.theme")) evidence.push("Shopify JavaScript theme object initialized");
    return finish("SHOPIFY", "HIGH");
  }

  // 5. Laravel Check
  if (
    lowerHtml.includes("csrf-token") &&
    (lowerHtml.includes("livewire") || serverHeader.includes("laravel") || poweredBy.includes("laravel"))
  ) {
    evidence.push("Laravel CSRF / Livewire tokens detected");
    return finish("LARAVEL", "HIGH");
  }

  // 6. Generic React Check (Non-Next.js)
  if (
    lowerHtml.includes("data-reactroot") ||
    lowerHtml.includes('id="root"') ||
    lowerHtml.includes("react.production.min.js")
  ) {
    evidence.push("React DOM mounting root node identified");
    return finish("REACT", "MEDIUM");
  }

  // 7. Unknown / Custom Stack
  evidence.push("No definitive framework signatures found in DOM or headers.");
  return finish(meta.subStacks.length ? "CUSTOM" : "UNKNOWN", meta.subStacks.length ? "MEDIUM" : "LOW");
}

