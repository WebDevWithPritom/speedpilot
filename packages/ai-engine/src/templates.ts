import { AIRecommendationOutput, TechStack } from "@speedpilot/shared";

export interface TemplateEvidenceItem {
  url?: string;
  wastedMs?: number;
  wastedBytes?: number;
  description?: string;
  selector?: string;
  snippet?: string;
  nodeLabel?: string;
}

function isDocumentRootUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw, "https://placeholder.local");
    return parsed.pathname === "/" || /\.(html?|php|aspx?)$/i.test(parsed.pathname);
  } catch {
    return raw === "/";
  }
}

function extractEvidenceUrls(primary?: string, items?: TemplateEvidenceItem[], limit = 6): string[] {
  const seen = new Set<string>();
  const add = (u?: string) => {
    if (!u || typeof u !== "string") return;
    const trimmed = u.trim();
    if (!trimmed || (!trimmed.startsWith("http") && !trimmed.startsWith("/"))) return;
    if (!seen.has(trimmed)) seen.add(trimmed);
  };
  add(primary);
  for (const item of items || []) {
    if (seen.size >= limit) break;
    add(item.url);
  }
  return Array.from(seen).slice(0, limit);
}

function extractOrigins(primary?: string, items?: TemplateEvidenceItem[], limit = 4): string[] {
  const allUrls = [primary, ...(items || []).map((i) => i.url)].filter((u): u is string => Boolean(u));
  let primaryOrigin: string | null = null;
  for (const u of allUrls) {
    if (isDocumentRootUrl(u)) {
      try {
        primaryOrigin = new URL(u).origin;
        break;
      } catch {
        // ignore
      }
    }
  }
  const thirdPartyOrigins = new Set<string>();
  for (const raw of allUrls) {
    try {
      const origin = new URL(raw).origin;
      if (primaryOrigin && origin === primaryOrigin) continue;
      thirdPartyOrigins.add(origin);
    } catch {
      // Skip relative paths
    }
    if (thirdPartyOrigins.size >= limit) break;
  }
  return Array.from(thirdPartyOrigins);
}

function guessPreloadAs(url: string): "style" | "script" | "font" | "image" {
  const clean = (url.split("?")[0] ?? url).toLowerCase();
  if (clean.endsWith(".css") || url.includes("fonts.googleapis.com")) return "style";
  if (clean.endsWith(".woff2") || clean.endsWith(".woff") || clean.endsWith(".ttf") || clean.endsWith(".otf")) return "font";
  if (/\.(png|jpe?g|webp|avif|gif|svg)$/.test(clean)) return "image";
  return "script";
}

function guessFontMime(url: string): string {
  const clean = (url.split("?")[0] ?? url).toLowerCase();
  if (clean.endsWith(".woff2")) return "font/woff2";
  if (clean.endsWith(".woff")) return "font/woff";
  if (clean.endsWith(".ttf")) return "font/ttf";
  if (clean.endsWith(".otf")) return "font/otf";
  return "font/woff2";
}

function buildPreloadSnippet(urls: string[], prioritizeFirstImage = false): string {
  const assetUrls = urls.filter((u) => !isDocumentRootUrl(u));
  const targetUrls = (assetUrls.length ? assetUrls : urls).slice(0, 4);
  const lines = targetUrls.map((url, idx) => {
    const asType = guessPreloadAs(url);
    if (asType === "font") {
      return `<link rel="preload" href="${url}" as="font" type="${guessFontMime(url)}" crossorigin>`;
    }
    if (asType === "image") {
      const extra = prioritizeFirstImage && idx === 0 ? ` fetchpriority="high"` : "";
      return `<link rel="preload" href="${url}" as="image"${extra}>`;
    }
    if (asType === "style") {
      return `<link rel="preload" href="${url}" as="style" onload="this.onload=null;this.rel='stylesheet'">`;
    }
    // Render-blocking JS must be deferred/async, NOT blindly preloaded with higher priority
    return `<script src="${url}" defer></script>`;
  });
  return lines.join("\n");
}

function buildPreconnectSnippet(origins: string[]): string {
  if (origins.length === 0) {
    return `<!-- All flagged resources are on your own origin — no cross-origin <link rel="preconnect"> needed. -->`;
  }
  return origins
    .map((origin) => `<link rel="preconnect" href="${origin}" crossorigin>\n<link rel="dns-prefetch" href="${origin}">`)
    .join("\n");
}

export interface RecommendationContextOptions {
  targetUrl?: string;
  subStacks?: string[];
  existingHints?: string[];
  responseHeaders?: {
    cacheControl?: string;
    contentEncoding?: string;
    server?: string;
  };
  sourceCode?: string;
  sourceFilename?: string;
}

function splitUrlsByOrigin(urls: string[], targetUrl?: string): { firstParty: string[]; thirdParty: string[] } {
  let targetOrigin: string | null = null;
  if (targetUrl) {
    try {
      targetOrigin = new URL(targetUrl).origin;
    } catch {
      targetOrigin = null;
    }
  }
  if (!targetOrigin) return { firstParty: urls, thirdParty: [] };
  const firstParty: string[] = [];
  const thirdParty: string[] = [];
  for (const u of urls) {
    try {
      const urlOrigin: string = u.startsWith("/") ? targetOrigin : new URL(u).origin;
      if (urlOrigin === targetOrigin) firstParty.push(u);
      else thirdParty.push(u);
    } catch {
      firstParty.push(u);
    }
  }
  return { firstParty, thirdParty };
}

function buildContextHeader(ctx?: RecommendationContextOptions): string {
  if (!ctx) return "";
  const lines: string[] = [];
  if (ctx.subStacks?.length) lines.push(`// Detected Plugins/CDN: ${ctx.subStacks.join(", ")}`);
  if (ctx.responseHeaders?.server || ctx.responseHeaders?.contentEncoding || ctx.responseHeaders?.cacheControl) {
    lines.push(
      `// Origin Headers: server=${ctx.responseHeaders.server || "unknown"} | encoding=${ctx.responseHeaders.contentEncoding || "none"} | cache-control=${ctx.responseHeaders.cacheControl || "unset"}`
    );
  }
  if (ctx.sourceFilename) lines.push(`// Target Source File Analyzed: ${ctx.sourceFilename}`);
  return lines.length ? `${lines.join("\n")}\n\n` : "";
}

export function getDeterministicRecommendation(
  issueCode: string,
  techStack: TechStack,
  evidenceResource?: string,
  wastedMs?: number,
  evidenceItems?: TemplateEvidenceItem[],
  ctx?: RecommendationContextOptions
): AIRecommendationOutput {
  const urls = extractEvidenceUrls(evidenceResource, evidenceItems);
  const existingSet = new Set((ctx?.existingHints || []).map((h) => h.trim()));
  const unhintedUrls = urls.filter((u) => !existingSet.has(u));
  const preloadUrls = unhintedUrls.length ? unhintedUrls : urls;
  const { firstParty, thirdParty } = splitUrlsByOrigin(urls, ctx?.targetUrl);
  const origins = extractOrigins(ctx?.targetUrl || evidenceResource, evidenceItems);
  const contextHeader = buildContextHeader(ctx);
  const subLower = (ctx?.subStacks || []).join(" ").toLowerCase();
  const urlLower = urls.join(" ").toLowerCase();
  const isLiteSpeed = subLower.includes("litespeed") || urlLower.includes("/litespeed/");
  const isWpRocket = subLower.includes("wp rocket") || urlLower.includes("wp-rocket");
  const isCloudflare = subLower.includes("cloudflare");
  const firstNode = evidenceItems?.find((item) => item.selector || item.snippet);
  const primaryUrl = urls[0] || evidenceResource;
  const savingsNotice = wastedMs ? ` (~${wastedMs}ms potential savings)` : "";
  const resourceNotice = primaryUrl ? ` affecting '${primaryUrl}'` : "";
  const flaggedListComment = urls.length
    ? `\n<!-- Detected from your audit:\n${urls.map((u) => `     - ${u}`).join("\n")}\n-->`
    : "";

  // Render-blocking resources (Lighthouse v10-13)
  if (issueCode === "render-blocking-resources" || issueCode === "render-blocking-insight") {
    const detectedPreloads = preloadUrls.length
      ? `\n\n<!-- Exact <head> preloads (CSS/fonts) & defer (JS) for unhinted files -->\n${buildPreloadSnippet(preloadUrls)}`
      : "";
    const wpPluginNote = isLiteSpeed
      ? `/* LiteSpeed Cache Detected: WordPress Admin -> LiteSpeed Cache -> Page Optimization:\n   - CSS Settings: Enable 'CSS Minify', 'Load CSS Asynchronously' + 'Generate UCSS'\n   - JS Settings: Enable 'Load JS Deferred' (Deferred) */\n\n`
      : isWpRocket
      ? `/* WP Rocket Detected: WordPress Admin -> Settings -> WP Rocket -> File Optimization:\n   - Enable 'Optimize CSS delivery' + 'Load JavaScript deferred' */\n\n`
      : "";
    if (techStack === "NEXTJS") {
      return {
        detectedStack: "NEXTJS",
        explanationMarketer: `The website takes extra time to render visible content because stylesheets or scripts are loaded synchronously before HTML elements are drawn${savingsNotice}. Delaying non-critical styles improves first impressions and organic search rankings.`,
        explanationDeveloper: `Synchronous CSS or JS links in <head> block the browser parser from building the Render Tree${resourceNotice}. In Next.js App Router, rely on CSS Modules or Next.js built-in font/style optimization with 'next/font' and preload non-critical CSS.`,
        explanationAgency: `High impact optimization. Eliminating this block directly recovers ~${wastedMs || 500}ms on mobile devices, lifting Core Web Vitals LCP into the 'Good' tier.`,
        explanationSaaSTeam: `Core render path bottleneck. Resolving this protects the 75th percentile LCP target during incoming marketing campaigns.`,
        remediationCodeSnippet: `// Next.js App Router (app/layout.tsx)\n// 1. Use next/font to automatically inline critical font CSS\nimport { Inter } from 'next/font/google';\nconst inter = Inter({ subsets: ['latin'], display: 'swap' });\n\n// 2. Preload non-critical external third-party styles\n<link rel="preload" href="${primaryUrl || "/theme-extra.css"}" as="style" />\n<link rel="stylesheet" href="${primaryUrl || "/theme-extra.css"}" media="print" onLoad="this.media='all'" />${detectedPreloads}`,
        implementationSteps: [
          "Identify critical above-the-fold styles and inline them into layout.tsx",
          "Convert external render-blocking stylesheets to asynchronous loading using media='print' pattern",
          "Move non-critical third-party scripts to next/script with strategy='lazyOnload'",
        ],
        verificationSteps: [
          "Run 'npm run build && npm run start' locally",
          "Run SpeedPilot audit on localhost:3000 to verify 0ms render-blocking time",
        ],
        estimatedDifficulty: "MEDIUM",
        estimatedImpact: "HIGH",
      };
    }

    if (techStack === "WORDPRESS" || techStack === "WOOCOMMERCE") {
      return {
        detectedStack: techStack,
        explanationMarketer: `Your WordPress theme or plugins are loading heavy styling files before the page shows text${savingsNotice}. Visitors on mobile experience a blank screen during this delay.`,
        explanationDeveloper: `Theme and plugin scripts enqueued via wp_enqueue_style/script are rendering in <head> without 'defer' or async attributes. Critical CSS is not inlined.`,
        explanationAgency: `Essential fix for client satisfaction. Inlining critical CSS and deferring non-essential plugin styles will yield an immediate 10-15 point PageSpeed increase.`,
        explanationSaaSTeam: `WordPress theme asset bloat is degrading mobile conversion rates. Apply critical CSS extraction.`,
        remediationCodeSnippet: `${contextHeader}${wpPluginNote}// In your theme's functions.php or custom plugin:\nadd_filter('style_loader_tag', function($html, $handle) {\n    if ($handle === 'non-critical-plugin-style') {\n        return str_replace("rel='stylesheet'", "rel='preload' as='style' onload=\\"this.onload=null;this.rel='stylesheet'\\"", $html);\n    }\n    return $html;\n}, 10, 2);${detectedPreloads}`,
        implementationSteps: [
          "Audit active plugins enqueuing styles on every page",
          "Configure a critical CSS solution (or lightweight caching plugin) to inline above-the-fold CSS",
          "Defer non-critical scripts using add_filter('script_loader_tag')",
        ],
        verificationSteps: [
          "Flush WordPress cache and rerun audit in SpeedPilot",
        ],
        estimatedDifficulty: "MEDIUM",
        estimatedImpact: "HIGH",
      };
    }

    if (techStack === "SHOPIFY") {
      return {
        detectedStack: "SHOPIFY",
        explanationMarketer: `Apps and theme files are freezing your Shopify store display before customers can see products${savingsNotice}. Faster render times directly increase conversion and reduce checkout bounce.`,
        explanationDeveloper: `Shopify Liquid theme.liquid contains synchronous asset_url | stylesheet_tag in the <head>. Third-party app scripts are injected synchronously.`,
        explanationAgency: `Client e-commerce stores lose 7% conversion per second of delay. Eliminating render blocking in theme.liquid gives a noticeable speed boost.`,
        explanationSaaSTeam: `Checkout entry page is blocked by app scripts. Optimize asset delivery in Shopify theme.`,
        remediationCodeSnippet: `<!-- In theme.liquid: replace standard stylesheet_tag with preload -->\n{{ 'theme.css' | asset_url | preload_tag: as: 'style' }}\n<link rel="stylesheet" href="{{ 'theme.css' | asset_url }}" media="print" onload="this.media='all'">${detectedPreloads}`,
        implementationSteps: [
          "Review installed Shopify Apps in theme.liquid and eliminate orphaned app snippets",
          "Preload main theme CSS and load non-critical stylesheets asynchronously",
          "Ensure app scripts use the 'defer' attribute",
        ],
        verificationSteps: [
          "Test storefront in Shopify Theme Preview with SpeedPilot",
        ],
        estimatedDifficulty: "MEDIUM",
        estimatedImpact: "HIGH",
      };
    }

    // Default / Custom
    return {
      detectedStack: "CUSTOM",
      explanationMarketer: `Styles and scripts are stopping the browser from showing your page content right away${savingsNotice}.`,
      explanationDeveloper: `Synchronous CSS and JS assets in the <head> block DOM construction. Defer scripts and preload styles.`,
      explanationAgency: `High priority item for core web vitals compliance.`,
      explanationSaaSTeam: `FCP and LCP improvement target.`,
      remediationCodeSnippet: `<!-- Add defer to non-critical scripts & preload styles in <head> -->\n${urls.length ? buildPreloadSnippet(urls) : `<script src="/bundle.js" defer></script>\n<link rel="preload" href="/style.css" as="style" onload="this.onload=null;this.rel='stylesheet'">`}${flaggedListComment}`,
      implementationSteps: [
        "Add defer or async to all non-critical <script> tags so HTML parsing does not pause",
        "Preload above-the-fold stylesheets with <link rel='preload' as='style'> and inline critical hero CSS into <head>",
      ],
      verificationSteps: [
        "Audit with SpeedPilot and check First Contentful Paint decrease",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // Network dependency tree / Preconnect / Preload / Prefetch hints
  if (
    issueCode === "network-dependency-tree-insight" ||
    issueCode === "uses-rel-preconnect" ||
    issueCode === "uses-rel-preload" ||
    issueCode === "critical-request-chains" ||
    issueCode === "third-party-summary"
  ) {
    const preconnectTags = buildPreconnectSnippet(origins);
    const preloadTags = urls.length ? buildPreloadSnippet(urls) : `<link rel="preload" href="/css/critical.css" as="style">\n<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>`;
    return {
      detectedStack: techStack,
      explanationMarketer: `Your page waits through a chain of serial server round-trips before loading key scripts, fonts, and styles${savingsNotice}. Adding early browser hints lets the browser connect and download critical files right away.`,
      explanationDeveloper: `Deep critical request chains or unhinted third-party origins delay First Contentful Paint and LCP${resourceNotice}. Use <link rel="preconnect"> (for third-party domains used immediately), <link rel="preload"> (for critical resources needed on THIS page right away), and <link rel="prefetch"> (low priority, for files needed on the NEXT page click).`,
      explanationAgency: `Immediate low-risk <head> fix that cuts 200-800ms of TLS/DNS waterfall delay across third-party CDNs and font hosts.`,
      explanationSaaSTeam: `Trim serial dependency chains in index.html / layout.tsx to stabilize p75 LCP on mobile connections.`,
      remediationCodeSnippet: `<!-- 1. Preconnect early to critical third-party origins in <head> -->\n${preconnectTags}\n\n<!-- 2. Preload critical files needed immediately on THIS page -->\n${preloadTags}\n\n<!-- 3. Prefetch likely NEXT-page routes or bundles at idle time (optional) -->\n<link rel="prefetch" href="/about" as="document">${flaggedListComment}`,
      implementationSteps: [
        "Place up to 4 <link rel='preconnect' crossorigin> tags near the top of <head> for the third-party domains listed above",
        "Use <link rel='preload' as='...'> ONLY for critical hero images, fonts, or above-the-fold CSS needed immediately on first paint",
        "Use <link rel='prefetch'> for next-page routes or heavy assets users click next — never overuse preload or it delays the main bundle",
      ],
      verificationSteps: [
        "Open Chrome DevTools -> Network waterfall and confirm DNS/TLS handshakes start alongside the HTML download",
        "Re-run SpeedPilot to verify network-dependency-tree-insight drops",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // Font display / Webfont optimization (Lighthouse 13 font-display-insight)
  if (issueCode === "font-display-insight" || issueCode === "font-display") {
    const fontUrls = urls.filter((u) => /\.(woff2?|ttf|otf)(\?|$)/i.test(u));
    const fontPreloads = fontUrls.length
      ? buildPreloadSnippet(fontUrls)
      : `<link rel="preload" href="/fonts/primary-400.woff2" as="font" type="font/woff2" crossorigin>`;
    return {
      detectedStack: techStack,
      explanationMarketer: `Visitors see invisible text (Flash of Invisible Text) while custom fonts finish downloading${savingsNotice}. Showing a crisp fallback font immediately keeps users reading right away.`,
      explanationDeveloper: `Web fonts load without 'font-display: swap' or early preloading${resourceNotice}, hiding text until the font file finishes downloading.`,
      explanationAgency: `Quick CSS + <head> upgrade that eliminates blank-text delays and recovers ~100-300ms FCP.`,
      explanationSaaSTeam: `Standardize @font-face policies across design system typography tokens.`,
      remediationCodeSnippet: `<!-- 1. Preload primary WOFF2 font in <head> (crossorigin is required even on same origin) -->\n${fontPreloads}\n\n<!-- 2. Ensure font-display: swap in CSS @font-face (or &display=swap on Google Fonts) -->\n<style>\n@font-face {\n  font-family: 'PrimaryBrandFont';\n  src: url('${fontUrls[0] || "/fonts/primary-400.woff2"}') format('woff2');\n  font-display: swap;\n}\n</style>${flaggedListComment}`,
      implementationSteps: [
        "Add font-display: swap; (or optional) inside every @font-face block in your stylesheet",
        "If using Google Fonts, confirm the URL ends with &display=swap",
        "Preload only the 1-2 above-the-fold font weights actually used in your hero section",
      ],
      verificationSteps: [
        "Confirm text renders immediately on Slow 3G throttling in DevTools",
        "Re-run SpeedPilot audit to clear font-display-insight",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "MEDIUM",
    };
  }

  // Cache lifetimes (Lighthouse 13 cache-insight & uses-long-cache-ttl)
  if (issueCode === "cache-insight" || issueCode === "uses-long-cache-ttl") {
    const originHeaderRules = firstParty.length
      ? isCloudflare
        ? `# First-party assets (${firstParty.length}) via Cloudflare + Origin:\n# Set Cloudflare Caching -> Browser Cache TTL to 1 year, and send origin header:\n<FilesMatch "\\.(css|js|woff2|webp|avif|png|jpg|svg)$">\n  Header set Cache-Control "public, max-age=31536000, immutable"\n</FilesMatch>`
        : `# First-party origin assets (${firstParty.length}) — Apache (.htaccess) & Nginx:\n<FilesMatch "\\.(css|js|woff2|woff|ttf|webp|avif|png|jpg|svg)$">\n  Header set Cache-Control "public, max-age=31536000, immutable"\n</FilesMatch>\n\n# Nginx\nlocation ~* \\.(css|js|woff2|woff|ttf|webp|avif|png|jpg|svg)$ {\n  expires 1y;\n  add_header Cache-Control "public, max-age=31536000, immutable";\n}`
      : `# No 1st-party uncached files flagged — all flagged URLs below are 3rd-party domains you do not control via .htaccess.`;
    const thirdPartyCacheNote = thirdParty.length
      ? `\n\n# Third-party URLs (${thirdParty.length} external) CANNOT be fixed in your server .htaccess:\n${thirdParty.map((u) => `# - ${u} -> Self-host locally, proxy on your CDN, or load asynchronously (defer/Partytown)`).join("\n")}`
      : "";
    return {
      detectedStack: techStack,
      explanationMarketer: `Static images, CSS, and scripts are sent without long browser cache rules${savingsNotice}. Returning visitors have to re-download the same files instead of loading them instantly from their device.`,
      explanationDeveloper: `Found ${firstParty.length} first-party file(s) and ${thirdParty.length} third-party file(s) without long cache headers${resourceNotice}. Only first-party files can be cached via your origin/CDN headers; third-party scripts must be self-hosted or deferred.`,
      explanationAgency: `Dramatically speeds up repeat visits and cuts origin bandwidth by 40-70%.`,
      explanationSaaSTeam: `Enforce CDN/server Cache-Control headers on versioned assets while keeping HTML at max-age=0, must-revalidate.`,
      remediationCodeSnippet: `${contextHeader}${originHeaderRules}${thirdPartyCacheNote}${flaggedListComment}`,
      implementationSteps: [
        "Apply Cache-Control: public, max-age=31536000, immutable on hashed/versioned CSS, JS, fonts, and images",
        "Keep HTML responses at Cache-Control: no-cache (or short s-maxage on CDN) so deployments update immediately",
        "If assets come from a third-party CDN you don't control, self-host critical static scripts/fonts locally",
      ],
      verificationSteps: [
        "Check Response Headers -> Cache-Control in Chrome DevTools Network tab",
        "Re-run SpeedPilot audit to verify cache-insight passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // Modern image formats, responsive sizing & LCP image delivery
  if (
    issueCode === "modern-image-formats" ||
    issueCode === "uses-optimized-images" ||
    issueCode === "uses-responsive-images" ||
    issueCode === "image-delivery-insight"
  ) {
    const imgTarget = primaryUrl || "/images/hero-banner.jpg";
    const imgSelector = firstNode?.selector ? ` (${firstNode.selector})` : "";
    return {
      detectedStack: techStack,
      explanationMarketer: `Images on the page are larger than needed or stored in older formats (PNG/JPEG) instead of modern WebP/AVIF${savingsNotice}. Shrinking them makes pages snap open on mobile.`,
      explanationDeveloper: `Oversized or unoptimized raster images${resourceNotice}${imgSelector} increase network payload. Serve appropriately sized WebP/AVIF versions with srcset, explicit width/height, and lazy-load offscreen images.`,
      explanationAgency: `Quick win for client sites. Compressing and modernizing images frequently cuts page weight by 50-80%.`,
      explanationSaaSTeam: `Bandwidth reduction and CDN egress cost optimization.`,
      remediationCodeSnippet: `<!-- Responsive Modern Image (replace ${imgTarget}) -->\n<picture>\n  <source\n    type="image/avif"\n    srcset="/img/hero-480.avif 480w, /img/hero-960.avif 960w, /img/hero-1440.avif 1440w"\n    sizes="(max-width: 768px) 100vw, 1200px"\n  />\n  <source\n    type="image/webp"\n    srcset="/img/hero-480.webp 480w, /img/hero-960.webp 960w, /img/hero-1440.webp 1440w"\n    sizes="(max-width: 768px) 100vw, 1200px"\n  />\n  <img\n    src="${imgTarget}"\n    alt="Descriptive alt text"\n    width="1200"\n    height="675"\n    loading="lazy"\n    decoding="async"\n  />\n</picture>${firstNode?.snippet ? `\n<!-- Flagged DOM element:\n${firstNode.snippet}\n-->` : ""}${flaggedListComment}`,
      implementationSteps: [
        "Batch convert existing JPEG/PNG assets to WebP/AVIF format",
        "Implement <picture> element or modern image component with width/height attributes to prevent CLS",
        "Add loading='lazy' attribute to below-the-fold images",
      ],
      verificationSteps: [
        "Check network tab to confirm images transfer in WebP/AVIF format",
        "Run SpeedPilot audit to verify image format pass",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "MEDIUM",
    };
  }

  // Agentic Browsing - WebMCP Schemas
  if (issueCode === "webmcp-schema" || issueCode === "agentic-browsing" || issueCode === "webmcp") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Autonomous AI agents (such as Google Gemini, ChatGPT, and Claude Agentic Browsers) need structured declarations to navigate forms, search features, and transactional flows without breaking.`,
      explanationDeveloper: `WebMCP (Web Model Context Protocol) defines structured schema metadata in <head> or JSON-LD so AI browsing agents understand page actions, parameters, and executable form endpoints deterministically.`,
      explanationAgency: `Future-proof client visibility in Google AI Overviews and agentic search engines. Ensuring WebMCP compliance makes client websites directly operable by agentic shopping and booking assistants.`,
      explanationSaaSTeam: `Prevents automated agent bot failures and improves conversion from next-generation AI referrals.`,
      remediationCodeSnippet: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "SiteName",\n  "potentialAction": {\n    "@type": "SearchAction",\n    "target": "https://example.com/search?q={query}",\n    "query-input": "required name=query"\n  }\n}\n</script>`,
      implementationSteps: [
        "Embed standard Schema.org Action definitions (SearchAction, ReserveAction, BuyAction) in <head>",
        "Verify all interactive buttons and inputs have clear, unambiguous 'name' and 'id' attributes",
        "Publish an /llms.txt file at domain root outlining key markdown API endpoints for AI crawlers",
      ],
      verificationSteps: [
        "Verify schema in Google Rich Results Test",
        "Run SpeedPilot Agentic Browsing audit to confirm WebMCP status",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // Agentic Browsing - Accessibility Tree Well-Formed
  if (issueCode === "accessibility-tree" || issueCode === "accessibility-tree-well-formed") {
    return {
      detectedStack: techStack,
      explanationMarketer: `AI agents browse websites using the accessibility tree rather than visual pixels. An unformed accessibility tree causes AI agents to fail when trying to read or click elements.`,
      explanationDeveloper: `The Chromium accessibility tree is degraded due to missing ARIA labels, orphan interactive tags, or unlabeled form inputs. AI agents parse the AOM (Accessibility Object Model) to locate interactable targets.`,
      explanationAgency: `Dual benefit: solves both WCAG 2.1 ADA compliance requirements and enables full compatibility with modern Google Agentic Browsing.`,
      explanationSaaSTeam: `Eliminates automated accessibility litigation exposure and ensures AI-assisted users and agents can complete signups.`,
      remediationCodeSnippet: `<!-- Before: Unlabeled button and icon -->\n<button onclick="openMenu()"><svg>...</svg></button>\n\n<!-- Recommended Fix: Accessible name and ARIA semantics -->\n<button aria-label="Open Navigation Menu" title="Open Navigation Menu" onclick="openMenu()">\n  <svg aria-hidden="true" focusable="false">...</svg>\n</button>`,
      implementationSteps: [
        "Audit all icon-only buttons (<button><svg/></button>) and add 'aria-label' or visually hidden span text",
        "Ensure all <select> and <input> fields have associated <label for='...'> tags",
        "Ensure heading levels (h1 -> h2 -> h3) maintain logical hierarchical nesting without skipping levels",
      ],
      verificationSteps: [
        "Inspect elements in Chrome DevTools Accessibility pane to confirm accessible name is calculated",
        "Run SpeedPilot Agentic Browsing check to verify tree pass",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // Link discernible name & descriptive anchor text
  if (issueCode === "link-name" || issueCode === "link-text") {
    const flaggedSnippet = firstNode?.snippet ? `\n<!-- Flagged anchor element in your DOM -->\n${firstNode.snippet}` : "";
    return {
      detectedStack: techStack,
      explanationMarketer: `Links on the page lack clear or descriptive text (like icon-only links or vague "click here" / "learn more" labels). Visitors, screen readers, and Google crawlers cannot tell where the link goes.`,
      explanationDeveloper: `<a> anchor tags lack discernible text content, descriptive wording, or 'aria-label'${firstNode?.selector ? ` at selector '${firstNode.selector}'` : ""}. Replace generic phrases ("click here", "read more") or empty icons with clear text.`,
      explanationAgency: `Fundamental SEO and accessibility requirement. Every link must explicitly state its destination for humans and search crawlers.`,
      explanationSaaSTeam: `Prevents crawler dead-ends and ensures complete sitemap traversal.`,
      remediationCodeSnippet: `<!-- Before: Empty icon link or vague text -->\n<a href="/pricing">Read more</a>\n\n<!-- Recommended Fix: Descriptive label & accessible icon -->\n<a href="/pricing" aria-label="View SpeedPilot Pricing Plans">\n  Explore Pricing Plans\n</a>${flaggedSnippet}`,
      implementationSteps: [
        "Replace vague anchor text ('click here', 'read more') with the actual destination topic",
        "Add explicit 'aria-label' to icon-only links and set aria-hidden='true' on decorative SVG/icon tags",
      ],
      verificationSteps: [
        "Run SpeedPilot audit and verify 0 link-name warnings",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // Button discernible name
  if (issueCode === "button-name") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Interactive buttons lack labels (e.g. search triggers, cart toggles, mobile hamburger menus). AI agents cannot identify which action to take.`,
      explanationDeveloper: `<button> elements must have inner text, an 'aria-label', or an 'aria-labelledby' attribute that supplies an accessible name to the browser accessibility tree.`,
      explanationAgency: `Standard UX and ADA compliance fix. Prevents user and agent bounce on mobile navigation.`,
      explanationSaaSTeam: `Ensures automated end-to-end testing agents and AI browser helpers can interact with button elements reliably.`,
      remediationCodeSnippet: `<!-- Before -->\n<button class="search-btn"><svg>...</svg></button>\n\n<!-- Recommended Fix -->\n<button class="search-btn" aria-label="Search Catalog" type="button">\n  <svg aria-hidden="true">...</svg>\n</button>`,
      implementationSteps: [
        "Add aria-label to all icon buttons in global navigation and search bars",
        "Set type='button' explicitly on non-submit buttons to avoid form misfire",
      ],
      verificationSteps: [
        "Run SpeedPilot audit and verify button-name check passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // Largest Contentful Paint (LCP) & Lighthouse 13 lcp-breakdown-insight
  if (
    issueCode === "largest-contentful-paint" ||
    issueCode === "lcp-breakdown-insight" ||
    issueCode === "prioritize-lcp-image" ||
    issueCode === "lcp"
  ) {
    const lcpHref = primaryUrl || "/hero-banner.webp";
    return {
      detectedStack: techStack,
      explanationMarketer: `The largest visual element on the page (usually your hero image or main headline) takes too long to appear${savingsNotice}. Speeding this up makes the site feel instant and boosts Google rankings.`,
      explanationDeveloper: `LCP element suffers from high TTFB, resource load delay, or render delay${resourceNotice}${firstNode?.selector ? ` (${firstNode.selector})` : ""}. Preload the LCP asset in <head> with fetchpriority="high" and never apply loading="lazy" to above-the-fold hero media.`,
      explanationAgency: `Google Core Web Vitals ranking factor. Keeping LCP under 2.5 seconds passes the official search ranking threshold.`,
      explanationSaaSTeam: `Critical conversion metric. B2B and e-commerce conversions jump when LCP is under 2.0s.`,
      remediationCodeSnippet: `<!-- In HTML <head>: Priority Preload LCP Asset -->\n<link rel="preload" as="image" href="${lcpHref}" fetchpriority="high">\n\n<!-- On your Hero / LCP <img> Tag (never lazy-load above the fold) -->\n<img src="${lcpHref}" alt="Hero" fetchpriority="high" loading="eager" decoding="async" width="1200" height="600">${firstNode?.snippet ? `\n<!-- Flagged LCP node:\n${firstNode.snippet}\n-->` : ""}${flaggedListComment}`,
      implementationSteps: [
        "Identify the LCP node in audit evidence (hero image or primary heading)",
        `Add <link rel="preload" as="image" href="${lcpHref}" fetchpriority="high"> in <head>`,
        "Set loading='eager' and fetchpriority='high' directly on the hero <img> tag",
        "Serve the LCP image in WebP/AVIF from a fast CDN",
      ],
      verificationSteps: [
        "Inspect Performance tab in DevTools to confirm LCP occurs under 2.5s",
        "Rerun SpeedPilot audit on mobile and desktop",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    };
  }

  // Cumulative Layout Shift (CLS)
  if (issueCode === "cumulative-layout-shift" || issueCode === "layout-shifts" || issueCode === "cls") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Elements jump around unexpectedly while the page loads (like banners or images popping in late). This frustrates users and causes accidental misclicks.`,
      explanationDeveloper: `Images, ads, or dynamic iframes render without explicit width and height aspect ratios, causing browser reflows when resources finish loading.`,
      explanationAgency: `Easy Core Web Vitals win. Eliminating layout shifts brings CLS to ≤ 0.05, well within Google's 'Good' threshold.`,
      explanationSaaSTeam: `Fixes jarring visual glitches during landing page customer onboarding.`,
      remediationCodeSnippet: `/* CSS Aspect Ratio Reservation */\n.hero-image-wrapper {\n  aspect-ratio: 16 / 9;\n  width: 100%;\n  background-color: #f4f4f5;\n}\n\n<!-- Reserve Dimensions in HTML -->\n<img src="/banner.webp" width="1200" height="675" style="width:100%; height:auto;" alt="Banner">`,
      implementationSteps: [
        "Add explicit width and height attributes to all <img>, <video>, and <iframe> elements",
        "Use CSS aspect-ratio or min-height placeholders for dynamically injected ads or banners",
        "Use font-display: optional or size-adjust to prevent FOIT/FOUT font swap shifts",
      ],
      verificationSteps: [
        "Run SpeedPilot audit and verify CLS score is ≤ 0.05",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // Unused JavaScript / Code-Splitting & Unused/Unminified CSS/JS
  if (issueCode === "unused-javascript") {
    const jsList = urls.slice(0, 4);
    const thirdPartyNote = thirdParty.length
      ? `\n\n<!-- 3rd-party scripts (${thirdParty.length}) -> Load lazily or via Partytown / after interaction -->\n${thirdParty.slice(0, 3).map((u) => `<script src="${u}" defer></script>`).join("\n")}`
      : "";
    const firstPartyFix =
      isLiteSpeed
        ? `/* LiteSpeed Cache Detected: Page Optimization -> JS Settings:\n   - Enable 'Load JS Deferred' (Delayed) to stop unused JS from blocking initial paint */\n`
        : techStack === "NEXTJS"
        ? `// Next.js: Dynamic-import heavy client components & use next/script strategy="lazyOnload"\nimport dynamic from 'next/dynamic';\nimport Script from 'next/script';\nconst DeferredWidget = dynamic(() => import('@/components/Widget'), { ssr: false });\n`
        : "";
    const jsDeferTags = firstParty.length
      ? firstParty.slice(0, 3).map((u) => `<script src="${u}" defer></script>`).join("\n")
      : `<script src="${primaryUrl || "/assets/bundle.js"}" defer></script>`;

    return {
      detectedStack: techStack,
      explanationMarketer: `The website is downloading heavy scripts containing unused code on this page${savingsNotice}. This drains mobile batteries and delays button clicks.`,
      explanationDeveloper: `Found ${firstParty.length} first-party and ${thirdParty.length} third-party scripts with dead/unexecuted code${resourceNotice}. Split non-essential widgets with dynamic import() and defer or delay third-party pixels/chat embeds.`,
      explanationAgency: `Cuts initial JS weight and lowers Interaction to Next Paint (INP) & Total Blocking Time (TBT).`,
      explanationSaaSTeam: `Reduces script parse/compile time on mid-tier Android devices.`,
      remediationCodeSnippet: `${contextHeader}${firstPartyFix}${jsDeferTags}${thirdPartyNote}${flaggedListComment}`,
      implementationSteps: [
        `Inspect flagged bundles (${jsList.join(", ") || "bundle.js"}) and remove unused libraries/plugins`,
        techStack === "NEXTJS"
          ? "Convert non-initial modals, charts, and tooltips to next/dynamic({ ssr: false })"
          : "Defer or conditionally enqueue heavy scripts only on pages/routes that actually need them",
        "Load third-party marketing/analytics scripts after user interaction or via strategy='lazyOnload'",
      ],
      verificationSteps: [
        "Inspect Chrome DevTools -> Coverage tab to confirm unused JS bytes dropped",
        "Verify Total Blocking Time (TBT) improvement in SpeedPilot",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    };
  }

  if (issueCode === "unused-css-rules" || issueCode === "unminified-css" || issueCode === "unminified-javascript") {
    const isCss = issueCode !== "unminified-javascript";
    const cssNote = isLiteSpeed
      ? `/* LiteSpeed Cache Detected: Page Optimization -> CSS Settings:\n   - Enable 'CSS Minify', 'CSS Combine' (optional on HTTP/2), and 'Generate UCSS' */\n\n`
      : isWpRocket
      ? `/* WP Rocket Detected: File Optimization -> Enable 'Minify CSS' & 'Remove Unused CSS' */\n\n`
      : "";
    const fixTags = urls.length
      ? buildPreloadSnippet(urls)
      : isCss
      ? `<link rel="preload" href="/styles/critical.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">`
      : `<script src="/scripts/app.min.js" defer></script>`;
    return {
      detectedStack: techStack,
      explanationMarketer: `Stylesheets or scripts include dead CSS selectors or unminified whitespace${savingsNotice}, making visitors download extra kilobytes before the page finishes styling.`,
      explanationDeveloper: `Flagged '${issueCode}'${resourceNotice}. Enable production minification, strip unused CSS (PurgeCSS / Tailwind content scan / LiteSpeed UCSS), and load non-critical styles asynchronously.`,
      explanationAgency: `Fast payload win that tightens First Contentful Paint and LCP.`,
      explanationSaaSTeam: `Ensure production bundler (PostCSS/csso/terser) minifies & tree-shakes every release.`,
      remediationCodeSnippet: `${contextHeader}${cssNote}${fixTags}${flaggedListComment}`,
      implementationSteps: [
        isCss ? "Enable Unique/Critical CSS extraction or PurgeCSS on production builds" : "Enable terser/esbuild JS minification in your build pipeline",
        "Dequeue unused theme/plugin stylesheets on pages that don't use those widgets",
      ],
      verificationSteps: ["Re-run SpeedPilot audit and confirm unused CSS / unminified warnings clear"],
      estimatedDifficulty: "EASY",
      estimatedImpact: "MEDIUM",
    };
  }

  if (
    issueCode === "uses-text-compression" ||
    issueCode === "server-response-time" ||
    issueCode === "dom-size" ||
    issueCode === "total-byte-weight"
  ) {
    const encoding = ctx?.responseHeaders?.contentEncoding;
    const isCompression = issueCode === "uses-text-compression";
    const isTtfb = issueCode === "server-response-time";
    return {
      detectedStack: techStack,
      explanationMarketer: isTtfb
        ? `Your web server takes too long to send the very first HTML byte${savingsNotice}, delaying everything else on the page.`
        : isCompression
        ? `Text files (HTML/CSS/JS) are sent uncompressed instead of using Brotli or Gzip${savingsNotice}.`
        : `The page contains too many HTML DOM nodes or total megabytes${savingsNotice}, slowing down mobile browser rendering.`,
      explanationDeveloper: isTtfb
        ? `Slow origin TTFB${resourceNotice}. Enable full-page HTML caching (LiteSpeed Cache / Cloudflare APO / Next.js ISR) and optimize slow database queries.`
        : isCompression
        ? `Detected content-encoding=${encoding || "none"}. Enable Brotli ('br') with Gzip fallback on Nginx/Apache/Cloudflare.`
        : `Trim deeply nested page-builder wrappers, paginate long lists, and lazy-load offscreen media/iframes.`,
      explanationAgency: `Solves root server/network bottlenecks before optimizing micro-assets.`,
      explanationSaaSTeam: `Protects Core Web Vitals TTFB (< 800ms) and mobile memory budgets.`,
      remediationCodeSnippet: isCompression
        ? `${contextHeader}# Enable Brotli & Gzip compression (Nginx)\ngzip on;\ngzip_types text/plain text/css application/javascript application/json image/svg+xml;\nbrotli on;\nbrotli_types text/plain text/css application/javascript application/json image/svg+xml;${flaggedListComment}`
        : isTtfb
        ? `${contextHeader}# Recommended TTFB Headers (Edge CDN / Origin Cache)\nCache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400${flaggedListComment}`
        : `${contextHeader}<!-- Keep total DOM under ~1,400 nodes: paginate feeds & avoid hidden offscreen popups -->${flaggedListComment}`,
      implementationSteps: isTtfb
        ? ["Enable server/CDN page caching so anonymous visitors hit memory/edge cache in < 200ms", "Profile slow database queries or plugins on uncached requests"]
        : ["Enable Brotli/Gzip text compression on origin server or CDN", "Reduce oversized DOM containers and total payload weight"],
      verificationSteps: ["Re-run SpeedPilot audit and confirm TTFB / Compression / Byte Weight metrics pass"],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    };
  }

  // Legacy JavaScript, Bootup Time & Forced Reflow (Lighthouse 13)
  if (
    issueCode === "legacy-javascript-insight" ||
    issueCode === "legacy-javascript" ||
    issueCode === "bootup-time" ||
    issueCode === "forced-reflow-insight"
  ) {
    const isReflow = issueCode === "forced-reflow-insight";
    return {
      detectedStack: techStack,
      explanationMarketer: isReflow
        ? `Scripts are forcing the browser to repeatedly recalculate page layout${savingsNotice}, making scrolling and taps feel sluggish.`
        : `Your site ships old JavaScript polyfills meant for outdated browsers${savingsNotice}, slowing down downloads and phone CPUs.`,
      explanationDeveloper: isReflow
        ? `JavaScript reads geometric layout properties (offsetHeight, getBoundingClientRect) immediately after mutating DOM styles, triggering synchronous layout thrashing${resourceNotice}. Batch DOM reads before writes.`
        : `Scripts are compiled for ES5/legacy browsers with unnecessary polyfills${resourceNotice}. Target modern ES2020+ browsers in browserslist and load scripts with type="module" or defer.`,
      explanationAgency: `Directly lowers Total Blocking Time (TBT) and improves Interaction to Next Paint (INP).`,
      explanationSaaSTeam: `Eliminates main-thread stutter and polyfill bloat.`,
      remediationCodeSnippet: isReflow
        ? `// Batch DOM reads first, then schedule writes in requestAnimationFrame\nconst height = card.getBoundingClientRect().height;\nrequestAnimationFrame(() => {\n  card.style.minHeight = height + 'px';\n});${flaggedListComment}`
        : `<!-- Serve modern ES modules & target modern browsers in package.json -->\n<script type="module" src="${primaryUrl || "/assets/app.mjs"}"></script>\n\n// package.json\n"browserslist": ["defaults", "not IE 11", "maintained node versions"]${flaggedListComment}`,
      implementationSteps: isReflow
        ? [
            "Read layout measurements (offsetWidth, getBoundingClientRect) before writing inline styles or classes",
            "Wrap visual DOM style updates inside requestAnimationFrame()",
          ]
        : [
            "Update your build targets / browserslist to exclude IE11 and legacy polyfills",
            "Split large third-party scripts with defer or dynamic import()",
          ],
      verificationSteps: [
        "Verify Total Blocking Time (TBT) and INP improve in SpeedPilot",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "MEDIUM",
    };
  }

  // Accessibility & Web Coding Standards (color-contrast, meta-viewport, landmarks, headings, alt, SEO meta)
  if (issueCode === "color-contrast") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Some text colors blend too closely into their background, making words hard to read outdoors or on dimmed mobile screens.`,
      explanationDeveloper: `Text contrast fails WCAG 2.1 AA ratios (must be ≥ 4.5:1 for normal text and ≥ 3:1 for large text)${firstNode?.selector ? ` at '${firstNode.selector}'` : ""}.`,
      explanationAgency: `Essential WCAG / ADA compliance fix that also improves landing page readability.`,
      explanationSaaSTeam: `Update design system CSS tokens so muted text meets AA contrast everywhere.`,
      remediationCodeSnippet: `/* WCAG 2.1 AA Compliant Contrast Variables */\n:root {\n  --text-primary: #111827; /* ≥ 15:1 on white */\n  --text-muted: #4b5563;   /* 7.5:1 on white (avoid #9ca3af on light bg) */\n  --btn-bg: #1d4ed8;\n  --btn-text: #ffffff;     /* 6.7:1 ratio */\n}${firstNode?.snippet ? `\n<!-- Flagged element:\n${firstNode.snippet}\n-->` : ""}`,
      implementationSteps: [
        "Darken muted grey body/caption text on light backgrounds to #4b5563 or darker",
        "Verify every button, badge, and link passes Chrome DevTools Contrast Ratio >= 4.5:1",
      ],
      verificationSteps: ["Re-run SpeedPilot Accessibility audit to clear color-contrast"],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  if (issueCode === "meta-viewport") {
    return {
      detectedStack: techStack,
      explanationMarketer: `The mobile viewport tag disables pinch-to-zoom, preventing visually impaired visitors from zooming in on small text.`,
      explanationDeveloper: `Your <meta name="viewport"> contains 'user-scalable=no' or sets 'maximum-scale' < 5, which fails WCAG zoom requirements.`,
      explanationAgency: `One-line <head> fix that boosts Lighthouse Accessibility score immediately.`,
      explanationSaaSTeam: `Enforce standard responsive viewport declaration in base layout.`,
      remediationCodeSnippet: `<!-- Accessible Responsive Viewport (<head>) -->\n<meta name="viewport" content="width=device-width, initial-scale=1">${firstNode?.snippet ? `\n<!-- Replace flagged tag:\n${firstNode.snippet}\n-->` : ""}`,
      implementationSteps: [
        "Remove user-scalable=no and maximum-scale=1 from <meta name='viewport'>",
        "Use responsive CSS typography (clamp / rem) instead of disabling zoom",
      ],
      verificationSteps: ["Confirm pinch-to-zoom works on mobile and rerun SpeedPilot"],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  if (issueCode === "landmark-one-main" || issueCode === "heading-order" || issueCode === "image-alt" || issueCode === "missing-image-alt") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Missing semantic HTML structure (main landmark, logical headings, or image alt descriptions) hurts both screen-reader users and Google SEO understanding.`,
      explanationDeveloper: `Audit flagged '${issueCode}'${firstNode?.selector ? ` on '${firstNode.selector}'` : ""}. Use semantic HTML5 (<main>, logical <h1>→<h2>→<h3> hierarchy, and descriptive <img alt="...">) per W3C & WCAG standards.`,
      explanationAgency: `Clean semantic HTML fix that improves Accessibility and organic SEO rankings together.`,
      explanationSaaSTeam: `Enforce semantic HTML linting in CI templates.`,
      remediationCodeSnippet: `<!-- Semantic HTML5 Document Structure & Coding Standards -->\n<header><nav aria-label="Primary Navigation">...</nav></header>\n<main id="main-content">\n  <h1>Primary Page Title (One H1 per page)</h1>\n  <section>\n    <h2>Section Heading (Do not skip h1 -> h3)</h2>\n    <img src="${primaryUrl || "/hero.webp"}" alt="Concise description of the image" width="800" height="450">\n  </section>\n</main>\n<footer>...</footer>${firstNode?.snippet ? `\n<!-- Flagged DOM node:\n${firstNode.snippet}\n-->` : ""}`,
      implementationSteps: [
        "Wrap primary page content inside one semantic <main> landmark",
        "Ensure heading levels increase sequentially (h1 -> h2 -> h3) without skipping levels",
        "Add meaningful alt attributes to informative images (use alt=\"\" for purely decorative icons)",
      ],
      verificationSteps: ["Re-run SpeedPilot Accessibility audit to confirm pass"],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  if (issueCode === "document-title" || issueCode === "meta-description") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Missing or weak <title> / <meta name="description"> tags reduce search click-through rates and Google keyword relevance.`,
      explanationDeveloper: `Every indexable page requires a unique <title> (50-60 chars) and <meta name="description"> (120-160 chars) inside <head>.`,
      explanationAgency: `Direct SEO CTR win for client landing pages.`,
      explanationSaaSTeam: `Add page metadata validation in head templates.`,
      remediationCodeSnippet: `<!-- Standard SEO Metadata in <head> -->\n<title>Primary Keyword & Brand Name | Concise Value</title>\n<meta name="description" content="Clear 140-character summary explaining what this page offers and why visitors should click.">`,
      implementationSteps: [
        "Set a unique, descriptive <title> between 50 and 60 characters",
        "Add a compelling <meta name='description'> between 120 and 160 characters",
      ],
      verificationSteps: ["Re-run SpeedPilot SEO audit to verify pass"],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // Default fallback for any other diagnostic issue
  const fallbackTargets = urls.slice(0, 3);
  return {
    detectedStack: techStack,
    explanationMarketer: `SpeedPilot identified an opportunity to optimize '${issueCode}'${savingsNotice}. Resolving this issue improves user responsiveness, coding compliance, and site speed.`,
    explanationDeveloper: `Lighthouse diagnostic flagged '${issueCode}'${resourceNotice}${firstNode?.selector ? ` at selector '${firstNode.selector}'` : ""}. Inspect the flagged resources, apply preloading/caching where applicable, and verify coding standards.`,
    explanationAgency: `Recommended optimization to include in client performance roadmap.`,
    explanationSaaSTeam: `Monitor metric regression in continuous delivery pipeline.`,
    remediationCodeSnippet: fallbackTargets.length
      ? `<!-- Preload critical assets / add Cache-Control or async defer for flagged files -->\n${buildPreloadSnippet(fallbackTargets)}${firstNode?.snippet ? `\n<!-- Flagged element:\n${firstNode.snippet}\n-->` : ""}`
      : firstNode?.snippet
        ? `<!-- Flagged DOM element to fix (${firstNode.selector || issueCode}) -->\n${firstNode.snippet}`
        : `// Review offending resource configuration for '${issueCode}' and optimize loading strategy`,
    implementationSteps: [
      `Inspect the specific flagged resources: ${fallbackTargets.length ? fallbackTargets.join(", ") : issueCode}`,
      "Defer non-critical scripts, preload above-the-fold assets, and verify caching headers",
    ],
    verificationSteps: [
      "Run SpeedPilot audit to verify resolution",
    ],
    estimatedDifficulty: "MEDIUM",
    estimatedImpact: "MEDIUM",
  };
}

