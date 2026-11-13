import { TechStack } from "@speedpilot/shared";

export interface TechDetectionResult {
  detectedStack: TechStack;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: string[];
}

/**
 * Deterministically detects CMS and frontend frameworks from HTML content and response headers.
 */
export function detectTechStack(html: string, headers: Headers = new Headers()): TechDetectionResult {
  const evidence: string[] = [];
  const lowerHtml = html.toLowerCase();
  const serverHeader = (headers.get("server") || "").toLowerCase();
  const poweredBy = (headers.get("x-powered-by") || "").toLowerCase();

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
    return { detectedStack: "NEXTJS", confidence: "HIGH", evidence };
  }

  // 2. WooCommerce Check (Must check before general WordPress)
  if (
    (lowerHtml.includes("/wp-content/") || lowerHtml.includes("wordpress")) &&
    (lowerHtml.includes("woocommerce") || lowerHtml.includes("wc-ajax") || lowerHtml.includes("woocommerce-cart"))
  ) {
    evidence.push("WordPress core structure identified");
    evidence.push("WooCommerce shopping cart / script modules detected");
    return { detectedStack: "WOOCOMMERCE", confidence: "HIGH", evidence };
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
    return { detectedStack: "WORDPRESS", confidence: "HIGH", evidence };
  }

  // 4. Shopify Check
  if (
    lowerHtml.includes("cdn.shopify.com") ||
    lowerHtml.includes("shopify.theme") ||
    lowerHtml.includes("myshopify.com")
  ) {
    if (lowerHtml.includes("cdn.shopify.com")) evidence.push("Shopify CDN assets referenced 'cdn.shopify.com'");
    if (lowerHtml.includes("shopify.theme")) evidence.push("Shopify JavaScript theme object initialized");
    return { detectedStack: "SHOPIFY", confidence: "HIGH", evidence };
  }

  // 5. Laravel Check
  if (
    lowerHtml.includes("csrf-token") &&
    (lowerHtml.includes("livewire") || serverHeader.includes("laravel") || poweredBy.includes("laravel"))
  ) {
    evidence.push("Laravel CSRF / Livewire tokens detected");
    return { detectedStack: "LARAVEL", confidence: "HIGH", evidence };
  }

  // 6. Generic React Check (Non-Next.js)
  if (
    lowerHtml.includes("data-reactroot") ||
    lowerHtml.includes('id="root"') ||
    lowerHtml.includes("react.production.min.js")
  ) {
    evidence.push("React DOM mounting root node identified");
    return { detectedStack: "REACT", confidence: "MEDIUM", evidence };
  }

  // 7. Unknown / Custom Stack
  return {
    detectedStack: "UNKNOWN",
    confidence: "LOW",
    evidence: ["No definitive framework signatures found in DOM or headers."],
  };
}
