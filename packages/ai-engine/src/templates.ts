import { AIRecommendationOutput, TechStack } from "@speedpilot/shared";
import { detectVendorSignatures, VendorMatch } from "./vendor-intelligence.js";

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

function getVendorFixSnippet(vendors: VendorMatch[], stack: TechStack): string {
  if (!vendors.length || !vendors[0]) return "";
  const v = vendors[0];
  const code =
    stack === "NEXTJS"
      ? v.recommendedRealFix.NEXTJS
      : stack === "WORDPRESS" || stack === "WOOCOMMERCE"
      ? v.recommendedRealFix.WORDPRESS
      : stack === "SHOPIFY"
      ? v.recommendedRealFix.SHOPIFY
      : v.recommendedRealFix.GENERAL;
  return `\n\n// Vendor-Specific Real Fix (${v.vendorName}):\n// ${v.impactDescription}\n${code}`;
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
  const detectedVendors = detectVendorSignatures(urls);
  const vendorSnippet = getVendorFixSnippet(detectedVendors, techStack);

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

  // 1. Render-blocking resources (Lighthouse v10-13)
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
        remediationCodeSnippet: `// Next.js App Router (app/layout.tsx)\n// 1. Use next/font to automatically inline critical font CSS\nimport { Inter } from 'next/font/google';\nconst inter = Inter({ subsets: ['latin'], display: 'swap' });\n\n// 2. Preload non-critical external third-party styles\n<link rel="preload" href="${primaryUrl || "/theme-extra.css"}" as="style" />\n<link rel="stylesheet" href="${primaryUrl || "/theme-extra.css"}" media="print" onLoad="this.media='all'" />${detectedPreloads}${vendorSnippet}`,
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
        explanationMarketer: `Your WordPress theme or plugins are loading heavy styling and script files before the page shows text${savingsNotice}. Visitors on mobile experience a blank screen during this delay.`,
        explanationDeveloper: `Theme and plugin scripts enqueued via wp_enqueue_style/script render synchronously in <head>. In WordPress 6.3+, use native script loading strategies ('strategy' => 'defer' and 'in_footer' => true), enable 'should_load_separate_core_block_assets' to prevent loading all Gutenberg CSS globally, and filter 'style_loader_tag' to asynchronously load non-critical stylesheets.`,
        explanationAgency: `Essential WordPress optimization. Eliminating render-blocking CSS & JS typically recovers ~500-900ms on mobile, lifting PageSpeed into the high green band.`,
        explanationSaaSTeam: `Enforce modern WordPress 6.3+ script loading strategies and critical CSS extraction in theme development.`,
        remediationCodeSnippet: `${contextHeader}${wpPluginNote}// In your child theme's functions.php:

// 1. Modern WP 6.3+ native script loading strategy (defer/async & in_footer):
add_action('wp_enqueue_scripts', function() {
    // Pass strategy => 'defer' so the script downloads in background and executes after HTML parse
    wp_enqueue_script('theme-app', get_stylesheet_directory_uri() . '/js/app.js', array('jquery'), '1.0', array('strategy' => 'defer', 'in_footer' => true));
}, 20);

// 2. Load Gutenberg block CSS ONLY when blocks are actively rendered on page (saves ~150KB):
add_filter('should_load_separate_core_block_assets', '__return_true');

// 3. Asynchronously load non-critical plugin stylesheets without parser blocking:
add_filter('style_loader_tag', function($html, $handle) {
    $async_handles = ['theme-extra', 'contact-form-7', 'woocommerce-general'];
    if (in_array($handle, $async_handles, true)) {
        return str_replace("rel='stylesheet'", "rel='preload' as='style' onload=\\"this.onload=null;this.rel='stylesheet'\\"", $html) . "<noscript>" . $html . "</noscript>";
    }
    return $html;
}, 10, 2);${detectedPreloads}${vendorSnippet}`,
        implementationSteps: [
          "Open your child theme's functions.php or create a custom site-performance plugin",
          "Enable 'should_load_separate_core_block_assets' to stop Gutenberg from loading all block CSS globally",
          "Register custom scripts using the WP 6.3+ native array('strategy' => 'defer', 'in_footer' => true) argument",
          "Filter 'style_loader_tag' to asynchronously load secondary plugin stylesheets",
        ],
        verificationSteps: [
          "Flush WordPress object cache and caching plugins (LiteSpeed / WP Rocket / WP Super Cache)",
          "Inspect DevTools Network panel: verify stylesheets have rel='preload' and scripts execute deferred",
          "Re-run SpeedPilot audit to verify 0ms render-blocking time",
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
        remediationCodeSnippet: `<!-- In layout/theme.liquid: replace standard stylesheet_tag with preload -->\n{{ 'theme.css' | asset_url | stylesheet_tag: preload: true }}\n<link rel="stylesheet" href="{{ 'theme.css' | asset_url }}" media="print" onload="this.media='all'">${detectedPreloads}${vendorSnippet}`,
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

    if (techStack === "LARAVEL") {
      return {
        detectedStack: "LARAVEL",
        explanationMarketer: `Synchronous CSS or JS bundles in your Laravel Blade layout delay initial page display for mobile users${savingsNotice}.`,
        explanationDeveloper: `Render-blocking resources in resources/views/layouts/app.blade.php. Utilize the Laravel Vite plugin with manual chunk splitting in vite.config.js, and load non-critical stylesheets asynchronously.`,
        explanationAgency: `Direct PageSpeed score improvement on Laravel enterprise web apps.`,
        explanationSaaSTeam: `Enforce Vite build optimization in Laravel CI/CD deployment pipelines.`,
        remediationCodeSnippet: `<!-- 1. resources/views/layouts/app.blade.php -->
@vite(['resources/css/app.css', 'resources/js/app.js'])
<link rel="preload" href="${primaryUrl || "{{ asset('css/extra.css') }}"}" as="style">
<link rel="stylesheet" href="${primaryUrl || "{{ asset('css/extra.css') }}"}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${primaryUrl || "{{ asset('css/extra.css') }}"}"></noscript>

// 2. vite.config.js (Vite Manual Chunks)
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({ input: ['resources/css/app.css', 'resources/js/app.js'], refresh: true }),
    ],
    build: {
        rollupOptions: {
            output: { manualChunks: (id) => id.includes('node_modules') ? 'vendor' : undefined },
        },
    },
});${detectedPreloads}${vendorSnippet}`,
        implementationSteps: [
          "Update resources/views/layouts/app.blade.php to load secondary CSS with media='print'",
          "Configure rollupOptions.output.manualChunks in vite.config.js",
          "Run 'npm run build' during deployment",
        ],
        verificationSteps: [
          "Run 'php artisan view:clear && npm run build'",
          "Re-run SpeedPilot audit to verify 0ms render-blocking time",
        ],
        estimatedDifficulty: "EASY",
        estimatedImpact: "HIGH",
      };
    }

    // Default / Custom / React SPA
    return {
      detectedStack: techStack || "CUSTOM",
      explanationMarketer: `Styles and scripts are stopping the browser from showing your page content right away${savingsNotice}.`,
      explanationDeveloper: `Synchronous CSS and JS assets in the <head> block DOM construction. Defer scripts and preload styles.`,
      explanationAgency: `High priority item for core web vitals compliance.`,
      explanationSaaSTeam: `FCP and LCP improvement target.`,
      remediationCodeSnippet: `<!-- Add defer to non-critical scripts & preload styles in <head> -->\n${urls.length ? buildPreloadSnippet(urls) : `<script src="/bundle.js" defer></script>\n<link rel="preload" href="/style.css" as="style" onload="this.onload=null;this.rel='stylesheet'">`}${flaggedListComment}${vendorSnippet}`,
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

  // 2. Third-Party Scripts & Facades (third-party-facades, third-party-summary)
  if (issueCode === "third-party-facades" || (issueCode === "third-party-summary" && detectedVendors.length > 0)) {
    const topVendor = detectedVendors[0];
    const vendorName = topVendor ? topVendor.vendorName : "Third-Party Embed";
    return {
      detectedStack: techStack,
      explanationMarketer: `Heavy third-party widgets (such as ${vendorName}, chat plugins, or video players) load megabytes of scripts before visitors even touch the page${savingsNotice}. Replacing them with an instant preview facade lets the page load 2x faster while keeping full functionality.`,
      explanationDeveloper: `Audit detected heavy third-party assets${resourceNotice}. Static iframes and eager third-party scripts block main thread compilation. Implement the 'Facade Pattern': render an interactive thumbnail/button first, and only initialize the heavy vendor bundle upon user click or scroll.`,
      explanationAgency: `High ROI optimization that typically saves 400KB-1.2MB of JavaScript and cuts Total Blocking Time by 300-700ms.`,
      explanationSaaSTeam: `Prevent external SDKs from polluting the Core Web Vitals budget on marketing and documentation pages.`,
      remediationCodeSnippet: topVendor
        ? `${contextHeader}// Optimized Facade for ${topVendor.vendorName}:\n${
            techStack === "NEXTJS"
              ? topVendor.recommendedRealFix.NEXTJS
              : techStack === "WORDPRESS" || techStack === "WOOCOMMERCE"
              ? topVendor.recommendedRealFix.WORDPRESS
              : techStack === "SHOPIFY"
              ? topVendor.recommendedRealFix.SHOPIFY
              : topVendor.recommendedRealFix.GENERAL
          }${flaggedListComment}`
        : `<!-- Click-to-Load Facade for Third-Party Embeds -->\n<div class="video-facade" style="position:relative;cursor:pointer;" onclick="this.innerHTML='<iframe width=\\'100%\\' height=\\'100%\\' src=\\'${primaryUrl || "https://www.youtube.com/embed/VIDEO_ID"}?autoplay=1\\' allow=\\'autoplay\\' frameborder=\\'0\\' allowfullscreen></iframe>'">\n  <img src="/thumbnail-placeholder.webp" alt="Play media" width="800" height="450" loading="lazy">\n  <button type="button" aria-label="Play" class="play-btn">▶</button>\n</div>${flaggedListComment}`,
      implementationSteps: [
        `Replace eager ${vendorName} embed with a lightweight CSS/image facade`,
        "Only load the heavy third-party script or iframe when the user clicks the trigger or reaches idle",
        "Add preconnect for the third-party domain so it opens fast when activated",
      ],
      verificationSteps: [
        "Check Network panel to confirm third-party script is NOT requested on initial page load",
        "Re-run SpeedPilot audit to verify third-party warnings cleared",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    };
  }

  // 3. Interaction to Next Paint (INP) / Total Blocking Time (TBT) / Long Tasks / Bootup Time
  if (
    issueCode === "interaction-to-next-paint" ||
    issueCode === "inp" ||
    issueCode === "total-blocking-time" ||
    issueCode === "tbt" ||
    issueCode === "long-tasks" ||
    issueCode === "mainthread-work-breakdown" ||
    issueCode === "bootup-time"
  ) {
    const isNext = techStack === "NEXTJS";
    const snippet = isNext
      ? `// Next.js: Yield main thread during heavy calculations & use startTransition
import { useState, useTransition } from 'react';

// 1. Chunk long loops with scheduler.yield() or requestIdleCallback
async function processLargeData(items: any[]) {
  for (let i = 0; i < items.length; i++) {
    // Process item
    doWork(items[i]);
    // Yield every 50 items to keep UI responsive to clicks/taps
    if (i % 50 === 0 && 'scheduler' in window && 'yield' in (window as any).scheduler) {
      await (window as any).scheduler.yield();
    }
  }
}

// 2. Wrap state updates that cause heavy re-renders in startTransition
export function SearchFilter() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep input responsive immediately
    setQuery(e.target.value);
    // Defer costly list filtering
    startTransition(() => {
      filterMassiveList(e.target.value);
    });
  };
  return <input value={query} onChange={handleChange} />;
}`
      : `// JavaScript: Break up long tasks (> 50ms) using scheduler.yield() or setTimeout
async function yieldToMain() {
  if ('scheduler' in window && 'yield' in (window as any).scheduler) {
    return await (window as any).scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Chunk heavy operations so the browser can process clicks & scrolls
async function runChunkedTask(items) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);
    if (i % 40 === 0) {
      await yieldToMain(); // Yields execution back to browser main thread
    }
  }
}

// Add passive flag to scroll/touch event listeners
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('touchstart', onTouch, { passive: true });`;

    return {
      detectedStack: techStack,
      explanationMarketer: `When users tap buttons, menus, or links, the site freezes or lags before responding${savingsNotice}. Google's Core Web Vitals metric (INP) directly tracks this responsiveness, and sluggish pages get penalized in search rankings.`,
      explanationDeveloper: `Long tasks exceeding 50ms monopolize the browser's main execution thread${resourceNotice}. Heavy synchronous JavaScript loops, un-debounced input handlers, or large DOM re-renders prevent the browser from responding to user inputs promptly. Yield to the main thread with scheduler.yield() or useTransition.`,
      explanationAgency: `Direct INP Core Web Vitals compliance. Moving INP from poor (> 500ms) to good (< 200ms) eliminates customer bounce during navigation.`,
      explanationSaaSTeam: `Prevents main thread locking during dashboard hydration and rich user input interactions.`,
      remediationCodeSnippet: `${contextHeader}${snippet}${flaggedListComment}${vendorSnippet}`,
      implementationSteps: [
        "Identify long tasks in Chrome DevTools Performance tab (tasks highlighted with red triangles > 50ms)",
        "Break up large JavaScript loops by yielding with scheduler.yield() or setTimeout(..., 0)",
        "Wrap non-urgent React state updates inside React.startTransition or useDeferredValue",
        "Add { passive: true } to all wheel, scroll, and touch event handlers",
      ],
      verificationSteps: [
        "Interact with buttons/inputs in DevTools with 4x CPU throttling and verify INP < 200ms",
        "Re-run SpeedPilot audit to confirm Total Blocking Time (TBT) < 200ms",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    };
  }

  // 4. Server Response Time (TTFB / Time to First Byte)
  if (issueCode === "server-response-time" || issueCode === "time-to-first-byte" || issueCode === "ttfb") {
    const isWp = techStack === "WORDPRESS" || techStack === "WOOCOMMERCE";
    const isNext = techStack === "NEXTJS";
    const isLaravel = techStack === "LARAVEL";
    const isShopify = techStack === "SHOPIFY";

    let snippet = "";
    if (isNext) {
      snippet = `// Next.js 15: Partial Prerendering (PPR) & Streaming SSR for near-instant TTFB
// 1. In next.config.mjs:
export default {
  experimental: {
    ppr: 'incremental', // Serves static shell instantly (< 50ms) from edge CDN
  },
  compress: true,
  poweredByHeader: false,
};

// 2. In app/page.tsx:
import { Suspense } from 'react';
import { StaticHero } from '@/components/StaticHero';
import { DynamicUserBadge, BadgeSkeleton } from '@/components/DynamicUserBadge';

export const experimental_ppr = true;

export default function Page() {
  return (
    <main>
      {/* Static hero shell is cached and served immediately (< 50ms TTFB): */}
      <StaticHero />

      {/* Dynamic user state streams in asynchronously without delaying first byte: */}
      <Suspense fallback={<BadgeSkeleton />}>
        <DynamicUserBadge />
      </Suspense>
    </main>
  );
}`;
    } else if (techStack === "WOOCOMMERCE") {
      snippet = `// WooCommerce Database & Query TTFB Optimization (wp-config.php & functions.php):
// 1. In wp-config.php - Enable Redis Object Cache:
define('WP_CACHE', true);
define('WP_REDIS_HOST', '127.0.0.1');
define('WP_REDIS_PORT', 6379);

// 2. Cache expensive product subcategory transients in functions.php:
add_filter('woocommerce_product_subcategories_args', function($args) {
    $args['cache_results'] = true;
    return $args;
});

// 3. MySQL / phpMyAdmin: Add composite index to wp_postmeta to prevent full table scans:
// ALTER TABLE wp_postmeta ADD INDEX post_id_meta_key (post_id, meta_key(191));

# 4. In .htaccess - Bypass cache for active carts, cache for guests:
<IfModule mod_headers.c>
  Header set Cache-Control "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" "expr=%{REQUEST_METHOD} == 'GET' && %{HTTP_COOKIE} !~ /woocommerce_items_in_cart|wordpress_logged_in/"
</IfModule>`;
    } else if (isWp) {
      snippet = `// 1. In wp-config.php - Enable Redis Object Cache & limit revision bloat:
define('WP_CACHE', true);
define('WP_POST_REVISIONS', 5); // Prevents unlimited post revisions from bloating wp_posts
define('EMPTY_TRASH_DAYS', 7);
define('WP_REDIS_HOST', '127.0.0.1');
define('WP_REDIS_PORT', 6379);

// 2. Autoload options health check in MySQL / phpMyAdmin:
// If autoloaded options > 800KB, it adds 200-800ms to every single page request:
// SELECT option_name, length(option_value) FROM wp_options WHERE autoload = 'yes' ORDER BY length(option_value) DESC LIMIT 15;

# 3. Apache (.htaccess) / LiteSpeed Cache Rules for Anonymous Guests:
<IfModule mod_headers.c>
  # Cache public GET requests at CDN/browser edge, bypass for logged-in users & active cart
  Header set Cache-Control "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" "expr=%{REQUEST_METHOD} == 'GET' && %{HTTP_COOKIE} !~ /wordpress_logged_in|woocommerce_items_in_cart/"
</IfModule>`;
    } else if (isLaravel) {
      snippet = `// Laravel Performance & TTFB Optimization:
// 1. In deployment pipeline (CI/CD):
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

// 2. Eliminate N+1 SQL queries with Eloquent Eager Loading (app/Http/Controllers/PostController.php):
$posts = Post::with(['author', 'tags'])
    ->select(['id', 'title', 'slug', 'author_id', 'created_at'])
    ->paginate(15);

// 3. Cache frequent queries in Redis:
$stats = Cache::remember('site.stats', 3600, function () {
    return DB::table('orders')->count();
});`;
    } else if (isShopify) {
      snippet = `<!-- Shopify Liquid Performance Optimization (Liquid TTFB Reduction) -->
<!-- 1. Avoid unpaginated, deep loops in collection templates (sections/main-collection.liquid) -->
{% paginate collection.products by 24 %}
  <div class="product-grid">
    {% for product in collection.products %}
      {% render 'product-card', product: product %}
    {% endfor %}
  </div>
  {% if paginate.pages > 1 %}
    {% render 'pagination', paginate: paginate %}
  {% endif %}
{% endpaginate %}

<!-- 2. Avoid synchronous app snippets in layout/theme.liquid that halt Liquid rendering -->
<!-- Move heavy external review/upsell widgets into dynamic section blocks loaded via JavaScript -->`;
    } else {
      snippet = `# Origin Server & CDN Cache Rule (Cloudflare / Fastly / Nginx)
# Send modern Cache-Control headers for anonymous HTML requests:
Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400

# Nginx FastCGI / Proxy Cache:
fastcgi_cache_path /var/cache/nginx levels=1:2 keys_zone=PAGECACHE:100m inactive=60m;
fastcgi_cache PAGECACHE;
fastcgi_cache_valid 200 301 302 60m;
add_header X-Cache-Status $upstream_cache_status;`;
    }

    return {
      detectedStack: techStack,
      explanationMarketer: `Your web server takes too long to respond with the first piece of data${savingsNotice}. Every other asset (images, fonts, scripts) is delayed until the server answers. Faster servers make the whole site snap open.`,
      explanationDeveloper: `High Time to First Byte (TTFB)${resourceNotice}. Root causes: uncached dynamic server rendering, slow database queries, lack of edge CDN caching, or remote origin hosting without geo-replication. Implement full-page edge caching (s-maxage) and database connection pooling.`,
      explanationAgency: `Critical foundation. High TTFB ruins all downstream performance metrics (FCP, LCP). Caching the HTML at the CDN edge brings TTFB down from 1500ms to < 100ms.`,
      explanationSaaSTeam: `Optimize server infrastructure and database indexing to hit the p75 TTFB SLA (< 800ms).`,
      remediationCodeSnippet: `${contextHeader}${snippet}${flaggedListComment}`,
      implementationSteps: [
        "Deploy edge CDN caching (Cloudflare Cache Rules / Fastly / Vercel Edge) so anonymous visitors get cached HTML in < 150ms",
        "Enable database connection pooling and add indexes to slow un-indexed SQL queries",
        techStack === "NEXTJS"
          ? "Switch heavy dynamic server components to ISR (export const revalidate = 60)"
          : techStack === "LARAVEL"
          ? "Run 'php artisan route:cache && php artisan config:cache' and eliminate Eloquent N+1 queries with eager loading"
          : techStack === "SHOPIFY"
          ? "Ensure all Liquid collections use {% paginate %} and defer heavy third-party app embeds"
          : "Enable Redis Object Caching and full-page cache in your server stack",
      ],
      verificationSteps: [
        "Run 'curl -I -o /dev/null -s -w 'TTFB: %{time_starttransfer}s\n' https://your-domain.com' and confirm < 0.3s",
        "Re-run SpeedPilot audit to verify server-response-time passes",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    };
  }

  // 5. Text Compression (Gzip / Brotli)
  if (issueCode === "uses-text-compression") {
    const encoding = ctx?.responseHeaders?.contentEncoding;
    return {
      detectedStack: techStack,
      explanationMarketer: `Text assets (HTML, CSS, JavaScript, and SVG) are being delivered without compression${savingsNotice}, using 4x more cellular data and slowing down downloads.`,
      explanationDeveloper: `Assets are served with 'content-encoding: ${encoding || "none"}' instead of 'br' (Brotli) or 'gzip'${resourceNotice}. Brotli compresses text payloads 15-25% smaller than Gzip. Enable Brotli compression on your web server or CDN.`,
      explanationAgency: `Zero-risk configuration change that immediately cuts total page weight by 50-70% and boosts FCP.`,
      explanationSaaSTeam: `Bandwidth reduction and CDN egress cost optimization.`,
      remediationCodeSnippet: `${contextHeader}# Nginx Configuration (/etc/nginx/nginx.conf):
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/javascript application/json image/svg+xml application/xml;

# Enable Brotli (if ngx_brotli module installed):
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/javascript application/json image/svg+xml application/xml;

# Apache (.htaccess) Configuration:
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json image/svg+xml
</IfModule>${flaggedListComment}`,
      implementationSteps: [
        "Enable Gzip / Brotli compression in web server config (Nginx, Apache, or Caddy)",
        "If using Cloudflare, go to Speed -> Optimization -> Brotli and ensure it is toggled ON",
        techStack === "NEXTJS" ? "Ensure compress: true is enabled in next.config.mjs (default is true)" : "Verify mod_deflate is active in Apache",
      ],
      verificationSteps: [
        "Inspect response headers in DevTools Network tab: verify 'Content-Encoding: br' or 'gzip'",
        "Re-run SpeedPilot audit to confirm uses-text-compression passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // 6. Network dependency tree / Preconnect / Preload / Prefetch hints
  if (
    issueCode === "network-dependency-tree-insight" ||
    issueCode === "uses-rel-preconnect" ||
    issueCode === "uses-rel-preload" ||
    issueCode === "critical-request-chains"
  ) {
    const preconnectTags = buildPreconnectSnippet(origins);
    const preloadTags = urls.length ? buildPreloadSnippet(urls) : `<link rel="preload" href="/css/critical.css" as="style">\n<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>`;
    const isWp = techStack === "WORDPRESS" || techStack === "WOOCOMMERCE";
    const wpResourceHintSnippet = isWp
      ? `\n\n// WordPress Native Resource Hints (in functions.php):
add_filter('wp_resource_hints', function($urls, $relation_type) {
    if ('preconnect' === $relation_type) {
${origins.length ? origins.map((o) => `        $urls[] = array('href' => '${o}', 'crossorigin' => 'anonymous');`).join("\n") : "        $urls[] = array('href' => 'https://fonts.gstatic.com', 'crossorigin' => 'anonymous');"}
    }
    return $urls;
}, 10, 2);`
      : "";

    return {
      detectedStack: techStack,
      explanationMarketer: `Your page waits through a chain of serial server round-trips before loading key scripts, fonts, and styles${savingsNotice}. Adding early browser hints lets the browser connect and download critical files right away.`,
      explanationDeveloper: `Deep critical request chains or unhinted third-party origins delay First Contentful Paint and LCP${resourceNotice}. In WordPress, use the native 'wp_resource_hints' filter hook to dispatch preconnect tags cleanly, alongside preloading critical assets.`,
      explanationAgency: `Immediate low-risk <head> fix that cuts 200-800ms of TLS/DNS waterfall delay across third-party CDNs and font hosts.`,
      explanationSaaSTeam: `Trim serial dependency chains in index.html / functions.php to stabilize p75 LCP on mobile connections.`,
      remediationCodeSnippet: `<!-- 1. Preconnect early to critical third-party origins in <head> -->
${preconnectTags}

<!-- 2. Preload critical files needed immediately on THIS page -->
${preloadTags}

<!-- 3. Prefetch likely NEXT-page routes or bundles at idle time (optional) -->
<link rel="prefetch" href="/about" as="document">${wpResourceHintSnippet}

# 4. HTTP 103 Early Hints (Dispatched by Cloudflare / Nginx during backend TTFB wait):
# Link: </css/critical.css>; rel=preload; as=style
# Link: </fonts/main.woff2>; rel=preload; as=font; crossorigin${flaggedListComment}`,
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

  // 7. Font display / Webfont optimization (Lighthouse 13 font-display-insight)
  if (issueCode === "font-display-insight" || issueCode === "font-display") {
    const fontUrls = urls.filter((u) => /\.(woff2?|ttf|otf)(\?|$)/i.test(u));
    const fontPreloads = fontUrls.length
      ? buildPreloadSnippet(fontUrls)
      : `<link rel="preload" href="/fonts/primary-400.woff2" as="font" type="font/woff2" crossorigin>`;
    const isNext = techStack === "NEXTJS";
    const snippet = isNext
      ? `// Next.js: Self-host Google/Custom Fonts with next/font to eliminate FOIT & Layout Shift
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: true, // Automatically calculates size-adjust & ascent-override to eliminate CLS!
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}`
      : `<!-- 1. Preload primary WOFF2 font in <head> (crossorigin is required even on same origin) -->
${fontPreloads}

<!-- 2. CSS @font-face with font-display: swap & Metric Overrides to eliminate Layout Shifts (CLS) -->
<style>
/* Primary Web Font */
@font-face {
  font-family: 'PrimaryBrandFont';
  src: url('${fontUrls[0] || "/fonts/primary-400.woff2"}') format('woff2');
  font-display: swap;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
  size-adjust: 107%;
}

/* Fallback Font adjusted to match Primary Web Font geometry exactly */
@font-face {
  font-family: 'FallbackFont';
  src: local('Arial');
  ascent-override: 90.49%;
  descent-override: 22.48%;
  line-gap-override: 0%;
  size-adjust: 107.64%;
}

body {
  font-family: 'PrimaryBrandFont', 'FallbackFont', sans-serif;
}
</style>`;

    return {
      detectedStack: techStack,
      explanationMarketer: `Visitors see invisible text (Flash of Invisible Text) while custom fonts finish downloading${savingsNotice}. Showing a crisp fallback font immediately keeps users reading right away.`,
      explanationDeveloper: `Web fonts load without 'font-display: swap' or early preloading${resourceNotice}, hiding text until the font file finishes downloading.`,
      explanationAgency: `Quick CSS + <head> upgrade that eliminates blank-text delays and recovers ~100-300ms FCP.`,
      explanationSaaSTeam: `Standardize @font-face policies across design system typography tokens.`,
      remediationCodeSnippet: `${contextHeader}${snippet}${flaggedListComment}`,
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

  // 8. Cache lifetimes (Lighthouse 13 cache-insight & uses-long-cache-ttl)
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

  // 9. Efficient Animated Content (GIF to WebM/MP4)
  if (issueCode === "efficient-animated-content") {
    const gifTarget = primaryUrl || "/animations/product-demo.gif";
    const webmTarget = gifTarget.replace(/\.gif(\?|$)/i, ".webm$1");
    const mp4Target = gifTarget.replace(/\.gif(\?|$)/i, ".mp4$1");
    return {
      detectedStack: techStack,
      explanationMarketer: `Animated GIFs are massively inefficient, often 5MB to 20MB each. Converting GIFs to silent looping video cuts the file size by 90% while looking identical.`,
      explanationDeveloper: `Large animated GIF at '${gifTarget}' wastes network transfer and CPU decode cycles. Replace <img> GIF with an HTML5 <video autoplay loop muted playsinline> serving WebM and MP4 formats.`,
      explanationAgency: `Major bandwidth optimization. Drops page weight by 5-15MB with identical visual fidelity.`,
      explanationSaaSTeam: `Enforce modern video formats over animated GIFs in CMS asset ingestion guidelines.`,
      remediationCodeSnippet: `${contextHeader}<!-- Replace heavy animated GIF with efficient looping HTML5 video -->
<video
  autoplay
  loop
  muted
  playsinline
  width="800"
  height="450"
  poster="${gifTarget.replace(/\.gif(\?|$)/i, "-poster.webp$1")}"
  class="w-full h-auto rounded-lg"
>
  <source src="${webmTarget}" type="video/webm">
  <source src="${mp4Target}" type="video/mp4">
  <!-- Fallback text -->
  Your browser does not support HTML5 video.
</video>

# FFmpeg Command to convert GIF to WebM & MP4:
# ffmpeg -i input.gif -c:v libvpx-vp9 -b:v 0 -crf 30 output.webm
# ffmpeg -i input.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" output.mp4${flaggedListComment}`,
      implementationSteps: [
        "Convert the animated GIF to WebM (for modern browsers) and MP4 (for Safari/iOS) using FFmpeg or an online converter",
        "Replace the <img> tag with <video autoplay loop muted playsinline>",
        "Include width, height, and poster attributes to prevent layout shift",
      ],
      verificationSteps: [
        "Inspect Network panel to verify video stream transfers under 500KB instead of 5MB+",
        "Re-run SpeedPilot audit to verify efficient-animated-content passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // 10. Modern image formats, responsive sizing & LCP image delivery
  if (
    issueCode === "modern-image-formats" ||
    issueCode === "uses-optimized-images" ||
    issueCode === "uses-responsive-images" ||
    issueCode === "image-delivery-insight" ||
    issueCode === "offscreen-images"
  ) {
    const imgTarget = primaryUrl || "/images/hero-banner.jpg";
    const isNext = techStack === "NEXTJS";
    const isWp = techStack === "WORDPRESS" || techStack === "WOOCOMMERCE";
    const isShopify = techStack === "SHOPIFY";

    let codeSnippet = "";
    if (isNext) {
      codeSnippet = `// Next.js: Modern Responsive Image with AVIF/WebP and automatic sizing
import Image from 'next/image';

export function ResponsiveHero() {
  return (
    <div className="relative w-full aspect-[16/9] overflow-hidden">
      <Image
        src="${imgTarget}"
        alt="Descriptive hero image alt text"
        fill
        priority // Add priority ONLY if this is the above-the-fold LCP image!
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
        className="object-cover"
      />
    </div>
  );
}

// In next.config.mjs:
export default {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
};`;
    } else if (isWp) {
      codeSnippet = `// WordPress Image Optimization (WebP / AVIF & Responsive Sizes)
// 1. LiteSpeed Cache / WebP Express: Enable WebP Replacement in Admin -> Media
// 2. Ensure responsive image generation in functions.php:
add_theme_support('post-thumbnails');
add_image_size('hero-desktop', 1440, 810, true);
add_image_size('hero-mobile', 480, 270, true);

<!-- Responsive HTML output -->
<picture>
  <source type="image/avif" srcset="/img/hero-mobile.avif 480w, /img/hero-desktop.avif 1440w" sizes="(max-width: 768px) 100vw, 1440px">
  <source type="image/webp" srcset="/img/hero-mobile.webp 480w, /img/hero-desktop.webp 1440w" sizes="(max-width: 768px) 100vw, 1440px">
  <img src="${imgTarget}" alt="Optimized Hero" width="1440" height="810" loading="lazy" decoding="async">
</picture>`;
    } else if (isShopify) {
      codeSnippet = `<!-- Shopify Liquid: Serve modern responsive format with image_url filters -->
{{ section.settings.image | image_url: width: 1440 | image_tag:
  loading: 'lazy',
  decoding: 'async',
  widths: '375, 550, 750, 1100, 1440',
  sizes: '(max-width: 768px) 100vw, 1440px',
  alt: section.settings.image.alt | escape
}}`;
    } else {
      codeSnippet = `<!-- Modern Responsive Picture Tag (AVIF + WebP fallback) -->
<picture>
  <source
    type="image/avif"
    srcset="/img/hero-480.avif 480w, /img/hero-960.avif 960w, /img/hero-1440.avif 1440w"
    sizes="(max-width: 768px) 100vw, 1200px"
  />
  <source
    type="image/webp"
    srcset="/img/hero-480.webp 480w, /img/hero-960.webp 960w, /img/hero-1440.webp 1440w"
    sizes="(max-width: 768px) 100vw, 1200px"
  />
  <img
    src="${imgTarget}"
    alt="Descriptive alt text"
    width="1200"
    height="675"
    loading="lazy"
    decoding="async"
  />
</picture>`;
    }

    return {
      detectedStack: techStack,
      explanationMarketer: `Images on the page are larger than needed or stored in older formats (PNG/JPEG) instead of modern WebP/AVIF${savingsNotice}. Shrinking them makes pages snap open on mobile.`,
      explanationDeveloper: `Oversized or unoptimized raster images${resourceNotice} increase network payload. Serve appropriately sized WebP/AVIF versions with srcset, explicit width/height, and lazy-load offscreen images.`,
      explanationAgency: `Quick win for client sites. Compressing and modernizing images frequently cuts page weight by 50-80%.`,
      explanationSaaSTeam: `Bandwidth reduction and CDN egress cost optimization.`,
      remediationCodeSnippet: `${contextHeader}${codeSnippet}${firstNode?.snippet ? `\n<!-- Flagged DOM element:\n${firstNode.snippet}\n-->` : ""}${flaggedListComment}`,
      implementationSteps: [
        "Batch convert existing JPEG/PNG assets to WebP/AVIF format",
        "Implement <picture> element or modern image component with width/height attributes to prevent CLS",
        "Add loading='lazy' attribute to below-the-fold images (keep loading='eager' ONLY on the above-the-fold hero image)",
      ],
      verificationSteps: [
        "Check network tab to confirm images transfer in WebP/AVIF format",
        "Run SpeedPilot audit to verify image format pass",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "MEDIUM",
    };
  }

  // 10. Largest Contentful Paint (LCP) & Lighthouse 13 lcp-breakdown-insight
  if (
    issueCode === "largest-contentful-paint" ||
    issueCode === "largest-contentful-paint-element" ||
    issueCode === "lcp-breakdown-insight" ||
    issueCode === "prioritize-lcp-image" ||
    issueCode === "lcp-lazy-loaded" ||
    issueCode === "lcp"
  ) {
    const lcpHref = primaryUrl || "/hero-banner.webp";
    const isNext = techStack === "NEXTJS";
    const isWp = techStack === "WORDPRESS" || techStack === "WOOCOMMERCE";
    const isShopify = techStack === "SHOPIFY";
    const isLaravel = techStack === "LARAVEL";

    let snippet = "";
    if (isNext) {
      snippet = `// Next.js: Fix LCP on hero image in app/page.tsx
import Image from 'next/image';

export function HeroSection() {
  return (
    <div className="relative w-full h-[500px]">
      <Image
        src="${lcpHref}"
        alt="Hero banner"
        fill
        priority // Crucial: forces high fetchpriority and injects <link rel="preload"> in <head>
        fetchPriority="high"
        sizes="100vw"
        className="object-cover"
      />
    </div>
  );
}`;
    } else if (isWp) {
      snippet = `// In your theme's functions.php (WordPress 6.3+ LCP Optimization):

// 1. Preload post thumbnail in <head> for singular pages:
add_action('wp_head', function() {
    if (is_singular() && has_post_thumbnail()) {
        $img_src = get_the_post_thumbnail_url(get_the_ID(), 'full');
        if ($img_src) {
            echo '<link rel="preload" as="image" href="' . esc_url($img_src) . '" fetchpriority="high">' . "\\n";
        }
    }
}, 1);

// 2. In single.php or header template: Ensure hero image NEVER lazy-loads:
the_post_thumbnail('full', array(
    'loading'       => 'eager',
    'fetchpriority' => 'high',
    'decoding'      => 'async',
));

// 3. Enable modern WebP / AVIF image output conversion (WP 6.5+):
add_filter('image_editor_output_format', function($formats) {
    $formats['image/jpeg'] = 'image/webp';
    $formats['image/png']  = 'image/webp';
    return $formats;
});`;
    } else if (isShopify) {
      snippet = `<!-- Shopify Liquid 2.0: Optimize Hero / LCP Image -->
<!-- 1. In layout/theme.liquid <head>: Preload hero image if on index or product page -->
{% if template == 'index' and section.settings.image %}
  <link rel="preload" as="image" href="{{ section.settings.image | image_url: width: 1440 }}" fetchpriority="high">
{% endif %}

<!-- 2. In sections/hero-banner.liquid: Use image_tag with preload: true and fetchpriority: 'high' -->
{{ section.settings.image | image_url: width: 1440 | image_tag:
  preload: true,
  fetchpriority: 'high',
  loading: 'eager',
  decoding: 'async',
  widths: '375, 550, 750, 1100, 1440',
  sizes: '100vw',
  alt: section.settings.image.alt | default: shop.name | escape
}}`;
    } else if (isLaravel) {
      snippet = `<!-- 1. resources/views/layouts/app.blade.php (<head>): Preload LCP Hero -->
<link rel="preload" as="image" href="{{ asset('${lcpHref}') }}" fetchpriority="high">

<!-- 2. Hero Component (resources/views/components/hero.blade.php) -->
<img
  src="{{ asset('${lcpHref}') }}"
  alt="{{ $title ?? 'Hero banner' }}"
  fetchpriority="high"
  loading="eager"
  decoding="async"
  width="1200"
  height="600"
  class="w-full h-auto object-cover"
>`;
    } else {
      snippet = `<!-- 1. In HTML <head>: High-Priority Preload LCP Asset -->
<link rel="preload" as="image" href="${lcpHref}" fetchpriority="high">

<!-- 2. On your Hero / LCP <img> Tag: NEVER lazy-load above the fold -->
<img
  src="${lcpHref}"
  alt="Hero"
  fetchpriority="high"
  loading="eager"
  decoding="async"
  width="1200"
  height="600"
>`;
    }

    return {
      detectedStack: techStack,
      explanationMarketer: `The largest visual element on the page (usually your hero image or main headline) takes too long to appear${savingsNotice}. Speeding this up makes the site feel instant and boosts Google rankings.`,
      explanationDeveloper: `LCP element suffers from high TTFB, resource load delay, or render delay${resourceNotice}${firstNode?.selector ? ` (${firstNode.selector})` : ""}. Preload the LCP asset in <head> with fetchpriority="high" and never apply loading="lazy" to above-the-fold hero media.`,
      explanationAgency: `Google Core Web Vitals ranking factor. Keeping LCP under 2.5 seconds passes the official search ranking threshold.`,
      explanationSaaSTeam: `Critical conversion metric. B2B and e-commerce conversions jump when LCP is under 2.0s.`,
      remediationCodeSnippet: `${contextHeader}${snippet}${firstNode?.snippet ? `\n<!-- Flagged LCP node:\n${firstNode.snippet}\n-->` : ""}${flaggedListComment}`,
      implementationSteps: [
        "Identify the LCP node in audit evidence (hero image or primary heading)",
        `Add <link rel="preload" as="image" href="${lcpHref}" fetchpriority="high"> in <head>`,
        "Set loading='eager' and fetchpriority='high' directly on the hero <img> tag (remove loading='lazy')",
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

  // 11. Cumulative Layout Shift (CLS)
  if (issueCode === "cumulative-layout-shift" || issueCode === "layout-shifts" || issueCode === "layout-shift-elements" || issueCode === "cls") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Elements jump around unexpectedly while the page loads (like banners or images popping in late). This frustrates users and causes accidental misclicks.`,
      explanationDeveloper: `Images, ads, or dynamic iframes render without explicit width and height aspect ratios, causing browser reflows when resources finish loading. Reserve dimensional boxes via CSS aspect-ratio or contain-intrinsic-size.`,
      explanationAgency: `Easy Core Web Vitals win. Eliminating layout shifts brings CLS to ≤ 0.05, well within Google's 'Good' threshold.`,
      explanationSaaSTeam: `Fixes jarring visual glitches during landing page customer onboarding.`,
      remediationCodeSnippet: `/* 1. CSS Aspect Ratio Container Reservation */
.hero-image-wrapper {
  aspect-ratio: 16 / 9;
  width: 100%;
  background-color: #f4f4f5; /* Lightweight placeholder prevents jarring shift */
}

/* 2. Dynamic Ad or Banner Container Reservation */
.ad-slot-placeholder {
  min-height: 250px;
  width: 100%;
  display: block;
}

<!-- 3. Explicit Dimensions in HTML Elements -->
<img src="${primaryUrl || "/banner.webp"}" width="1200" height="675" style="width:100%; height:auto;" alt="Banner">
${firstNode?.snippet ? `\n<!-- Flagged Shift Element:\n${firstNode.snippet}\n-->` : ""}`,
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

  // 12. Non-composited animations (avoid layout thrashing during animations)
  if (issueCode === "non-composited-animations" || issueCode === "unsupported-animation-keyframes") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Animations or smooth transitions on the page stutter and feel choppy on mobile phones because they force the browser to recalculate element sizes on every frame.`,
      explanationDeveloper: `CSS animations or transitions animate non-composited properties (e.g. 'top', 'left', 'width', 'height', 'margin')${firstNode?.selector ? ` on '${firstNode.selector}'` : ""}. This triggers browser layout recalculations and repaint on every frame. Restructure animations to use compositor-only properties: 'transform' (translate/scale/rotate) and 'opacity'.`,
      explanationAgency: `Eliminates UI jank and frame drops, delivering 60fps/120fps fluid mobile animations.`,
      explanationSaaSTeam: `Audit design system animation keyframes to ensure GPU compositor compliance.`,
      remediationCodeSnippet: `${contextHeader}/* BAD: Animates layout properties, forcing continuous reflows */
/*
.fly-in {
  left: -100px;
  transition: left 0.3s ease-out;
}
.fly-in.active {
  left: 0;
}
*/

/* GOOD: Uses GPU-composited transform and will-change */
.fly-in {
  transform: translate3d(-100px, 0, 0);
  opacity: 0;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out;
  will-change: transform, opacity;
}
.fly-in.active {
  transform: translate3d(0, 0, 0);
  opacity: 1;
}
${firstNode?.snippet ? `\n<!-- Flagged animated element:\n${firstNode.snippet}\n-->` : ""}${flaggedListComment}`,
      implementationSteps: [
        "Audit CSS keyframes and transitions for 'top', 'left', 'right', 'bottom', 'width', 'height', or 'margin'",
        "Replace positional transitions with transform: translate3d(x, y, 0)",
        "Add will-change: transform, opacity to animated elements so the browser promotes them to dedicated GPU layers",
      ],
      verificationSteps: [
        "Check Chrome DevTools Performance panel: verify animations show zero 'Layout' or 'Paint' tasks during animation timeline",
        "Re-run SpeedPilot audit to verify non-composited-animations passes",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    };
  }

  // 13. Unused JavaScript / Code-Splitting
  if (issueCode === "unused-javascript") {
    const jsList = urls.slice(0, 4);
    const thirdPartyNote = thirdParty.length
      ? `\n\n<!-- 3rd-party scripts (${thirdParty.length}) -> Load lazily or after user interaction -->\n${thirdParty.slice(0, 3).map((u) => `<script src="${u}" defer></script>`).join("\n")}`
      : "";
    const isWp = techStack === "WORDPRESS" || techStack === "WOOCOMMERCE";
    const firstPartyFix =
      isLiteSpeed
        ? `/* LiteSpeed Cache Detected: Page Optimization -> JS Settings:\n   - Enable 'Load JS Deferred' (Delayed) to stop unused JS from blocking initial paint */\n`
        : techStack === "NEXTJS"
        ? `// Next.js: Dynamic-import heavy client components & use next/script strategy="lazyOnload"\nimport dynamic from 'next/dynamic';\nimport Script from 'next/script';\n\n// Defer heavy modal, chart, or rich-text editor components until rendered:\nconst HeavyChart = dynamic(() => import('@/components/HeavyChart'), {\n  ssr: false,\n  loading: () => <div className="h-64 animate-pulse bg-muted rounded" />,\n});\n`
        : isWp
        ? `// In functions.php (WordPress & WooCommerce Asset Stripping):
// 1. Dequeue WooCommerce Cart Fragments & store scripts on non-shop pages:
add_action('wp_enqueue_scripts', function() {
    if (function_exists('is_woocommerce') && !is_woocommerce() && !is_cart() && !is_checkout() && !is_account_page()) {
        wp_dequeue_script('wc-cart-fragments'); // Eliminates uncached ?wc-ajax=get_refreshed_fragments call
        wp_dequeue_script('woocommerce');
        wp_dequeue_script('js-cookie');
    }
}, 99);

// 2. Disable core emoji detection script & frontend Heartbeat API polling:
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
add_action('init', function() {
    if (!is_admin()) {
        wp_deregister_script('heartbeat');
    }
}, 1);\n`
        : techStack === "LARAVEL"
        ? `// vite.config.js (Laravel Vite Plugin - Code Splitting & Manual Chunks)
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
  plugins: [
    laravel({ input: ['resources/css/app.css', 'resources/js/app.js'], refresh: true }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('alpinejs') || id.includes('axios')) return 'vendor-core';
            return 'vendor-libs';
          }
        },
      },
    },
  },
});\n`
        : techStack === "SHOPIFY"
        ? `<!-- Shopify Theme App Extension / Asset Deferral -->
<!-- 1. In layout/theme.liquid: Defer non-critical apps and cart drawer scripts -->
<script src="{{ 'cart-drawer.js' | asset_url }}" defer="defer"></script>

<!-- 2. Debounce cart drawer updates to prevent unneeded JS execution on every keystroke -->
<script>
  let debounceTimer;
  function updateCartQuantity(line, qty) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: line, quantity: qty })
      }).then(res => res.json()).then(cart => updateCartDrawerUI(cart));
    }, 300);
  }
</script>\n`
        : techStack === "REACT"
        ? `// React SPA / Vite: Code-splitting with React.lazy and Suspense
import React, { Suspense, lazy } from 'react';

// Route-based or heavy component code splitting:
const HeavyChart = lazy(() => import('./components/HeavyChart'));

export function Dashboard() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
      <HeavyChart />
    </Suspense>
  );
}\n`
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
      remediationCodeSnippet: `${contextHeader}${firstPartyFix}${jsDeferTags}${thirdPartyNote}${flaggedListComment}${vendorSnippet}`,
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

  // 13. Unused/Unminified CSS
  if (issueCode === "unused-css-rules" || issueCode === "unminified-css" || issueCode === "unminified-javascript") {
    const isCss = issueCode !== "unminified-javascript";
    const isWp = techStack === "WORDPRESS" || techStack === "WOOCOMMERCE";
    const cssNote = isLiteSpeed
      ? `/* LiteSpeed Cache Detected: Page Optimization -> CSS Settings:\n   - Enable 'CSS Minify', 'CSS Combine' (optional on HTTP/2), and 'Generate UCSS' */\n\n`
      : isWpRocket
      ? `/* WP Rocket Detected: File Optimization -> Enable 'Minify CSS' & 'Remove Unused CSS' */\n\n`
      : isWp && isCss
      ? `// In functions.php (WordPress Unused CSS Elimination):
// 1. Load Gutenberg block CSS conditionally (only for blocks rendered on this page):
add_filter('should_load_separate_core_block_assets', '__return_true');

// 2. Dequeue WooCommerce stylesheets on non-store pages:
add_action('wp_enqueue_scripts', function() {
    if (function_exists('is_woocommerce') && !is_woocommerce() && !is_cart() && !is_checkout() && !is_account_page()) {
        wp_dequeue_style('woocommerce-general');
        wp_dequeue_style('woocommerce-layout');
        wp_dequeue_style('woocommerce-smallscreen');
    }
}, 99);\n\n`
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

  // 14. DOM Size / Excessive DOM
  if (issueCode === "dom-size" || issueCode === "excessive-dom-size") {
    return {
      detectedStack: techStack,
      explanationMarketer: `The page contains too many HTML elements (over 800 nodes)${savingsNotice}. Mobile phones struggle to calculate layout and scroll smoothly with deep, bloated page trees.`,
      explanationDeveloper: `Excessive DOM depth increases memory consumption, style recalculation duration, and paint overhead. Use virtual scrolling for large lists, paginate heavy product/table feeds, and apply 'content-visibility: auto' to offscreen sections.`,
      explanationAgency: `Noticeable smoothness lift on mobile devices. Reduces DOM memory footprint by 40-60%.`,
      explanationSaaSTeam: `Enforce DOM node budget in CI and implement windowing on data tables.`,
      remediationCodeSnippet: `/* CSS content-visibility: auto skips layout/paint of offscreen sections */
.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* Estimates height so scrollbar doesn't jump */
}

// In React / Next.js: Use virtualization for lists with > 50 items:
// npm install @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';`,
      implementationSteps: [
        "Apply CSS 'content-visibility: auto' and 'contain-intrinsic-size' to footer and below-the-fold sections",
        "Paginate long feeds or use @tanstack/react-virtual for lists and tables",
        "Strip extraneous wrapper <div> containers generated by WYSIWYG or visual page builders",
      ],
      verificationSteps: ["Run SpeedPilot audit and verify total DOM node count is < 800"],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    };
  }

  // 15. Redirects
  if (issueCode === "redirects") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Visitors are bounced through multiple redirect hops before landing on the final page${savingsNotice}. Each hop adds 200-500ms of lag on mobile networks.`,
      explanationDeveloper: `Avoid multi-hop redirect chains (e.g. http -> https -> www -> non-www -> trailing slash). Update all internal links to the final canonical destination URL directly.`,
      explanationAgency: `Immediate 200-600ms latency reduction by removing unnecessary redirect hops.`,
      explanationSaaSTeam: `Eliminate redirect chains in ingress routing rules and internal site links.`,
      remediationCodeSnippet: `# 1. Update internal navigation links directly to the canonical URL:
# Replace: href="http://example.com/page"
# With:    href="https://example.com/page/"

# 2. In Nginx: Single-hop 301 redirect combining HTTP -> HTTPS and WWW canonicalization:
server {
  listen 80;
  listen 443 ssl;
  server_name www.example.com;
  return 301 https://example.com$request_uri;
}`,
      implementationSteps: [
        "Audit internal menu and footer links to ensure they point directly to the final canonical HTTPS URL",
        "Consolidate server redirects into a single step rather than cascading hops",
      ],
      verificationSteps: ["Run 'curl -ILs https://your-url.com | grep HTTP/' to confirm only 1 final 200 OK"],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // 16. Back/Forward Cache (bfcache)
  if (issueCode === "bfcache" || issueCode === "bfcache-not-supported" || issueCode === "back-forward-cache") {
    return {
      detectedStack: techStack,
      explanationMarketer: `When users hit the browser "Back" button, the page reloads from scratch with a blank screen instead of instantly restoring from memory. Fixing bfcache eligibility makes back/forward navigation instant (0ms).`,
      explanationDeveloper: `The page is ineligible for bfcache. Common blockers: 1) Using 'unload' event listeners (deprecated; use 'pagehide' instead), 2) Serving HTML with 'Cache-Control: no-store', 3) Leaving active IndexedDB transactions or WebSockets open on unload, 4) Using window.open() without noopener.`,
      explanationAgency: `Major UX win that eliminates back-navigation churn, boosting user engagement metrics.`,
      explanationSaaSTeam: `Ensure back/forward navigation satisfies 0ms restore SLA.`,
      remediationCodeSnippet: `${contextHeader}// 1. Replace legacy 'unload' event listeners with 'pagehide' or 'visibilitychange':
// BAD:
// window.addEventListener('unload', cleanupFunction);

// GOOD:
window.addEventListener('pagehide', (event) => {
  if (event.persisted) {
    // Page is being cached into bfcache
  }
  // Close active WebSockets/SSE connections so bfcache is not blocked:
  if (window.activeSocket) {
    window.activeSocket.close();
  }
});

// 2. In server / CDN response headers for HTML documents:
// BAD:  Cache-Control: no-store
// GOOD: Cache-Control: private, no-cache, must-revalidate

// 3. For all external links opening new tabs:
// Ensure rel="noopener noreferrer" is set on <a target="_blank">${flaggedListComment}`,
      implementationSteps: [
        "Audit codebase for 'window.addEventListener(\"unload\")' and replace with 'pagehide' or 'visibilitychange'",
        "Change HTML Cache-Control header from 'no-store' to 'private, no-cache, must-revalidate'",
        "Close unclosed IndexedDB transactions, WebRTC peers, and WebSockets inside the 'pagehide' listener",
      ],
      verificationSteps: [
        "In Chrome DevTools -> Application -> Back/forward cache, click 'Test back/forward cache' and confirm 'Successfully restored from bfcache'",
        "Re-run SpeedPilot audit to verify bfcache passes",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    };
  }

  // 17. Duplicated & Legacy JavaScript
  if (issueCode === "duplicated-javascript" || issueCode === "legacy-javascript" || issueCode === "modern-browsers") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Your website bundles outdated code for ancient browsers (like Internet Explorer 11) or bundles two copies of the same library, making the download twice as heavy for modern smartphones.`,
      explanationDeveloper: `Found duplicated module versions or legacy ES5/polyfill bloat in production bundles${resourceNotice}. Update browserslist to modern targets (drops 20-40% polyfill weight) and enforce package deduplication with npm overrides or bundler aliases.`,
      explanationAgency: `Direct 100-300KB bundle size reduction with zero code rewrite.`,
      explanationSaaSTeam: `Clean dependency tree and lockfile bloat in CI.`,
      remediationCodeSnippet: `${contextHeader}// 1. In package.json: Modern Browserslist (drops legacy IE11 polyfills):
"browserslist": [
  "defaults and fully supports es6-module",
  "> 0.5%",
  "not dead",
  "not op_mini all"
],

// 2. Deduplicate conflicting library versions in package.json:
"overrides": {
  "lodash": "^4.17.21",
  "date-fns": "^3.0.0"
}

// 3. In vite.config.js / next.config.mjs: Alias duplicated packages to single instance:
resolve: {
  alias: {
    'lodash': 'lodash-es',
  },
}${flaggedListComment}`,
      implementationSteps: [
        "Add modern browserslist target in package.json to eliminate unnecessary Babel polyfills",
        "Run 'npm ls <package-name>' to locate which dependencies are installing duplicate versions",
        "Add package 'overrides' in package.json and re-run 'npm install'",
      ],
      verificationSteps: [
        "Inspect bundle with @next/bundle-analyzer or rollup-plugin-visualizer to confirm no duplicate packages exist",
        "Re-run SpeedPilot audit to verify duplicated-javascript passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // 16. Accessibility & Web Standards
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

  // 17. Default fallback for any other diagnostic issue (Smart, non-generic)
  const fallbackTargets = urls.slice(0, 3);
  let fallbackSnippet = "";
  if (detectedVendors.length > 0) {
    fallbackSnippet = getVendorFixSnippet(detectedVendors, techStack);
  } else if (fallbackTargets.length > 0) {
    const isScript = fallbackTargets.some((u) => u.includes(".js"));
    const isStyle = fallbackTargets.some((u) => u.includes(".css"));
    if (isScript) {
      fallbackSnippet = `<!-- Defer or dynamically import flagged JavaScript assets -->\n${fallbackTargets.map((u) => `<script src="${u}" defer></script>`).join("\n")}`;
    } else if (isStyle) {
      fallbackSnippet = `<!-- Preload critical stylesheet and load asynchronously -->\n${buildPreloadSnippet(fallbackTargets)}`;
    } else {
      fallbackSnippet = buildPreloadSnippet(fallbackTargets);
    }
  } else if (firstNode?.snippet) {
    fallbackSnippet = `<!-- Flagged DOM element to fix (${firstNode.selector || issueCode}) -->\n${firstNode.snippet}`;
  } else {
    fallbackSnippet = `// Configure optimized resource delivery for '${issueCode}'\n// Ensure asset is minified, compressed with Brotli, and cached at CDN edge`;
  }

  return {
    detectedStack: techStack,
    explanationMarketer: `SpeedPilot identified an opportunity to optimize '${issueCode}'${savingsNotice}. Resolving this issue improves user responsiveness, coding compliance, and site speed.`,
    explanationDeveloper: `Lighthouse diagnostic flagged '${issueCode}'${resourceNotice}${firstNode?.selector ? ` at selector '${firstNode.selector}'` : ""}. Inspect the flagged resources, apply non-blocking loading strategies, and verify coding standards.`,
    explanationAgency: `Recommended optimization to include in client performance roadmap.`,
    explanationSaaSTeam: `Monitor metric regression in continuous delivery pipeline.`,
    remediationCodeSnippet: `${contextHeader}${fallbackSnippet}${firstNode?.snippet && !fallbackSnippet.includes(firstNode.snippet) ? `\n<!-- Flagged DOM node:\n${firstNode.snippet}\n-->` : ""}${flaggedListComment}`,
    implementationSteps: [
      `Inspect the specific flagged resources: ${fallbackTargets.length ? fallbackTargets.join(", ") : issueCode}`,
      "Apply non-blocking loading, modern compression, and CDN caching",
    ],
    verificationSteps: [
      "Run SpeedPilot audit to verify resolution",
    ],
    estimatedDifficulty: "MEDIUM",
    estimatedImpact: "MEDIUM",
  };
}
