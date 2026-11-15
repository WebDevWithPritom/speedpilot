import { AIRecommendationOutput, TechStack } from "@speedpilot/shared";

export interface TrainingExemplar {
  id: string;
  issueCode: string;
  techStack: TechStack;
  title: string;
  inputDescription: string;
  flaggedAssets: string[];
  goldStandardOutput: AIRecommendationOutput;
}

export const TRAINING_CORPUS: TrainingExemplar[] = [
  // 1. Next.js App Router Render-Blocking Stylesheet & Fonts
  {
    id: "nextjs-render-blocking-css-font",
    issueCode: "render-blocking-resources",
    techStack: "NEXTJS",
    title: "Eliminate render-blocking CSS & Google Fonts in Next.js App Router",
    inputDescription: "Target: https://acme-store.com - Flagged: /styles/heavy-theme.css (420ms delay), https://fonts.googleapis.com/css2?family=Inter:wght@400;700 (280ms delay)",
    flaggedAssets: [
      "https://acme-store.com/styles/heavy-theme.css",
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;700",
    ],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "External stylesheets and external Google Fonts stall the browser during the first 700ms of page load, leaving visitors on mobile 4G with a blank screen. Eliminating this block directly protects your Google Search ranking and reduces ad traffic drop-off.",
      explanationDeveloper: "Synchronous <link rel='stylesheet'> tags in <head> block the browser's DOM parser before First Contentful Paint. In Next.js App Router, replace external Google Fonts links with 'next/font' (which self-hosts and inlines critical font CSS with zero network waterfall), and load non-critical stylesheets asynchronously using the media='print' onload pattern.",
      explanationAgency: "High-ROI deliverable. Removing render blocking directly recovers ~500ms on mobile devices, boosting the client's PageSpeed Performance score from orange (60s) into the green tier (90+).",
      explanationSaaSTeam: "Enforce Next.js built-in font optimization and CSS Modules in layout.tsx. Add a Lighthouse CI budget assertion in GitHub Actions to block PRs that introduce render-blocking stylesheets.",
      remediationCodeSnippet: `// app/layout.tsx
import { Inter } from 'next/font/google';
import './globals.css';

// 1. Use next/font to automatically self-host and inline critical font declarations:
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {/* 2. Asynchronously load non-critical third-party styles without blocking parser */}
        <link rel="preload" href="/styles/heavy-theme.css" as="style" />
        <link
          rel="stylesheet"
          href="/styles/heavy-theme.css"
          media="print"
          onLoad="this.media='all'"
        />
        <noscript>
          <link rel="stylesheet" href="/styles/heavy-theme.css" />
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}`,
      implementationSteps: [
        "Open app/layout.tsx and remove external <link rel='stylesheet' href='https://fonts.googleapis.com/...'>",
        "Import 'Inter' from 'next/font/google' and apply inter.className to <html>",
        "Convert /styles/heavy-theme.css to load asynchronously with media='print' and onLoad=\"this.media='all'\"",
      ],
      verificationSteps: [
        "Run 'npm run build && npm run start' locally",
        "Inspect Chrome DevTools Network tab: confirm FCP occurs before /styles/heavy-theme.css finishes downloading",
        "Re-run SpeedPilot audit to verify 0ms render-blocking time",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 2. Next.js LCP Hero Image Optimization
  {
    id: "nextjs-lcp-hero-image",
    issueCode: "largest-contentful-paint-element",
    techStack: "NEXTJS",
    title: "Optimize Largest Contentful Paint Hero Element in Next.js",
    inputDescription: "Target: https://acme-store.com - Flagged: /images/summer-sale-hero.png (1420ms LCP delay, lacks priority, unoptimized raster size)",
    flaggedAssets: ["https://acme-store.com/images/summer-sale-hero.png"],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "Your summer promotional banner image is the largest visual element on the page, but takes 1.4 seconds to show up. Speeding up hero delivery ensures visitors immediately see your offer before bouncing.",
      explanationDeveloper: "The Largest Contentful Paint (LCP) element is an un-optimized raster image without a high-priority preload hint. Next.js App Router provides the 'next/image' component with the 'priority' and 'fetchPriority=\"high\"' attributes, which automatically dispatches an early <link rel=\"preload\"> in <head> and serves modern AVIF/WebP formats with responsive srcset dimensions.",
      explanationAgency: "Direct Core Web Vitals ranking factor. Lowering LCP from 3.2s to 1.4s satisfies Google's 'Good' threshold (≤ 2.5s), directly preventing search ranking degradation.",
      explanationSaaSTeam: "Set up next/image priority on the first viewport hero element and enforce minimumCacheTTL of 1 year on CDN image delivery.",
      remediationCodeSnippet: `// app/page.tsx - Optimized Hero Section
import Image from 'next/image';

export function HeroBanner() {
  return (
    <div className="relative w-full aspect-[16/9] max-h-[560px] overflow-hidden">
      <Image
        src="/images/summer-sale-hero.png"
        alt="Summer Sale promotional banner"
        fill
        priority // Crucial: Injects high-priority preload link into document <head>
        fetchPriority="high"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
        className="object-cover"
      />
    </div>
  );
}

// In next.config.mjs:
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
};
export default nextConfig;`,
      implementationSteps: [
        "Replace standard <img> or background-image with Next.js <Image fill priority fetchPriority='high'>",
        "Add explicit 'sizes' attribute so mobile phones do not download desktop 1200px images",
        "Verify next.config.mjs enables 'image/avif' and 'image/webp' formats",
      ],
      verificationSteps: [
        "Inspect HTML source: verify <link rel='preload' as='image' fetchpriority='high'> is rendered in <head>",
        "Re-run SpeedPilot audit and confirm LCP metric is < 2.0s",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 3. WordPress / WooCommerce Render-Blocking Scripts & Plugins
  {
    id: "wordpress-render-blocking-plugins",
    issueCode: "render-blocking-resources",
    techStack: "WORDPRESS",
    title: "Eliminate render-blocking styles & scripts in WordPress",
    inputDescription: "Target: https://my-wp-blog.com - Flagged: /wp-content/themes/custom-theme/style.css, /wp-content/plugins/contact-form/css/styles.css, /wp-includes/js/jquery/jquery.min.js",
    flaggedAssets: [
      "https://my-wp-blog.com/wp-content/themes/custom-theme/style.css",
      "https://my-wp-blog.com/wp-content/plugins/contact-form/css/styles.css",
      "https://my-wp-blog.com/wp-includes/js/jquery/jquery.min.js",
    ],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "WordPress plugins and theme styles are loaded synchronously in your site's header, delaying visible text on mobile devices by 600ms. Visitors face a white flash while waiting.",
      explanationDeveloper: "Theme and plugin scripts enqueued via wp_enqueue_scripts render synchronously in <head>. In WordPress 6.3+, register scripts with native loading strategies ('strategy' => 'defer' and 'in_footer' => true), enable 'should_load_separate_core_block_assets' to prevent Gutenberg from loading all ~150KB core block CSS globally, and filter 'style_loader_tag' to asynchronously load non-critical plugin stylesheets.",
      explanationAgency: "Essential WordPress maintenance sprint deliverable. Cuts initial page rendering delay by 50% and lifts client PageSpeed score by 15-20 points.",
      explanationSaaSTeam: "Enforce WordPress 6.3+ script loading strategies and critical CSS extraction in theme code reviews.",
      remediationCodeSnippet: `// In your child theme's functions.php or performance plugin:

// 1. WordPress 6.3+ native script loading strategy (defer & in_footer):
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_script(
        'theme-main',
        get_stylesheet_directory_uri() . '/js/main.js',
        array('jquery'),
        '1.0.0',
        array(
            'in_footer' => true,
            'strategy'  => 'defer', // Native WP 6.3+ attribute: downloads in background, executes after HTML parse
        )
    );
}, 20);

// 2. Prevent Gutenberg from loading all core block styles globally (loads CSS only for blocks rendered on page):
add_filter('should_load_separate_core_block_assets', '__return_true');

// 3. Asynchronously load non-critical plugin styles:
add_filter('style_loader_tag', function($html, $handle) {
    $deferred_styles = ['contact-form-7', 'woocommerce-general', 'theme-extra'];
    if (in_array($handle, $deferred_styles, true)) {
        return str_replace(
            "rel='stylesheet'",
            "rel='preload' as='style' onload=\\"this.onload=null;this.rel='stylesheet'\\"",
            $html
        ) . "<noscript>" . $html . "</noscript>";
    }
    return $html;
}, 10, 2);`,
      implementationSteps: [
        "Open your child theme's functions.php",
        "Enable 'should_load_separate_core_block_assets' filter to stop global block CSS bloat",
        "Update wp_enqueue_script to use array('strategy' => 'defer', 'in_footer' => true)",
        "Filter 'style_loader_tag' to preload non-critical plugin stylesheets",
        "Flush WordPress object and page cache",
      ],
      verificationSteps: [
        "Open DevTools -> Network panel and verify styles load with rel='preload' as='style'",
        "Run SpeedPilot audit to verify render-blocking issues drop to 0ms",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 4. Third-Party Tracking Bloat & Facade (GTM, Meta Pixel, Intercom)
  {
    id: "third-party-facade-trackers",
    issueCode: "third-party-summary",
    techStack: "NEXTJS",
    title: "Lazy-load third-party analytics and chat widgets with Facade Pattern",
    inputDescription: "Target: https://saas-app.com - Flagged: https://www.googletagmanager.com/gtm.js (320ms main thread delay), https://connect.facebook.net/en_US/fbevents.js, https://widget.intercom.io/widget/app-id",
    flaggedAssets: [
      "https://www.googletagmanager.com/gtm.js?id=GTM-XYZ",
      "https://connect.facebook.net/en_US/fbevents.js",
      "https://widget.intercom.io/widget/APP_ID",
    ],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "Customer support chat widgets (Intercom) and tracking scripts (GTM, Meta Pixel) execute heavy code as soon as someone lands on the page. Customers on mobile experience frozen scrolling and laggy taps. Delaying them until after first paint keeps the site lightning-fast without losing any tracking data.",
      explanationDeveloper: "Third-party vendor bundles monopolize the browser main thread during critical hydration. Replace eager Intercom loading with an interactive button facade (click-to-load), and offload Google Tag Manager & Meta Pixel using Next.js '@next/third-parties' or strategy='lazyOnload' coupled with user interaction triggers.",
      explanationAgency: "Delivers an immediate 30-40% reduction in Total Blocking Time (TBT) and recovers ~800KB of network transfer during initial load.",
      explanationSaaSTeam: "Establish third-party vendor budgets in CI. Forbid loading marketing SDKs in <head> without explicit architectural review.",
      remediationCodeSnippet: `// 1. Next.js Google Tag Manager (app/layout.tsx)
import { GoogleTagManager } from '@next/third-parties/google';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <GoogleTagManager gtmId="GTM-XYZ" />
      </body>
    </html>
  );
}

// 2. Intercom Chat Widget Facade Component (components/ChatFacade.tsx)
'use client';
import { useState } from 'react';
import Script from 'next/script';

export function ChatWidget() {
  const [active, setActive] = useState(false);

  return (
    <>
      {!active && (
        <button
          onClick={() => setActive(true)}
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-blue-600 text-white rounded-full shadow-lg font-medium text-sm flex items-center gap-2 hover:bg-blue-700 transition"
          aria-label="Open support chat"
        >
          💬 Need Help?
        </button>
      )}
      {active && (
        <Script
          src="https://widget.intercom.io/widget/APP_ID"
          strategy="lazyOnload"
          onLoad={() => {
            if (window.Intercom) window.Intercom('boot', { app_id: 'APP_ID' });
          }}
        />
      )}
    </>
  );
}`,
      implementationSteps: [
        "Install @next/third-parties: 'npm install @next/third-parties'",
        "Use <GoogleTagManager gtmId='GTM-XYZ' /> inside app/layout.tsx body",
        "Render the lightweight ChatWidget facade button instead of embedding the heavy Intercom iframe upfront",
      ],
      verificationSteps: [
        "Verify Intercom bundle is NOT fetched until the support button is clicked in DevTools Network tab",
        "Re-run SpeedPilot audit and verify third-party TBT overhead drops below 100ms",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 5. Interaction to Next Paint (INP) / Long Tasks Optimization
  {
    id: "general-inp-long-tasks",
    issueCode: "interaction-to-next-paint",
    techStack: "REACT",
    title: "Fix Interaction to Next Paint (INP) by yielding main thread in long tasks",
    inputDescription: "Target: https://dashboard.io - Flagged: /assets/dashboard-bundle.js (Long Task 180ms on search input change)",
    flaggedAssets: ["https://dashboard.io/assets/dashboard-bundle.js"],
    goldStandardOutput: {
      detectedStack: "REACT",
      explanationMarketer: "When users type into the search bar or click table filters, the screen freezes for nearly 200ms before showing results. Google ranks pages lower when button presses and keystrokes feel sluggish.",
      explanationDeveloper: "Synchronous state recalculation inside input event handlers monopolizes the main thread for > 150ms, starving UI paint frames and causing poor INP. Break up synchronous loops with 'scheduler.yield()' (or setTimeout fallback) and wrap expensive filtering in React 'useTransition' or 'useDeferredValue'.",
      explanationAgency: "Guarantees passing the official Google INP Core Web Vitals threshold (≤ 200ms), safeguarding organic search visibility and improving user retention.",
      explanationSaaSTeam: "Profile React component render cycles with React Profiler to prevent cascaded re-renders across parent contexts.",
      remediationCodeSnippet: `// components/DashboardSearch.tsx
import { useState, useTransition } from 'react';

// Yield to browser main thread so keystrokes & taps render immediately
async function yieldToMain() {
  if ('scheduler' in window && 'yield' in (window as any).scheduler) {
    return await (window as any).scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function FilterableTable({ rawRows }: { rawRows: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(rawRows);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    // 1. Immediate UI update: keeps input cursor responsive with 0ms lag
    setSearchTerm(query);

    // 2. Wrap heavy list filtering in transition to yield to paint events
    startTransition(async () => {
      const results: any[] = [];
      for (let i = 0; i < rawRows.length; i++) {
        if (rawRows[i].name.toLowerCase().includes(query.toLowerCase())) {
          results.push(rawRows[i]);
        }
        // Yield every 100 items to keep page responsive
        if (i % 100 === 0) await yieldToMain();
      }
      setFilteredRows(results);
    });
  };

  return (
    <div>
      <input
        type="search"
        value={searchTerm}
        onChange={handleSearch}
        placeholder="Filter records..."
        className="px-3 py-2 border rounded"
      />
      {isPending && <span className="text-xs text-muted-foreground ml-2">Filtering...</span>}
      <Table items={filteredRows} />
    </div>
  );
}`,
      implementationSteps: [
        "Identify the heavy event handler flagged in the audit trace",
        "Implement 'useTransition' so input state updates immediately while filtering is non-urgent",
        "Add 'yieldToMain()' to chunk large data array iterations",
      ],
      verificationSteps: [
        "Throttle CPU 4x in Chrome DevTools Performance tab and type rapidly into search input",
        "Verify INP interaction latency is ≤ 100ms with no long-task red flags",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 6. Cumulative Layout Shift (CLS) Fix
  {
    id: "general-cls-layout-shifts",
    issueCode: "cumulative-layout-shift",
    techStack: "CUSTOM",
    title: "Prevent Cumulative Layout Shift with CSS aspect-ratio and font fallback matching",
    inputDescription: "Target: https://news-portal.com - Flagged: .ad-slot-header (0.32 layout shift), hero image shifting text down on late load",
    flaggedAssets: ["https://news-portal.com/ads/header-banner.js", "https://news-portal.com/hero.jpg"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Page content jumps around while the site is loading, causing visitors to accidentally tap the wrong buttons or ad links. Google penalizes jumpy websites heavily in organic search rankings.",
      explanationDeveloper: "Dynamically injected ad banners and unsized images insert DOM nodes without pre-allocated geometric space, triggering browser reflows. Pre-reserve container dimensions with CSS 'aspect-ratio' and 'min-height', and set explicit 'width' and 'height' attributes on all raster media.",
      explanationAgency: "Fastest way to fix Core Web Vitals CLS. Moves CLS from failing (0.32) to near zero (≤ 0.02) within one quick sprint.",
      explanationSaaSTeam: "Enforce CSS dimension validation in design system component unit tests.",
      remediationCodeSnippet: `/* styles/layout.css - Container Dimension Reservation */

/* 1. Pre-allocate ad slot container to eliminate layout shift on ad inject */
.ad-slot-header {
  min-height: 250px;
  width: 100%;
  max-width: 970px;
  margin: 0 auto;
  display: block;
  background-color: #f3f4f6; /* Subtle placeholder avoids stark pop-in */
}

/* 2. Responsive image container with CSS aspect-ratio */
.hero-image-wrapper {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  background-color: #e5e7eb;
}

<!-- HTML Markup -->
<div class="hero-image-wrapper">
  <!-- Always include explicit width & height attributes for browser ratio calculation -->
  <img
    src="/hero.jpg"
    alt="Breaking news headline"
    width="1200"
    height="675"
    style="width: 100%; height: auto;"
    fetchpriority="high"
  >
</div>`,
      implementationSteps: [
        "Add explicit 'aspect-ratio: 16 / 9' to media wrappers",
        "Set 'min-height: 250px' on dynamic ad banner containers so they do not shift content when filled",
        "Add explicit width and height attributes to all <img> and <iframe> elements",
      ],
      verificationSteps: [
        "Run SpeedPilot audit and verify CLS drops to ≤ 0.05",
        "Check DevTools Performance panel Experience track to verify 0 layout shift records",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 7. Server Response Time (TTFB) & Edge Caching
  {
    id: "server-response-time-caching",
    issueCode: "server-response-time",
    techStack: "WORDPRESS",
    title: "Optimize Time to First Byte (TTFB) with Edge Caching & Redis Object Cache",
    inputDescription: "Target: https://client-shop.com - TTFB latency 1450ms on initial HTML document request",
    flaggedAssets: ["https://client-shop.com/"],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "Your web server takes 1.4 seconds just to respond with the first byte of information. Before this happens, your visitors' phones cannot download a single image, script, or style. Caching reduces this wait to under 150ms.",
      explanationDeveloper: "Slow origin TTFB caused by uncached PHP execution and un-indexed SQL queries. Deploy full-page edge CDN caching with modern Cache-Control headers (s-maxage=3600, stale-while-revalidate=86400) and enable Redis Object Cache in WordPress to cache persistent database transients in RAM.",
      explanationAgency: "Cuts server load by 80% while making the client's store feel instantaneous globally. Unlocks green Core Web Vitals for all international visitors.",
      explanationSaaSTeam: "Enforce TTFB SLA (< 600ms p75) and implement automated database query performance regression checks.",
      remediationCodeSnippet: `# 1. In Apache / LiteSpeed .htaccess or Nginx configuration:
# Serve cached HTML to anonymous visitors from edge/memory:
<IfModule mod_headers.c>
  # Cache public pages at CDN edge for 1 hour, stale-while-revalidate for 1 day
  Header set Cache-Control "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" "expr=%{REQUEST_METHOD} == 'GET' && %{HTTP_COOKIE} !~ /wordpress_logged_in/"
</IfModule>

# 2. In wp-config.php - Enable Redis Object Cache:
define('WP_CACHE', true);
define('WP_REDIS_HOST', '127.0.0.1');
define('WP_REDIS_PORT', 6379);
define('WP_REDIS_TIMEOUT', 1);
define('WP_REDIS_READ_TIMEOUT', 1);`,
      implementationSteps: [
        "Configure CDN / Cloudflare Cache Rules to cache guest HTML requests for 1 hour",
        "Add Redis Object Cache plugin to cache WordPress database transients in memory",
        "Add modern Cache-Control header with s-maxage=3600 and stale-while-revalidate=86400",
      ],
      verificationSteps: [
        "Run 'curl -I -o /dev/null -s -w 'TTFB: %{time_starttransfer}s\\n' https://client-shop.com' and verify < 0.2s",
        "Re-run SpeedPilot audit and confirm server-response-time passes",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 8. Text Compression (Brotli / Gzip)
  {
    id: "text-compression-brotli",
    issueCode: "uses-text-compression",
    techStack: "CUSTOM",
    title: "Enable modern Brotli & Gzip text compression",
    inputDescription: "Target: https://my-site.com - Flagged: /bundle.js (uncompressed 480KB), /styles.css (uncompressed 120KB)",
    flaggedAssets: ["https://my-site.com/bundle.js", "https://my-site.com/styles.css"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Your website sends uncompressed code files to visitors' phones, using 4x more cellular data and causing long download pauses. Enabling modern compression shrinks file sizes by up to 75% instantly.",
      explanationDeveloper: "Text assets are served without 'content-encoding: br' (Brotli) or 'gzip'. Brotli achieves 15-25% higher compression density than standard Gzip. Enable ngx_brotli and gzip on Nginx or Apache mod_deflate.",
      explanationAgency: "Immediate, zero-risk performance win that cuts hosting bandwidth costs and knocks seconds off mobile page load times.",
      explanationSaaSTeam: "Enforce compression validation on all reverse proxy routing layers.",
      remediationCodeSnippet: `# Nginx Configuration (/etc/nginx/conf.d/compression.conf)
# 1. Enable Gzip
gzip on;
gzip_comp_level 6;
gzip_min_length 256;
gzip_proxied any;
gzip_types
  text/plain
  text/css
  application/javascript
  application/json
  image/svg+xml
  application/xml;

# 2. Enable Brotli (if ngx_brotli is loaded)
brotli on;
brotli_comp_level 6;
brotli_types
  text/plain
  text/css
  application/javascript
  application/json
  image/svg+xml
  application/xml;`,
      implementationSteps: [
        "Open your Nginx configuration or Cloudflare dashboard",
        "If using Cloudflare, navigate to Speed -> Optimization and toggle 'Brotli' to ON",
        "If using Nginx, include the compression.conf block above and run 'nginx -s reload'",
      ],
      verificationSteps: [
        "Run 'curl -H \"Accept-Encoding: br\" -I https://my-site.com/bundle.js | grep -i content-encoding'",
        "Verify response header returns 'content-encoding: br'",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 9. WooCommerce Cart Fragments & Asset Splitting
  {
    id: "wordpress-woocommerce-cart-fragments",
    issueCode: "unused-javascript",
    techStack: "WOOCOMMERCE",
    title: "Disable WooCommerce Cart Fragments & Dequeue Unused Store Assets on Non-Shop Pages",
    inputDescription: "Target: https://clothing-store.com/blog/summer-outfits - Flagged: /wp-content/plugins/woocommerce/assets/js/frontend/cart-fragments.min.js (un-cached AJAX call ?wc-ajax=get_refreshed_fragments adds 920ms delay on blog post), /wp-content/plugins/woocommerce/assets/css/woocommerce.css",
    flaggedAssets: [
      "https://clothing-store.com/wp-content/plugins/woocommerce/assets/js/frontend/cart-fragments.min.js",
      "https://clothing-store.com/wp-content/plugins/woocommerce/assets/css/woocommerce.css",
    ],
    goldStandardOutput: {
      detectedStack: "WOOCOMMERCE",
      explanationMarketer: "By default, WooCommerce executes an uncached background request ('?wc-ajax=get_refreshed_fragments') on every single page load—including your blog posts, homepage, and contact form. This creates an unnecessary 1-second delay for visitors who aren't even shopping yet.",
      explanationDeveloper: "WooCommerce's 'cart-fragments' script initiates an uncached POST AJAX call on every page to update mini-cart counts. Conditionally dequeue 'wc-cart-fragments', 'woocommerce', and related styles on all non-eCommerce pages ('!is_woocommerce() && !is_cart() && !is_checkout()').",
      explanationAgency: "One of the highest-impact WooCommerce optimizations available. Instantly cuts server CPU load in half and removes 500-1200ms of latency on content pages.",
      explanationSaaSTeam: "Enforce conditional script dequeuing in the site's functionality plugin to protect server capacity during marketing campaigns.",
      remediationCodeSnippet: `// In functions.php or mu-plugins/woocommerce-perf.php:
add_action('wp_enqueue_scripts', function() {
    // Only dequeue on pages that are NOT WooCommerce product/archive, cart, checkout, or account
    if (function_exists('is_woocommerce') && !is_woocommerce() && !is_cart() && !is_checkout() && !is_account_page()) {
        
        // 1. Disable cart fragments AJAX polling (saves 500-1200ms TTFB on non-shop pages):
        wp_dequeue_script('wc-cart-fragments');
        wp_dequeue_script('woocommerce');
        wp_dequeue_script('js-cookie');

        // 2. Dequeue heavy WooCommerce frontend CSS on blog & content pages:
        wp_dequeue_style('woocommerce-general');
        wp_dequeue_style('woocommerce-layout');
        wp_dequeue_style('woocommerce-smallscreen');
    }
}, 99);`,
      implementationSteps: [
        "Add the conditional dequeue snippet into your child theme's functions.php or a Must-Use plugin (wp-content/mu-plugins/wc-perf.php)",
        "Clear your server and CDN caches",
        "Verify that on product, cart, and checkout pages, the shopping cart continues to update normally",
      ],
      verificationSteps: [
        "Open DevTools -> Network tab on a non-shop page (e.g. blog post or About page)",
        "Filter by 'wc-ajax' and confirm 'get_refreshed_fragments' is NEVER called",
        "Re-run SpeedPilot audit to confirm unused JS/CSS warnings clear",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 10. WordPress 6.3+ Featured Image LCP Optimization
  {
    id: "wordpress-lcp-post-thumbnail",
    issueCode: "largest-contentful-paint-element",
    techStack: "WORDPRESS",
    title: "Optimize WordPress Featured Image LCP with fetchpriority and Eager Loading (WP 6.3+)",
    inputDescription: "Target: https://travel-blog.com/italy-guide - Flagged: /wp-content/uploads/2026/05/rome-colosseum.jpg (LCP element delayed 1380ms due to loading='lazy' and lack of high fetch priority)",
    flaggedAssets: ["https://travel-blog.com/wp-content/uploads/2026/05/rome-colosseum.jpg"],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "Your blog post's featured banner image takes 1.4 seconds to display because WordPress delayed its download with lazy-loading. Prioritizing hero image discovery makes the page feel instantaneous on mobile devices.",
      explanationDeveloper: "Hero images in the initial viewport should never have 'loading=\"lazy\"'. In WordPress 6.3+, core automatically optimizes content images, but custom theme templates must render the featured hero with 'loading' => 'eager' and 'fetchpriority' => 'high', and inject a priority <link rel='preload'> in 'wp_head'.",
      explanationAgency: "Directly solves LCP Core Web Vitals compliance on WordPress editorial and magazine sites.",
      explanationSaaSTeam: "Enforce WordPress 6.3+ image attribute standards in theme templates and enable AVIF/WebP output formats.",
      remediationCodeSnippet: `// In functions.php:

// 1. High-priority preload in <head> for singular post hero images:
add_action('wp_head', function() {
    if (is_singular() && has_post_thumbnail()) {
        $img_src = get_the_post_thumbnail_url(get_the_ID(), 'large');
        if ($img_src) {
            echo '<link rel="preload" as="image" href="' . esc_url($img_src) . '" fetchpriority="high">' . "\\n";
        }
    }
}, 1);

// 2. In single.php or your post header template: Ensure featured image is eager & high priority:
the_post_thumbnail('large', array(
    'loading'       => 'eager',         // NEVER lazy-load the above-the-fold hero image!
    'fetchpriority' => 'high',          // Tells browser to prioritize bandwidth for LCP
    'decoding'      => 'async',
    'class'         => 'hero-featured-image',
));

// 3. Enable modern WebP and AVIF generation on upload (WordPress 6.5+):
add_filter('image_editor_output_format', function($formats) {
    $formats['image/jpeg'] = 'image/webp';
    $formats['image/png']  = 'image/webp';
    return $formats;
});`,
      implementationSteps: [
        "In your theme's single.php, update the_post_thumbnail() to set loading='eager' and fetchpriority='high'",
        "Add the wp_head action hook to preload the featured image for instant browser discovery",
        "Add the image_editor_output_format filter to generate modern WebP/AVIF formats automatically",
      ],
      verificationSteps: [
        "View page source: verify <link rel='preload' as='image' fetchpriority='high'> is in <head>",
        "Verify the hero <img> tag does NOT contain loading='lazy'",
        "Re-run SpeedPilot audit to verify LCP is < 2.0s",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 11. WordPress Core Head Bloat & Heartbeat Cleanup
  {
    id: "wordpress-core-bloat-removal",
    issueCode: "bootup-time",
    techStack: "WORDPRESS",
    title: "Remove WordPress Core Head Bloat (Emojis, Heartbeat API & Gutenberg Block Styles)",
    inputDescription: "Target: https://law-firm.com - Flagged: /wp-includes/js/wp-emoji-release.min.js, /wp-includes/js/heartbeat.min.js, /wp-includes/css/dist/block-library/style.min.css",
    flaggedAssets: [
      "https://law-firm.com/wp-includes/js/wp-emoji-release.min.js",
      "https://law-firm.com/wp-includes/js/heartbeat.min.js",
      "https://law-firm.com/wp-includes/css/dist/block-library/style.min.css",
    ],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "WordPress ships default scripts (like emoji conversions and background heartbeat polling) that execute on every page visit, draining mobile batteries and delaying interactive taps on your website.",
      explanationDeveloper: "Core WordPress enqueues legacy polyfills (wp-emoji-release.min.js), periodic admin-polling scripts (heartbeat.js), and global Gutenberg block libraries in the frontend. Strip unnecessary core actions in functions.php to recover main thread parse/compile time.",
      explanationAgency: "Clean hygiene fix that reduces page weight by 30-50KB and removes ~100-200ms of unnecessary main-thread JavaScript execution.",
      explanationSaaSTeam: "Enforce lean WordPress head configurations across all client and marketing sites.",
      remediationCodeSnippet: `// In functions.php - Clean WordPress Core Bloat:

// 1. Disable WordPress emoji detection script & inline styles:
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('admin_print_scripts', 'print_emoji_detection_script');
remove_action('admin_print_styles', 'print_emoji_styles');
add_filter('emoji_svg_url', '__return_false');

// 2. Disable frontend Heartbeat API polling (keeps it active ONLY in wp-admin):
add_action('init', function() {
    if (!is_admin()) {
        wp_deregister_script('heartbeat');
    }
}, 1);

// 3. Remove RSD link, WLW manifest, and WordPress generator tag:
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wp_shortlink_wp_head');

// 4. Disable XML-RPC (reduces brute-force attacks and background overhead):
add_filter('xmlrpc_enabled', '__return_false');`,
      implementationSteps: [
        "Add the bloat-removal snippet into functions.php",
        "Flush page caching plugins",
        "Verify that normal post editing in wp-admin remains unaffected",
      ],
      verificationSteps: [
        "Inspect page source: confirm wp-emoji-release.min.js and heartbeat.min.js are gone",
        "Re-run SpeedPilot audit to verify bootup-time improvement",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "MEDIUM",
    },
  },

  // 12. Shopify 2.0 LCP Image Tag & Fetchpriority Preload
  {
    id: "shopify-lcp-image-tag-preload",
    issueCode: "largest-contentful-paint-element",
    techStack: "SHOPIFY",
    title: "Optimize Shopify 2.0 Hero Section with image_tag, Preloading, and High Fetchpriority",
    inputDescription: "Target: https://fashion-boutique.myshopify.com - Flagged: //cdn.shopify.com/s/files/1/0000/files/hero-autumn.jpg (1650ms LCP delay, lazy loaded in hero banner)",
    flaggedAssets: ["https://cdn.shopify.com/s/files/1/0000/files/hero-autumn.jpg"],
    goldStandardOutput: {
      detectedStack: "SHOPIFY",
      explanationMarketer: "Your main hero banner takes 1.65 seconds to appear for shoppers on mobile. Preloading the hero banner ensures customers immediately see your campaign the instant they arrive, reducing bounce rate.",
      explanationDeveloper: "The Largest Contentful Paint (LCP) element in sections/hero-banner.liquid was using generic img_url filters with loading='lazy'. In Shopify Online Store 2.0, use the native 'image_tag' filter with 'preload: true', 'fetchpriority: \"high\"', and 'loading: \"eager\"', which causes Shopify to inject early <link rel='preload'> headers and modern WebP/AVIF images.",
      explanationAgency: "Critical eCommerce Core Web Vitals optimization. Drops LCP from 3.1s to under 1.5s, lifting Google mobile search rank.",
      explanationSaaSTeam: "Enforce image_tag preload guidelines on theme hero sections in Shopify theme CI.",
      remediationCodeSnippet: `<!-- 1. In layout/theme.liquid <head>: Preload hero image if on index page -->
{%- if template == 'index' and section.settings.image -%}
  <link rel="preload" as="image" href="{{ section.settings.image | image_url: width: 1440 }}" fetchpriority="high">
{%- endif -%}

<!-- 2. In sections/hero-banner.liquid: Use image_tag with preload: true and fetchpriority: 'high' -->
{{ section.settings.image | image_url: width: 1440 | image_tag:
  preload: true,
  fetchpriority: 'high',
  loading: 'eager',
  decoding: 'async',
  widths: '375, 550, 750, 1100, 1440, 1920',
  sizes: '100vw',
  alt: section.settings.image.alt | default: shop.name | escape,
  class: 'hero-banner__image'
}}`,
      implementationSteps: [
        "Open sections/hero-banner.liquid and locate the hero <img> tag",
        "Replace standard img tags with Shopify's image_url and image_tag filters",
        "Pass preload: true, fetchpriority: 'high', and loading: 'eager'",
        "In layout/theme.liquid, add early <link rel='preload'> for template == 'index'",
      ],
      verificationSteps: [
        "Run 'shopify theme check sections/hero-banner.liquid'",
        "Inspect page source: confirm <link rel='preload' as='image' fetchpriority='high'> is in <head>",
        "Re-run SpeedPilot audit to verify LCP under 2.5s",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 13. Shopify Cart Drawer Debounce & Interaction Delay
  {
    id: "shopify-cart-drawer-inp-debounce",
    issueCode: "interaction-to-next-paint",
    techStack: "SHOPIFY",
    title: "Fix Shopify Cart Drawer INP Lag via Quantity Debounce and Main Thread Yielding",
    inputDescription: "Target: https://fashion-boutique.myshopify.com - Flagged: /assets/cart-drawer.js (340ms INP delay on quantity plus/minus buttons)",
    flaggedAssets: ["https://fashion-boutique.myshopify.com/assets/cart-drawer.js"],
    goldStandardOutput: {
      detectedStack: "SHOPIFY",
      explanationMarketer: "Shoppers experience a noticeable freeze when tapping the quantity buttons in the slide-out cart. Fixing this responsiveness ensures a slick checkout flow and higher cart conversion.",
      explanationDeveloper: "Rapid clicks on quantity stepper buttons trigger immediate synchronous DOM updates and un-debounced POST /cart/change.js fetches, locking the main thread. Implement a 300ms debounce timer and optimistic UI feedback to keep INP under 100ms.",
      explanationAgency: "Improves Google INP metric from 'Needs Improvement' (340ms) to 'Good' (< 100ms) on mobile eCommerce checkouts.",
      explanationSaaSTeam: "Maintain snappy micro-interactions in Shopify theme cart components.",
      remediationCodeSnippet: `// assets/cart-drawer.js - Debounced Quantity Controller
let cartDebounceTimer = null;

function handleQuantityChange(lineIndex, newQuantity) {
  // 1. Optimistic UI update immediately on click so user gets instant tactile feedback:
  const qtyInput = document.querySelector(\`[data-cart-line="\${lineIndex}"] .quantity-input\`);
  if (qtyInput) qtyInput.value = newQuantity;

  // 2. Clear pending AJAX request to debounce rapid clicks:
  clearTimeout(cartDebounceTimer);

  // 3. Batch server synchronization after 300ms idle:
  cartDebounceTimer = setTimeout(async () => {
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ line: lineIndex, quantity: newQuantity }),
      });
      const updatedCart = await response.json();
      updateCartTotalsUI(updatedCart);
    } catch (err) {
      console.error('Failed to sync cart:', err);
    }
  }, 300);
}`,
      implementationSteps: [
        "Open assets/cart-drawer.js and locate quantity change event listeners",
        "Wrap the /cart/change.js fetch call inside a 300ms debounce timeout",
        "Add optimistic input updates so the number changes immediately upon touch",
        "Add { passive: true } to scroll and touch listeners on the cart drawer",
      ],
      verificationSteps: [
        "In Chrome DevTools, turn on 4x CPU throttling and tap +/- rapidly",
        "Verify INP duration remains < 100ms in the Performance panel",
        "Re-run SpeedPilot audit to verify INP passes",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 14. Laravel TTFB Eager Loading & Route Caching
  {
    id: "laravel-ttfb-eager-loading-cache",
    issueCode: "server-response-time",
    techStack: "LARAVEL",
    title: "Optimize Laravel TTFB with Eloquent Eager Loading, Redis Cache, and Route Caching",
    inputDescription: "Target: https://crm-platform.com - Flagged: Server Response Time 1480ms TTFB caused by N+1 database queries on home dashboard",
    flaggedAssets: ["https://crm-platform.com/"],
    goldStandardOutput: {
      detectedStack: "LARAVEL",
      explanationMarketer: "Your server takes nearly 1.5 seconds to start sending data back to users. Accelerating server processing makes dashboard pages load instantly.",
      explanationDeveloper: "High TTFB in Laravel is commonly caused by N+1 Eloquent query cascades, uncached routes/configs, or file-based session stores. Eliminate N+1 queries with Model::with(), switch cache and sessions to Redis, and compile deployment caches with php artisan route:cache and config:cache.",
      explanationAgency: "Drops backend TTFB from 1480ms to < 180ms, providing immediate green scores across all PageSpeed metrics.",
      explanationSaaSTeam: "Standardize Laravel CI/CD deployment routines with artisan cache compilation and connection pooling.",
      remediationCodeSnippet: `// 1. app/Http/Controllers/DashboardController.php (Eliminate N+1 with Eager Loading & Redis)
use Illuminate\Support\Facades\Cache;
use App\Models\Order;

public function index()
{
    // Eager load relations to execute exactly 2 queries instead of 1 + 50 queries:
    $orders = Cache::remember('dashboard.recent_orders', 300, function () {
        return Order::with(['customer:id,name,email', 'items.product:id,name,price'])
            ->latest()
            ->take(20)
            ->get();
    });

    return view('dashboard', compact('orders'));
}

// 2. In Production Deployment Script (deploy.sh):
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

// 3. In .env: Use Redis for blazing fast session and cache storage
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis`,
      implementationSteps: [
        "Audit controllers using Laravel Debugbar or Telescope to find N+1 queries",
        "Add ->with(['relation']) eager loading to all nested resource loops",
        "Configure Redis for cache and session drivers in .env",
        "Add php artisan config:cache and route:cache to deployment hooks",
      ],
      verificationSteps: [
        "Run 'php artisan route:cache && php artisan config:cache'",
        "Run 'curl -w \"TTFB: %{time_starttransfer}s\\n\" -o /dev/null -s https://crm-platform.com'",
        "Confirm TTFB is < 250ms and re-run SpeedPilot",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 15. Laravel Vite Chunk Splitting
  {
    id: "laravel-vite-chunk-splitting",
    issueCode: "unused-javascript",
    techStack: "LARAVEL",
    title: "Eliminate Unused JavaScript in Laravel 10/11 using Vite Manual Chunking",
    inputDescription: "Target: https://crm-platform.com - Flagged: /build/assets/app.js (680KB, 420KB unused code on initial landing page)",
    flaggedAssets: ["https://crm-platform.com/build/assets/app.js"],
    goldStandardOutput: {
      detectedStack: "LARAVEL",
      explanationMarketer: "Your main script bundle packages heavy administrative features and charts into the public landing page, wasting bandwidth on mobile.",
      explanationDeveloper: "Vite bundles all imports into a single monolithic resources/js/app.js file by default. Configure 'rollupOptions.output.manualChunks' in vite.config.js to extract vendor libraries (Alpine, Chart.js, Axios) into separate cached chunks and load admin modules only on authenticated views.",
      explanationAgency: "Cuts initial page JS payload by 60%, reducing TBT and speeding up mobile interactivity.",
      explanationSaaSTeam: "Optimize frontend build output size in Laravel Vite build pipeline.",
      remediationCodeSnippet: `// vite.config.js - Laravel Vite Plugin Manual Chunks
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
  plugins: [
    laravel({
      input: [
        'resources/css/app.css',
        'resources/js/app.js',
        'resources/js/dashboard.js', // Split heavy dashboard into separate entry point
      ],
      refresh: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('alpinejs') || id.includes('axios')) {
              return 'vendor-core';
            }
            if (id.includes('chart.js') || id.includes('flatpickr')) {
              return 'vendor-charts';
            }
            return 'vendor-libs';
          }
        },
      },
    },
  },
});`,
      implementationSteps: [
        "Open vite.config.js and add the build.rollupOptions.output.manualChunks configuration",
        "Separate authenticated dashboard scripts into a distinct entry point (resources/js/dashboard.js)",
        "In Blade templates, load @vite(['resources/js/dashboard.js']) ONLY inside auth layouts",
        "Run 'npm run build'",
      ],
      verificationSteps: [
        "Check /public/build/assets to confirm vendor chunks are generated",
        "Inspect DevTools Coverage tab to verify unused JS on landing page dropped below 10%",
        "Re-run SpeedPilot audit to confirm unused-javascript passes",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 16. React SPA Code-Splitting and Virtualization
  {
    id: "react-vite-lazy-virtualization",
    issueCode: "unused-javascript",
    techStack: "REACT",
    title: "Eliminate Unused JS in React SPA with React.lazy, Suspense, and Route Splitting",
    inputDescription: "Target: https://analytics-app.io - Flagged: /assets/index.js (1.1MB, 740KB unused on login/home route)",
    flaggedAssets: ["https://analytics-app.io/assets/index.js"],
    goldStandardOutput: {
      detectedStack: "REACT",
      explanationMarketer: "Visitors downloading your web app receive all dashboards and settings code upfront, causing a 2-second delay before the login screen appears.",
      explanationDeveloper: "Monolithic SPA bundle in Vite/Webpack contains all routes and modal components. Introduce React.lazy and Suspense for route-level chunking and deferred loading of heavy libraries like date-pickers and export dialogs.",
      explanationAgency: "Drops initial JavaScript bundle from 1.1MB to 160KB, improving mobile TBT and FCP into the green zone.",
      explanationSaaSTeam: "Establish strict route-based chunk budgets in frontend React architecture.",
      remediationCodeSnippet: `// src/App.tsx - Route-level code splitting with React.lazy
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';

// Lazy load route components so they only download when the user navigates:
const Home = lazy(() => import('./pages/Home'));
const Analytics = lazy(() => import('./pages/Analytics'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

export function App() {
  return (
    <div className="app-container">
      <Navigation />
      <Suspense fallback={<div className="h-64 flex items-center justify-center animate-pulse text-muted">Loading route...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </div>
  );
}`,
      implementationSteps: [
        "Wrap all route components in React.lazy(() => import('./pages/...'))",
        "Wrap <Routes> in a React <Suspense> boundary with a lightweight loading fallback",
        "Move heavy modals and third-party widgets into on-demand dynamic imports",
        "Run production build: 'npm run build'",
      ],
      verificationSteps: [
        "Check dist/assets to confirm chunks are separated by route",
        "Inspect Network waterfall on page load to confirm only initial chunk downloads",
        "Re-run SpeedPilot audit to verify TBT under 150ms",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 17. Shopify Klaviyo Interaction Deferral
  {
    id: "shopify-klaviyo-interaction-deferral",
    issueCode: "third-party-summary",
    techStack: "SHOPIFY",
    title: "Defer Heavy Klaviyo Onsite Tracking on Shopify until User Interaction",
    inputDescription: "Target: https://glow-skincare.myshopify.com - Flagged: static.klaviyo.com/onsite/js/klaviyo.js (340KB download, 520ms TBT impact on mobile initial load)",
    flaggedAssets: ["https://static.klaviyo.com/onsite/js/klaviyo.js"],
    goldStandardOutput: {
      detectedStack: "SHOPIFY",
      explanationMarketer: "Klaviyo's popup and newsletter tracking script downloads 340KB before your store even draws product photos. Delaying it until the shopper touches the screen cuts initial load time by half without losing a single signup.",
      explanationDeveloper: "Klaviyo onsite tracking bundle executes synchronously during initial page parsing, causing heavy compilation and long tasks. In Shopify layout/theme.liquid, load Klaviyo dynamically on the first user interaction event (pointerdown, scroll, touchstart) using passive listeners.",
      explanationAgency: "Saves 340KB of upfront JavaScript execution, directly cutting Total Blocking Time by 300-500ms on mobile.",
      explanationSaaSTeam: "Enforce vendor interaction-deferral patterns on marketing tags in Shopify themes.",
      remediationCodeSnippet: `<!-- layout/theme.liquid: Defer Klaviyo until first interaction -->
<script>
  (function() {
    var events = ['scroll', 'touchstart', 'mousemove', 'pointerdown'];
    function initKlaviyo() {
      if (window._klaviyoLoaded) return;
      window._klaviyoLoaded = true;
      events.forEach(function(e) { window.removeEventListener(e, initKlaviyo); });
      var s = document.createElement('script');
      s.src = 'https://static.klaviyo.com/onsite/js/klaviyo.js?company_id={{ settings.klaviyo_company_id }}';
      s.async = true;
      document.head.appendChild(s);
    }
    events.forEach(function(e) { window.addEventListener(e, initKlaviyo, { once: true, passive: true }); });
  })();
</script>`,
      implementationSteps: [
        "Open layout/theme.liquid and locate synchronous klaviyo.js script tags",
        "Replace with the interaction-deferred loader snippet above",
        "Verify that popup signups and tracking cookies still trigger as soon as the user touches the page",
      ],
      verificationSteps: [
        "Inspect Network waterfall on fresh page load: verify klaviyo.js is NOT downloaded until scroll or tap",
        "Re-run SpeedPilot audit to verify third-party-summary warnings clear",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 18. WordPress & Elementor DOM Size Reduction
  {
    id: "wordpress-dom-size-elementor",
    issueCode: "dom-size",
    techStack: "WORDPRESS",
    title: "Reduce Excessive DOM Size in WordPress & Elementor Themes",
    inputDescription: "Target: https://agency-wp.com - Flagged: Excessive DOM size with 1,840 nodes and depth of 36 nested divs",
    flaggedAssets: ["https://agency-wp.com/"],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "Your webpage has nearly 2,000 HTML elements stacked together. When phones try to calculate sizes and scroll, the screen stutters and drains battery.",
      explanationDeveloper: "Visual builders (Elementor/Divi) wrap every single widget in 4-6 redundant <div> layers (.elementor-widget-container, .elementor-element-populated). Enable Elementor 'Optimized DOM Output' & 'Flexbox Container' in Elementor Experiments, and apply 'content-visibility: auto' to offscreen footer sections.",
      explanationAgency: "Cuts DOM nodes from 1,840 to under 800, noticeably improving mobile scrolling smoothness and boosting PageSpeed score.",
      explanationSaaSTeam: "Enforce clean container practices in WordPress CMS design guidelines.",
      remediationCodeSnippet: `// 1. In your child theme's style.css:
/* Skip layout/rendering for below-the-fold sections until scrolled */
.elementor-location-footer,
.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}

// 2. In WordPress Admin -> Elementor -> Settings -> Features:
// - Enable "Flexbox Container" (replaces heavy Section/Column wrappers)
// - Enable "Optimized DOM Output" (strips redundant wrapper <div>s)
// - Enable "Optimized Gutenberg Loading"`,
      implementationSteps: [
        "Go to WP Admin -> Elementor -> Settings -> Features and turn ON 'Optimized DOM Output' and 'Flexbox Containers'",
        "Convert old section/column layouts to modern flexbox containers",
        "Add 'content-visibility: auto' to footer and bottom sections in child theme style.css",
      ],
      verificationSteps: [
        "Inspect DOM tree in DevTools: verify element depth is < 20",
        "Re-run SpeedPilot audit to confirm dom-size passes with < 800 nodes",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 19. Convert Heavy Animated GIFs to WebM / MP4
  {
    id: "custom-animated-gif-to-webm",
    issueCode: "efficient-animated-content",
    techStack: "CUSTOM",
    title: "Convert Heavy Animated GIFs to HTML5 WebM & MP4 Video",
    inputDescription: "Target: https://app-landing.io - Flagged: /assets/demo-workflow.gif (8.4MB download, blocks mobile cellular network for 3.2s)",
    flaggedAssets: ["https://app-landing.io/assets/demo-workflow.gif"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Your product demo GIF is 8.4MB, which eats user cellular data and takes 3 seconds to start playing. Converting this GIF to a silent looping video delivers the exact same visual at only 650KB—a 92% size savings.",
      explanationDeveloper: "Animated GIFs lack inter-frame compression and hardware decode support. Replace <img> with an HTML5 <video autoplay loop muted playsinline> tag serving WebM (VP9) and MP4 (H.264) with poster fallback.",
      explanationAgency: "Massive quick payload win. Instantly sheds 7-10MB from the total page weight.",
      explanationSaaSTeam: "Establish automated video transcoding for marketing media assets in CI.",
      remediationCodeSnippet: `<!-- Replace 8.4MB GIF with 650KB HTML5 Video -->
<video
  autoplay
  loop
  muted
  playsinline
  width="1200"
  height="675"
  poster="/assets/demo-workflow-poster.webp"
  class="w-full h-auto rounded-xl shadow-lg"
>
  <source src="/assets/demo-workflow.webm" type="video/webm">
  <source src="/assets/demo-workflow.mp4" type="video/mp4">
  Your browser does not support HTML5 video.
</video>

# FFmpeg terminal commands to convert GIF:
# WebM (ultra compact):
ffmpeg -i demo-workflow.gif -c:v libvpx-vp9 -b:v 0 -crf 32 demo-workflow.webm

# MP4 (universal Apple/Safari fallback):
ffmpeg -i demo-workflow.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" demo-workflow.mp4`,
      implementationSteps: [
        "Run the FFmpeg commands to produce .webm and .mp4 versions from your source .gif",
        "Generate a lightweight .webp poster image of the first frame",
        "Replace <img src='...gif'> with the <video autoplay loop muted playsinline> element",
      ],
      verificationSteps: [
        "Verify video autoplays silently without user gesture on iOS Safari and Android Chrome",
        "Check Network panel to confirm transfer size is < 1MB",
        "Re-run SpeedPilot audit to verify efficient-animated-content passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 20. Fix Non-Composited Animations
  {
    id: "custom-non-composited-animations",
    issueCode: "non-composited-animations",
    techStack: "CUSTOM",
    title: "Fix Stuttering Non-Composited CSS Animations using transform: translate3d",
    inputDescription: "Target: https://app-landing.io - Flagged: CSS keyframes animating 'left' and 'top' properties on .mobile-drawer, causing layout reflows on every frame",
    flaggedAssets: ["https://app-landing.io/styles/theme.css"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Mobile menus and sliding drawers stutter and drop frames when opening. Moving animation calculations onto the phone's graphics chip makes transitions feel silky smooth.",
      explanationDeveloper: "Animating positional properties ('top', 'left', 'width', 'height', 'margin') forces the browser to recalculate element geometry (Layout) and repaint pixels on every 16ms animation frame. Convert positional transitions to compositor-only properties ('transform' and 'opacity') and promote layers with 'will-change: transform'.",
      explanationAgency: "Guarantees 60fps/120fps fluid interaction on mobile devices, passing Google INP and animation audits.",
      explanationSaaSTeam: "Enforce GPU compositor property rules in design system style linter.",
      remediationCodeSnippet: `/* styles/theme.css - Smooth Compositor-Only Animation */

/* BAD: Triggers layout reflow and repaint on every frame */
/*
.mobile-drawer {
  position: fixed;
  left: -100%;
  transition: left 0.35s ease;
}
.mobile-drawer.is-open {
  left: 0;
}
*/

/* GOOD: Hardware-accelerated GPU transform */
.mobile-drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 320px;
  height: 100vh;
  transform: translate3d(-100%, 0, 0);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}

.mobile-drawer.is-open {
  transform: translate3d(0, 0, 0);
}`,
      implementationSteps: [
        "Locate transitions animating 'left', 'top', 'right', 'bottom', or 'margin'",
        "Convert to transform: translate3d(x, y, 0) or transform: scale()",
        "Add will-change: transform so the browser pre-promotes the element to a dedicated GPU compositor layer",
      ],
      verificationSteps: [
        "Open Chrome DevTools -> Rendering -> enable 'Paint flashing' and verify no green repaint rectangles flash during drawer animation",
        "Re-run SpeedPilot audit to verify non-composited-animations passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 21. Next.js bfcache Pagehide Migration
  {
    id: "nextjs-bfcache-pagehide-migration",
    issueCode: "bfcache",
    techStack: "NEXTJS",
    title: "Enable Instant Back/Forward Cache (bfcache) in Next.js",
    inputDescription: "Target: https://saas-dashboard.io - Flagged: Page cannot be restored from Back/Forward Cache due to unload event listeners in analytics helper",
    flaggedAssets: ["https://saas-dashboard.io/scripts/tracker.js"],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "When users click the browser 'Back' button, your app reloads from scratch instead of snapping open instantly from memory. Fixing bfcache eligibility makes back and forward clicks feel instantaneous (0ms).",
      explanationDeveloper: "The 'unload' event listener is deprecated and explicitly blocks the browser from preserving the page in bfcache. Migrate all session teardown and beacon dispatches to 'pagehide' or 'visibilitychange', and ensure HTML responses do not use 'Cache-Control: no-store'.",
      explanationAgency: "Transforms back-navigation from a 1.5s reload into a 0ms memory restoration, dramatically boosting perceived speed and user retention.",
      explanationSaaSTeam: "Enforce bfcache compliance across all client analytics libraries.",
      remediationCodeSnippet: `// lib/analytics.ts - Modern bfcache-compliant lifecycle hooks
export function initTelemetry() {
  // BAD: window.addEventListener('unload', flushTelemetry); // Blocks bfcache!

  // GOOD: Use pagehide with event.persisted check
  window.addEventListener('pagehide', (event) => {
    // navigator.sendBeacon guarantees transmission even during navigation
    navigator.sendBeacon('/api/telemetry', JSON.stringify({
      sessionDuration: performance.now(),
      persistedToBfcache: event.persisted,
    }));
  });

  // Also listen to visibilitychange for mobile backgrounding
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingEvents();
    }
  });
}`,
      implementationSteps: [
        "Search codebase for 'addEventListener(\"unload\")' and replace with 'pagehide'",
        "Use navigator.sendBeacon() for asynchronous teardown payloads",
        "Verify that Cache-Control on dynamic pages is 'private, no-cache, must-revalidate' rather than 'no-store'",
      ],
      verificationSteps: [
        "Open Chrome DevTools -> Application -> Back/forward cache and run 'Test back/forward cache'",
        "Verify status displays 'Successfully restored from back/forward cache'",
        "Re-run SpeedPilot audit to confirm bfcache pass",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 22. Deduplicate JavaScript & Remove Outdated Polyfills
  {
    id: "custom-duplicated-javascript-dedup",
    issueCode: "duplicated-javascript",
    techStack: "CUSTOM",
    title: "Deduplicate Conflicting Package Versions & Remove Legacy ES5 Polyfills",
    inputDescription: "Target: https://ecommerce-store.com - Flagged: Duplicate copies of lodash (v4.17.15 and v4.17.21) and legacy core-js polyfills consuming 280KB",
    flaggedAssets: ["https://ecommerce-store.com/assets/vendor.js"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Your site is accidentally downloading two copies of the same utility software and code built for 10-year-old Internet Explorer. Trimming these duplicates cuts 280KB of dead weight from mobile downloads.",
      explanationDeveloper: "Sub-dependencies require conflicting versions of popular libraries (e.g., Lodash), while outdated Babel presets inject regeneratorRuntime and ES5 shims. Enforce version resolutions in package.json and update browserslist to modern standards.",
      explanationAgency: "Clean 20-30% JS payload reduction with zero code rewrite.",
      explanationSaaSTeam: "Standardize browserslist and run npm dedupe in CI.",
      remediationCodeSnippet: `// 1. In package.json - Target modern browsers (drops legacy polyfills):
"browserslist": [
  "defaults and fully supports es6-module",
  "> 0.5%",
  "not dead"
],

// 2. In package.json - Force single resolution of duplicated libraries:
"overrides": {
  "lodash": "^4.17.21"
}

// 3. In bundler config (vite.config.ts / webpack.config.js):
resolve: {
  alias: {
    'lodash': 'lodash-es', // Replaces full CommonJS with tree-shakeable ESM
  },
}`,
      implementationSteps: [
        "Add package 'overrides' in package.json to force all sub-dependencies to share the same version",
        "Update 'browserslist' array in package.json",
        "Run 'npm dedupe && npm run build'",
      ],
      verificationSteps: [
        "Inspect build stats with rollup-plugin-visualizer: confirm only one Lodash instance is present",
        "Re-run SpeedPilot audit to verify duplicated-javascript passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "MEDIUM",
    },
  },

  // 23. Shopify Review Widget IntersectionObserver Facade
  {
    id: "shopify-review-widget-facade",
    issueCode: "third-party-facades",
    techStack: "SHOPIFY",
    title: "Implement Lazy IntersectionObserver Facade for Shopify Reviews Widget",
    inputDescription: "Target: https://boutique.myshopify.com - Flagged: cdn.judge.me/widget.js loading 480KB on initial paint for below-the-fold reviews",
    flaggedAssets: ["https://cdn.judge.me/widget.js"],
    goldStandardOutput: {
      detectedStack: "SHOPIFY",
      explanationMarketer: "Customer review widgets download half a megabyte of code upfront even though reviews sit at the very bottom of the product page. Delaying the reviews until shoppers actually scroll down makes product pages snap open instantly.",
      explanationDeveloper: "Third-party review widgets (Judge.me, Loox, Yotpo) execute heavy script evaluation during initial document parse. Replace synchronous liquid snippets with a lightweight star-rating placeholder and initialize the full widget script only when the reviews section approaches the viewport via IntersectionObserver.",
      explanationAgency: "Saves ~450KB of initial JS and cuts Total Blocking Time by 350ms on mobile product pages.",
      explanationSaaSTeam: "Standardize below-the-fold third-party app loading in Shopify Online Store 2.0 theme.",
      remediationCodeSnippet: `<!-- sections/product-reviews.liquid - IntersectionObserver Facade -->
<div id="product-reviews-section" class="reviews-wrapper min-h-[300px]">
  <!-- 1. Instant SVG Star Placeholder (Zero JS, 0ms layout shift) -->
  <div class="reviews-placeholder p-6 text-center text-muted">
    <div class="stars text-amber-400 text-xl">★★★★★</div>
    <p class="mt-2 text-sm text-gray-500">Loading verified customer reviews...</p>
  </div>

  <!-- 2. Lazy script loader -->
  <script>
    (function() {
      var section = document.getElementById('product-reviews-section');
      if (!section) return;
      var observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
          var s = document.createElement('script');
          s.src = 'https://cdn.judge.me/widget.js';
          s.async = true;
          document.head.appendChild(s);
          observer.disconnect();
        }
      }, { rootMargin: '350px' }); // Preload 350px before entering viewport
      observer.observe(section);
    })();
  </script>
</div>`,
      implementationSteps: [
        "Open sections/product-reviews.liquid in your Shopify theme",
        "Wrap the review widget inside an IntersectionObserver container with rootMargin: '350px'",
        "Render lightweight static star SVGs as the initial placeholder so the space is reserved",
      ],
      verificationSteps: [
        "Verify Network tab: confirm review script does NOT load until scrolling toward reviews",
        "Re-run SpeedPilot audit to verify third-party-facades passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 24. WordPress 6.8+ Speculative Loading Rules API
  {
    id: "wordpress-speculative-loading",
    issueCode: "server-response-time",
    techStack: "WORDPRESS",
    title: "Enable Speculative Loading Rules API in WordPress for Zero-Latency Navigations",
    inputDescription: "Target: https://news-magazine.com - Flagged: Subsequent page clicks incur 950ms TTFB delay before rendering next article",
    flaggedAssets: ["https://news-magazine.com/"],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "When visitors click links to read other articles on your site, they wait nearly a full second for the page to respond. Speculative loading pre-renders the next page in the background right as their finger hovers, making page changes instantaneous.",
      explanationDeveloper: "Modern Chrome/Edge browsers support the Speculation Rules API. In WordPress (via the official Performance Team Speculative Loading module or custom wp_head action), dispatch speculative prefetch/prerender rules so linked internal articles are pre-rendered into memory before click.",
      explanationAgency: "Delivers a lightning-fast 'app-like' browsing experience across the client's WordPress site.",
      explanationSaaSTeam: "Enforce next-gen Speculation Rules API across content portal themes.",
      remediationCodeSnippet: `// In functions.php (WordPress Speculation Rules API for Instant Navigations):
add_action('wp_head', function() {
    // Only pre-render internal public links for anonymous visitors:
    if (!is_user_logged_in()) {
        ?>
        <script type="speculationrules">
        {
          "prerender": [
            {
              "source": "document",
              "where": {
                "and": [
                  { "href_matches": "/*" },
                  { "not": { "href_matches": "/wp-admin/*" } },
                  { "not": { "href_matches": "/*\\?*(cart|checkout)*" } }
                ]
              },
              "eagerness": "moderate"
            }
          ]
        }
        </script>
        <?php
    }
}, 1);`,
      implementationSteps: [
        "Add the Speculation Rules snippet into functions.php (or install the official WordPress Performance Team 'Speculative Loading' plugin)",
        "Exclude admin, cart, and checkout paths from prerendering",
        "Verify that hover or pointerdown initiates speculative prerender",
      ],
      verificationSteps: [
        "Open Chrome DevTools -> Application -> Speculative Loads and click internal links",
        "Confirm pages load with status 'Successfully prerendered'",
        "Re-run SpeedPilot audit to verify instant subsequent navigation",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 25. WordPress LCP Hero Image Lazy-Load Removal
  {
    id: "wordpress-lcp-lazy-load-removal",
    issueCode: "lcp-lazy-loaded",
    techStack: "WORDPRESS",
    title: "Remove Accidental loading='lazy' from WordPress Hero Images",
    inputDescription: "Target: https://travel-journal.com - Flagged: Largest Contentful Paint image was lazily loaded via wp_filter_content_tags, adding 820ms render delay",
    flaggedAssets: ["https://travel-journal.com/wp-content/uploads/hero-mountain.webp"],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "Your main hero photo is marked as 'lazy load', which tells the browser to wait before downloading it. Removing this delay lets the hero picture show up instantly when visitors land on your site.",
      explanationDeveloper: "WordPress automatically attaches 'loading=\"lazy\"' to all content images via the 'wp_img_tag_add_loading_attr' filter. On the first above-the-fold image, this forces the browser to defer image fetch until layout calculation, increasing LCP render delay. Hook into 'wp_img_tag_add_loading_attr' and return false for the first image, or set 'loading' => 'eager' on the featured post thumbnail.",
      explanationAgency: "Instant LCP recovery. Eliminating lazy-loading on the hero banner shaves 600-900ms off mobile LCP.",
      explanationSaaSTeam: "Enforce strict eager loading rules for hero components in WordPress theme templates.",
      remediationCodeSnippet: `// In functions.php (WordPress Hero Image Eager Loading):

// 1. Disable core automatic lazy-loading on the primary featured image:
add_filter('wp_img_tag_add_loading_attr', function($value, $image, $context) {
    if (is_singular() && doing_filter('the_content') && false !== strpos($image, 'attachment-post-thumbnail')) {
        return false; // Strips loading="lazy" attribute completely
    }
    return $value;
}, 10, 3);

// 2. In single.php or page template: Explicitly set eager loading and high priority:
the_post_thumbnail('full', array(
    'loading'       => 'eager',
    'fetchpriority' => 'high',
    'decoding'      => 'async',
    'class'         => 'hero-featured-image',
));

// 3. Early high-priority preload in <head>:
add_action('wp_head', function() {
    if (is_singular() && has_post_thumbnail()) {
        $img = wp_get_attachment_image_src(get_post_thumbnail_id(), 'full');
        if ($img) {
            echo '<link rel="preload" as="image" href="' . esc_url($img[0]) . '" fetchpriority="high">' . "\\n";
        }
    }
}, 1);`,
      implementationSteps: [
        "Add the filter hook in functions.php to strip loading='lazy' from attachment-post-thumbnail",
        "Set loading='eager' and fetchpriority='high' on the_post_thumbnail call in single.php",
        "Inject early <link rel='preload'> in wp_head for singular posts",
      ],
      verificationSteps: [
        "Inspect page HTML: confirm hero <img> does NOT have loading='lazy'",
        "Re-run SpeedPilot audit to verify lcp-lazy-loaded audit passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 26. Next.js Partytown Web Worker Strategy
  {
    id: "nextjs-partytown-web-worker",
    issueCode: "total-blocking-time",
    techStack: "NEXTJS",
    title: "Offload Heavy Marketing Pixels to Web Workers via Partytown in Next.js",
    inputDescription: "Target: https://growth-fintech.io - Flagged: GTM and Meta Pixel consume 780ms of main thread Total Blocking Time (TBT)",
    flaggedAssets: ["https://growth-fintech.io/_next/static/chunks/scripts.js"],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "Third-party advertising and analytics trackers are freezing the browser for nearly a second while loading. Offloading them to background web workers frees 100% of the screen for tapping buttons and reading.",
      explanationDeveloper: "Third-party tracking scripts monopolize the browser main thread during hydration. In Next.js, configure Partytown via 'next/script' with strategy='worker' to execute GTM, Meta Pixel, and analytics inside a background Web Worker, cutting TBT to under 50ms.",
      explanationAgency: "Transforms Total Blocking Time from red (> 600ms) to pristine green (< 50ms) without removing a single analytics tag.",
      explanationSaaSTeam: "Implement Partytown web worker isolation for third-party tag management in Next.js production builds.",
      remediationCodeSnippet: `// 1. In next.config.mjs: Enable experimental nextScriptWorkers
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    nextScriptWorkers: true, // Enables Partytown web worker strategy
  },
};
export default nextConfig;

// 2. In app/layout.tsx: Use strategy="worker" on heavy tracking scripts:
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Executes completely off the main thread in a Web Worker! */}
        <Script
          src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX"
          strategy="worker"
        />
      </body>
    </html>
  );
}`,
      implementationSteps: [
        "In next.config.mjs, set experimental: { nextScriptWorkers: true }",
        "Run 'npm install @builder.io/partytown'",
        "Update third-party <Script> components in layout.tsx to strategy='worker'",
      ],
      verificationSteps: [
        "Check Performance tab in DevTools: verify main thread shows zero long tasks from GTM",
        "Re-run SpeedPilot audit to confirm TBT drops below 100ms",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 27. Font Metric Overrides for Zero CLS
  {
    id: "custom-font-metric-overrides-cls",
    issueCode: "cumulative-layout-shift",
    techStack: "CUSTOM",
    title: "Eliminate Font Swap Layout Shifts (CLS) with size-adjust and Metric Overrides",
    inputDescription: "Target: https://clean-saas.com - Flagged: Font swap causes 0.14 CLS when custom Roboto webfont replaces system Arial",
    flaggedAssets: ["https://clean-saas.com/fonts/roboto-regular.woff2"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "When your custom brand font finishes downloading, words jump slightly on the page because the placeholder font has different character widths. Adjusting the fallback font metrics locks text in place, eliminating the jump.",
      explanationDeveloper: "Font swap FOUT triggers Cumulative Layout Shift because the fallback font's glyph bounding boxes (ascent, descent, x-height) differ from the web font. Use modern CSS '@font-face' metric overrides ('size-adjust', 'ascent-override', 'descent-override') to scale the fallback system font to match the web font dimensions exactly.",
      explanationAgency: "Drops CLS from 0.14 into the perfect green zone (0.01), satisfying Core Web Vitals ranking requirements.",
      explanationSaaSTeam: "Integrate font metric overrides into typography tokens in design system.",
      remediationCodeSnippet: `/* styles/fonts.css - Zero Layout Shift Font Fallback Matching */

/* 1. Primary Custom Web Font */
@font-face {
  font-family: 'Roboto';
  src: url('/fonts/roboto-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* 2. Overridden Arial Fallback matching Roboto's exact vertical & horizontal metrics */
@font-face {
  font-family: 'Roboto-Fallback';
  src: local('Arial');
  ascent-override: 92.77%;
  descent-override: 24.41%;
  line-gap-override: 0%;
  size-adjust: 100.25%;
}

/* 3. Apply the pair together across body typography */
body {
  font-family: 'Roboto', 'Roboto-Fallback', system-ui, sans-serif;
}`,
      implementationSteps: [
        "Calculate metric overrides using a tool like Fontaine or @next/font fallback generator",
        "Add the fallback @font-face with size-adjust and ascent-override to fonts.css",
        "List the fallback font immediately after the primary web font in CSS font-family",
      ],
      verificationSteps: [
        "Slow network down to Slow 3G in DevTools and toggle web font on/off",
        "Verify zero layout shifting occurs when the font swaps",
        "Re-run SpeedPilot audit to confirm CLS drops to ≤ 0.01",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 28. React LoAF & Deferred INP Optimization
  {
    id: "react-loaf-inp-diagnostics",
    issueCode: "interaction-to-next-paint",
    techStack: "REACT",
    title: "Pinpoint and Fix Long Animation Frame (LoAF) Bottlenecks for INP in React",
    inputDescription: "Target: https://analytics-portal.io - Flagged: Interaction to Next Paint is 420ms on dashboard table filter controls",
    flaggedAssets: ["https://analytics-portal.io/src/Table.tsx"],
    goldStandardOutput: {
      detectedStack: "REACT",
      explanationMarketer: "When users click filters on your data tables, the screen freezes for nearly half a second before updating. Breaking up table rendering calculations keeps button clicks snappy and responsive.",
      explanationDeveloper: "Long Animation Frames (LoAF) exceeding 50ms occur during synchronous array filtering and re-rendering of large DOM lists. Use the modern Long Animation Frame API for real-user monitoring, and wrap filter updates inside React.useDeferredValue and startTransition with scheduler.yield() chunking.",
      explanationAgency: "Cuts INP latency from 420ms to 75ms on heavy data-dense enterprise dashboards.",
      explanationSaaSTeam: "Establish LoAF production telemetry in performance monitoring dashboard.",
      remediationCodeSnippet: `// src/components/DataTable.tsx - Non-blocking Filter with useDeferredValue
import React, { useState, useTransition, useDeferredValue } from 'react';

export function FilterableTable({ rawData }: { rawData: any[] }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // Filter computation runs concurrently without blocking user typing:
  const filteredItems = React.useMemo(() => {
    return rawData.filter(item => 
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [rawData, deferredQuery]);

  return (
    <div className="table-wrapper">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter records..."
        className="input-field"
      />
      {query !== deferredQuery && (
        <span className="text-xs text-muted">Updating results...</span>
      )}
      <div className="table-body">
        {filteredItems.slice(0, 50).map(item => (
          <div key={item.id} className="table-row">{item.name}</div>
        ))}
      </div>
    </div>
  );
}`,
      implementationSteps: [
        "Replace immediate query state in expensive useMemo calculations with React.useDeferredValue",
        "Add a deferred update indicator so users see tactile response immediately",
        "Slice rendered DOM nodes to maximum 50 elements or virtualize with @tanstack/react-virtual",
      ],
      verificationSteps: [
        "In DevTools Performance tab, record typing in filter with 4x CPU throttle",
        "Confirm INP remains under 100ms with zero long tasks",
        "Re-run SpeedPilot audit to verify INP passes",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 29. Next.js 15 Partial Prerendering (PPR) & Streaming SSR
  {
    id: "nextjs-ppr-streaming-ttfb",
    issueCode: "server-response-time",
    techStack: "NEXTJS",
    title: "Optimize Next.js 15 TTFB with Partial Prerendering (PPR) & Suspense Streaming",
    inputDescription: "Target: https://platform-saas.com - Flagged: Server Response Time is 1,240ms on account dashboard due to synchronous dynamic session checks",
    flaggedAssets: ["https://platform-saas.com/dashboard"],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "Your platform waits for slow user database queries before showing anything on screen, giving visitors a blank white page for over a second. Delivering an instant page shell lets users see navigation and branding in under 50ms while their account details stream in.",
      explanationDeveloper: "Synchronous dynamic cookies() or auth() calls opt the entire page into dynamic server rendering, destroying edge CDN caching. In Next.js 15, enable Partial Prerendering (PPR) in next.config.mjs and isolate dynamic components inside <Suspense fallback={<Skeleton />}>, allowing the static shell to be served from edge cache in < 40ms.",
      explanationAgency: "Drops Time to First Byte from 1,240ms to 45ms, propelling mobile Core Web Vitals to a 95+ score.",
      explanationSaaSTeam: "Implement Partial Prerendering architecture across all authenticated application routes.",
      remediationCodeSnippet: `// 1. In next.config.mjs: Enable Partial Prerendering
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: 'incremental',
  },
};
export default nextConfig;

// 2. In app/dashboard/page.tsx:
import { Suspense } from 'react';
import { StaticNavigation } from '@/components/StaticNavigation';
import { UserProfile, ProfileSkeleton } from '@/components/UserProfile';

export const experimental_ppr = true; // Enables PPR on this route

export default function DashboardPage() {
  return (
    <div className="dashboard-layout">
      {/* Static layout delivered instantly (< 50ms TTFB) from Edge CDN: */}
      <StaticNavigation />

      <main className="content">
        <h1>Welcome Back</h1>
        {/* Dynamic user data streams concurrently without blocking TTFB: */}
        <Suspense fallback={<ProfileSkeleton />}>
          <UserProfile />
        </Suspense>
      </main>
    </div>
  );
}`,
      implementationSteps: [
        "In next.config.mjs, set experimental.ppr = 'incremental'",
        "Add export const experimental_ppr = true in the route file",
        "Wrap dynamic async database components in React <Suspense> boundaries with skeleton loaders",
      ],
      verificationSteps: [
        "Run 'npm run build && npm run start'",
        "Run 'curl -I -o /dev/null -s -w 'TTFB: %{time_starttransfer}s\n' http://localhost:3000/dashboard' and confirm < 0.05s",
        "Re-run SpeedPilot audit to verify server-response-time passes",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 30. WooCommerce Transients Caching & Database Indexing
  {
    id: "woocommerce-query-transients-index",
    issueCode: "server-response-time",
    techStack: "WOOCOMMERCE",
    title: "Speed Up WooCommerce Catalog TTFB with Transients Caching and Postmeta Indexing",
    inputDescription: "Target: https://gear-store.com - Flagged: Product archive TTFB takes 2,150ms due to unindexed postmeta filtering queries",
    flaggedAssets: ["https://gear-store.com/shop/"],
    goldStandardOutput: {
      detectedStack: "WOOCOMMERCE",
      explanationMarketer: "Online shoppers wait over 2 seconds just for catalog pages to respond. Speeding up product filtering makes browsing effortless and prevents abandoned shopping sessions.",
      explanationDeveloper: "Faceted WooCommerce searches filter by custom attributes (size, color, brand) stored in 'wp_postmeta'. Without composite indexes, MySQL executes full table scans on millions of rows. Add an index to 'wp_postmeta(post_id, meta_key(191))' and cache complex catalog queries in Redis transients.",
      explanationAgency: "Reduces catalog TTFB from 2.1s to < 220ms, recovering conversions on high-SKU stores.",
      explanationSaaSTeam: "Apply database indexing and transient query caching to all WooCommerce deployments.",
      remediationCodeSnippet: `// 1. In functions.php: Cache faceted product counts using WooCommerce Transients:
add_filter('woocommerce_product_subcategories_args', function($args) {
    $args['cache_results'] = true;
    return $args;
});

// Cache custom brand/attribute queries:
function get_cached_category_products($term_id) {
    $cache_key = 'wc_cat_products_' . $term_id;
    $products = get_transient($cache_key);
    if (false === $products) {
        $products = wc_get_products(array(
            'category' => array($term_id),
            'limit'    => 24,
            'status'   => 'publish',
        ));
        set_transient($cache_key, $products, 3600); // Cache for 1 hour
    }
    return $products;
}

// 2. Run in MySQL / phpMyAdmin terminal:
// ALTER TABLE wp_postmeta ADD INDEX post_id_meta_key (post_id, meta_key(191));`,
      implementationSteps: [
        "Execute the ALTER TABLE SQL statement in phpMyAdmin or MySQL CLI to create the composite index",
        "Add the subcategory query caching filter into child theme functions.php",
        "Enable Redis Object Caching in wp-config.php so transients are stored in memory",
      ],
      verificationSteps: [
        "In MySQL, run EXPLAIN on the product filter query and verify type is 'ref' rather than 'ALL'",
        "Run SpeedPilot audit on category URL and confirm TTFB drops under 300ms",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 31. Shopify Theme App Embed Isolation
  {
    id: "shopify-app-embed-conditional-loading",
    issueCode: "unused-javascript",
    techStack: "SHOPIFY",
    title: "Conditionally Load Shopify App Embeds to Eliminate Dead Scripts on Landing Pages",
    inputDescription: "Target: https://nordic-wear.myshopify.com - Flagged: /cdn/apps/loyalty-and-reviews.js (420KB unused code executed on homepage)",
    flaggedAssets: ["https://nordic-wear.myshopify.com/cdn/apps/loyalty-and-reviews.js"],
    goldStandardOutput: {
      detectedStack: "SHOPIFY",
      explanationMarketer: "Loyalty point and product review apps are downloading hundreds of kilobytes on your store's homepage where they aren't even used. Loading apps only where needed keeps the home screen snap-fast.",
      explanationDeveloper: "Third-party Shopify Theme App Extensions often inject global scripts on every route by default. Wrap app snippet renders with Liquid page type checks (e.g., 'template.name == \"product\"') and defer non-critical app blocks using requestIdleCallback.",
      explanationAgency: "Saves 350-500KB of unnecessary JavaScript execution on home and collection landing pages.",
      explanationSaaSTeam: "Audit Theme App Extension surface area in Shopify Online Store 2.0 theme.",
      remediationCodeSnippet: `<!-- 1. In layout/theme.liquid: Conditionally isolate app embeds by route -->
{%- if template.name == 'product' -%}
  <!-- Load review and size chart apps ONLY on single product pages: -->
  {% render 'app-reviews-block' %}
  {% render 'app-size-recommender' %}
{%- endif -%}

{%- if template.name == 'cart' or template.name == 'checkout' -%}
  <!-- Load loyalty rewards ONLY when shopper is ready to check out: -->
  {% render 'app-loyalty-rewards' %}
{%- endif -%}

<!-- 2. Defer remaining app embeds to browser idle time: -->
<script>
  window.addEventListener('load', function() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function() {
        document.dispatchEvent(new CustomEvent('shopify:apps:idle'));
      });
    }
  });
</script>`,
      implementationSteps: [
        "Audit layout/theme.liquid and locate third-party app render blocks",
        "Wrap single-purpose app embeds inside {% if template.name == '...' %} conditionals",
        "Dispatch custom event on idle for non-critical widgets",
      ],
      verificationSteps: [
        "Load homepage with Chrome DevTools Coverage tab open: confirm unused app JS drops by 400KB+",
        "Re-run SpeedPilot audit to verify unused-javascript passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 32. HTTP 103 Early Hints
  {
    id: "custom-http-103-early-hints",
    issueCode: "network-dependency-tree-insight",
    techStack: "CUSTOM",
    title: "Implement HTTP 103 Early Hints to Download CSS & Fonts During Server TTFB",
    inputDescription: "Target: https://enterprise-saas.com - Flagged: Critical CSS and hero font download starts 800ms late due to serial HTML delivery waterfall",
    flaggedAssets: ["https://enterprise-saas.com/css/critical.css", "https://enterprise-saas.com/fonts/inter.woff2"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Browsers currently wait for the server to finish generating the full web page before they even start downloading fonts and stylesheets. Early Hints tell the browser to begin downloading styling immediately, shaving hundreds of milliseconds off page load.",
      explanationDeveloper: "Dispatching 'HTTP 103 Early Hints' with 'Link: <...>; rel=preload' allows compatible browsers (Chrome, Edge, Safari 17+) to begin fetching critical CSS and fonts in parallel while the backend server generates the HTML response.",
      explanationAgency: "Cuts 300-600ms of critical request waterfall delay across international CDN edges.",
      explanationSaaSTeam: "Enable HTTP 103 Early Hints at CDN edge (Cloudflare / Fastly) and origin reverse proxy.",
      remediationCodeSnippet: `# 1. Server HTTP 103 Early Hints Header (Cloudflare / Fastly / Nginx):
HTTP/1.1 103 Early Hints
Link: </css/critical.css>; rel=preload; as=style
Link: </fonts/inter.woff2>; rel=preload; as=font; crossorigin

# 2. In Cloudflare Dashboard:
# Speed -> Optimization -> Content Optimization -> Enable "Early Hints" (ON)

# 3. In Nginx (version 1.25+ with Early Hints module):
# location / {
#   add_header Link "</css/critical.css>; rel=preload; as=style";
#   add_header Link "</fonts/inter.woff2>; rel=preload; as=font; crossorigin";
# }`,
      implementationSteps: [
        "In Cloudflare Dashboard, navigate to Speed -> Optimization and toggle 'Early Hints' to ON",
        "Ensure origin server emits Link headers with rel=preload for the 1-2 critical stylesheets and fonts",
        "Verify browser receives 103 status code before the final 200 OK",
      ],
      verificationSteps: [
        "Run 'curl -I -X GET --http2 https://enterprise-saas.com' and verify 103 Early Hints is returned",
        "Re-run SpeedPilot audit to verify critical-request-chains latency reduction",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 33. Next.js Link Prefetch Network Budget Control
  {
    id: "nextjs-link-prefetch-budget",
    issueCode: "unused-javascript",
    techStack: "NEXTJS",
    title: "Disable Aggressive Link Viewport Prefetching on Long Lists in Next.js",
    inputDescription: "Target: https://product-catalog.io - Flagged: 38 route chunk files downloaded in parallel on home feed, consuming 1.8MB cellular data",
    flaggedAssets: ["https://product-catalog.io/_next/static/chunks/app/product/[id].js"],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "Your website downloads every product page in the background before anyone even touches them, wasting user cellular data and stalling initial page rendering.",
      explanationDeveloper: "Next.js <Link> components automatically prefetch destination route chunks whenever they enter the viewport. In feeds, tables, and footers, this downloads dozens of route bundles simultaneously. Set prefetch={false} on below-the-fold links so routes only download when the user hovers or taps.",
      explanationAgency: "Saves 1.5MB+ of background data transfer on mobile, eliminating network congestion during initial paint.",
      explanationSaaSTeam: "Enforce prefetch={false} on high-cardinality link lists in Next.js component guidelines.",
      remediationCodeSnippet: `// components/ProductFeed.tsx - Selective Prefetching
import Link from 'next/link';

export function ProductGrid({ products }: { products: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {products.map((item, index) => (
        <article key={item.id} className="product-card">
          {/*
            prefetch={index < 4 ? true : false}
            Only prefetch the top 4 visible cards; disable for the rest
            to prevent downloading dozens of route chunks at once!
          */}
          <Link
            href={\`/products/\${item.slug}\`}
            prefetch={index < 4}
            className="block group"
          >
            <img src={item.thumbnail} alt={item.title} loading="lazy" />
            <h3>{item.title}</h3>
          </Link>
        </article>
      ))}
    </div>
  );
}`,
      implementationSteps: [
        "Audit large lists and navigation menus for standard <Link> components",
        "Add prefetch={false} to below-the-fold cards and footer links",
        "Retain prefetch={true} (or default) only for primary CTA and top navbar links",
      ],
      verificationSteps: [
        "Open Network panel in DevTools and scroll down: confirm route chunks are NOT downloaded until hover",
        "Re-run SpeedPilot audit to verify unused-javascript warnings decrease",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 34. Shopify Critical CSS Inlining & Async Theme CSS
  {
    id: "shopify-critical-css-inlining",
    issueCode: "render-blocking-resources",
    techStack: "SHOPIFY",
    title: "Inline Critical CSS and Load theme.css Asynchronously in Shopify",
    inputDescription: "Target: https://fashion-hub.myshopify.com - Flagged: /assets/theme.css (260KB render-blocking stylesheet stalling FCP by 740ms)",
    flaggedAssets: ["https://fashion-hub.myshopify.com/cdn/shop/t/1/assets/theme.css"],
    goldStandardOutput: {
      detectedStack: "SHOPIFY",
      explanationMarketer: "Visitors on mobile wait through a blank screen while Shopify downloads your entire store stylesheet. Inlining critical header styling makes text and products appear immediately.",
      explanationDeveloper: "Liquid 'stylesheet_tag' outputs a synchronous blocking <link rel='stylesheet'> in <head>. Extract header and hero styles into an inlined snippet, then load the full theme.css asynchronously using media='print' onload=\"this.media='all'\".",
      explanationAgency: "Cuts 700ms of mobile render-blocking delay, moving First Contentful Paint into the top 10% tier.",
      explanationSaaSTeam: "Enforce critical CSS separation in Shopify Online Store 2.0 theme builds.",
      remediationCodeSnippet: `<!-- 1. In layout/theme.liquid <head>: -->
<!-- Inline above-the-fold Critical CSS (< 14KB) directly in HTML: -->
<style>
  {% render 'critical-header-hero.css' %}
</style>

<!-- 2. Asynchronously load the remaining theme styling without blocking parsing: -->
<link rel="preload" href="{{ 'theme.css' | asset_url }}" as="style">
<link
  rel="stylesheet"
  href="{{ 'theme.css' | asset_url }}"
  media="print"
  onload="this.media='all'"
>
<noscript>
  {{ 'theme.css' | asset_url | stylesheet_tag }}
</noscript>`,
      implementationSteps: [
        "Extract above-the-fold header, navigation, and hero typography into snippets/critical-header-hero.css.liquid",
        "Replace {{ 'theme.css' | asset_url | stylesheet_tag }} with the non-blocking media='print' pattern",
        "Ensure <noscript> fallback is preserved for crawlers",
      ],
      verificationSteps: [
        "Inspect page in Chrome DevTools with 3G throttling: verify page renders text before theme.css finishes downloading",
        "Re-run SpeedPilot audit to verify render-blocking-resources clears",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 35. Smart Preconnect vs DNS-Prefetch
  {
    id: "custom-preconnect-vs-dns-prefetch",
    issueCode: "uses-rel-preconnect",
    techStack: "CUSTOM",
    title: "Prioritize Critical Preconnect (Max 2-3) and Use DNS-Prefetch for Secondary Origins",
    inputDescription: "Target: https://saas-portal.com - Flagged: 12 preconnect links in <head> exhausting browser socket limits",
    flaggedAssets: ["https://saas-portal.com/index.html"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Too many pre-connection requests can choke mobile connections. Streamlining connection hints ensures the browser prioritizes downloading your actual website content first.",
      explanationDeveloper: "Each <link rel='preconnect'> triggers full DNS lookup, TCP handshake, and TLS negotiation, consuming browser socket pools and memory. Keep 'preconnect' strictly to the top 2-3 critical origins needed for initial paint (e.g. fonts.gstatic.com, primary CDN). Use lightweight 'dns-prefetch' for secondary tracking domains.",
      explanationAgency: "Prevents socket starvation and accelerates initial TLS connections by 200-400ms.",
      explanationSaaSTeam: "Establish strict head tag hygiene rules in production CI templates.",
      remediationCodeSnippet: `<!-- HTML <head>: Balanced Connection Hints -->

<!-- 1. Full Preconnect ONLY for critical above-the-fold assets (Max 2-3 origins): -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.mysite.com" crossorigin>

<!-- 2. DNS-Prefetch for secondary third-party tools (Low CPU & zero socket lock): -->
<link rel="dns-prefetch" href="https://www.google-analytics.com">
<link rel="dns-prefetch" href="https://connect.facebook.net">
<link rel="dns-prefetch" href="https://static.hotjar.com">`,
      implementationSteps: [
        "Audit <head> and remove preconnect tags for non-critical third-party analytics",
        "Keep preconnect exclusively for critical font and image hosts needed on first paint",
        "Convert analytics, pixel, and chat domains to <link rel='dns-prefetch'>",
      ],
      verificationSteps: [
        "Inspect DevTools Network waterfall: verify DNS lookups are pre-resolved without blocking asset downloads",
        "Re-run SpeedPilot audit to confirm uses-rel-preconnect passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "MEDIUM",
    },
  },

  // 36. LocalStorage Bootup Thread Blocking
  {
    id: "custom-localstorage-bootup-blocking",
    issueCode: "bootup-time",
    techStack: "CUSTOM",
    title: "Eliminate Synchronous LocalStorage Main Thread Blocking on Bootup",
    inputDescription: "Target: https://webapp-auth.io - Flagged: 45 synchronous localStorage read/write operations during page bootup, blocking main thread for 180ms",
    flaggedAssets: ["https://webapp-auth.io/dist/app.js"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Reading settings from the user's phone storage synchronously halts the browser before it can draw the screen. Deferring storage reads makes the initial page snap open instantly.",
      explanationDeveloper: "localStorage is a synchronous, blocking API. Reading multiple large JSON blobs during application bootstrap locks the main thread for 100-300ms on low/mid-tier mobile devices. Consolidate keys into a single cached memory object or migrate heavy caches to asynchronous IndexedDB (via idb-keyval).",
      explanationAgency: "Cuts 150-250ms of bootup execution time, directly improving Total Blocking Time (TBT).",
      explanationSaaSTeam: "Enforce asynchronous client storage standards in frontend core libraries.",
      remediationCodeSnippet: `// 1. BAD: Synchronous, blocking calls scattered across components:
// const theme = localStorage.getItem('theme');
// const user = JSON.parse(localStorage.getItem('user_profile'));
// const cart = JSON.parse(localStorage.getItem('cart_items'));

// 2. GOOD: Read once on bootup into an in-memory cache, or use async IndexedDB:
import { get, set } from 'idb-keyval'; // 600-byte async IndexedDB wrapper

// Asynchronous non-blocking storage helper:
export async function getStoredUserSession() {
  if (typeof window === 'undefined') return null;
  // IndexedDB operations run on a background thread without locking UI:
  return await get('user_session');
}

// Or defer non-critical localStorage reads to browser idle:
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    const analyticsHistory = localStorage.getItem('analytics_history');
    processAnalytics(analyticsHistory);
  });
}`,
      implementationSteps: [
        "Audit bootup code for repeated synchronous localStorage.getItem calls",
        "Migrate heavy data objects (> 10KB) to asynchronous IndexedDB using 'idb-keyval'",
        "Wrap non-critical storage queries in requestIdleCallback",
      ],
      verificationSteps: [
        "In Chrome DevTools Performance tab, verify zero 'localStorage' long tasks appear during bootup",
        "Re-run SpeedPilot audit to verify bootup-time improvement",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 37. WordPress Iframe Lazy-Loading
  {
    id: "wordpress-iframe-lazy-load",
    issueCode: "third-party-summary",
    techStack: "WORDPRESS",
    title: "Lazy-Load Offscreen Third-Party Iframes (YouTube / Maps) in WordPress",
    inputDescription: "Target: https://travel-agency.com - Flagged: Offscreen YouTube video and Google Maps iframes download 1.8MB scripts on initial paint",
    flaggedAssets: ["https://www.youtube.com/embed/xyz123", "https://maps.googleapis.com/maps/api/js"],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "Embedded YouTube videos and interactive maps at the bottom of your page download megabytes of code upfront, freezing phones before visitors even start reading.",
      explanationDeveloper: "Offscreen iframes lack 'loading=\"lazy\"', triggering early resource loading for heavyweight vendor SDKs. In WordPress, hook into 'wp_filter_oembed_result' and 'the_content' to inject 'loading=\"lazy\"' and title attributes on all embedded iframes.",
      explanationAgency: "Cuts 1.5MB+ of initial payload and reduces Total Blocking Time by 300ms on media-heavy pages.",
      explanationSaaSTeam: "Enforce native iframe lazy loading in CMS content filters.",
      remediationCodeSnippet: `// In functions.php (WordPress Native Iframe Lazy Loading):

// 1. Automatically add loading="lazy" to all oEmbed iframes (YouTube, Vimeo, etc.):
add_filter('wp_filter_oembed_result', function($html) {
    if (false !== strpos($html, '<iframe') && false === strpos($html, 'loading=')) {
        return str_replace('<iframe', '<iframe loading="lazy"', $html);
    }
    return $html;
}, 10, 1);

// 2. Add loading="lazy" to arbitrary manual iframes inside post content:
add_filter('the_content', function($content) {
    return preg_replace('/<iframe(?![^>]*loading=)/i', '<iframe loading="lazy"', $content);
}, 20);`,
      implementationSteps: [
        "Add the oEmbed and content filter hooks in child theme functions.php",
        "Verify all video embeds and maps render with loading='lazy' in DOM inspector",
        "Confirm videos load smoothly when scrolled into view",
      ],
      verificationSteps: [
        "Inspect Network tab on initial load: confirm YouTube vendor scripts do NOT download until scrolling near the video",
        "Re-run SpeedPilot audit to verify third-party-summary passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 38. Next.js Server-Timing Telemetry
  {
    id: "nextjs-server-timing-telemetry",
    issueCode: "server-response-time",
    techStack: "NEXTJS",
    title: "Measure and Expose Backend Performance Bottlenecks with Server-Timing Headers",
    inputDescription: "Target: https://enterprise-saas.com - Flagged: Server Response Time is 1,650ms with no granular visibility into DB, Redis, or API delays",
    flaggedAssets: ["https://enterprise-saas.com/api/data"],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "Your servers are slow to respond, but without measurement you're guessing what to fix. Server-timing headers measure the exact delay from each backend component so developers fix the right bottleneck immediately.",
      explanationDeveloper: "High TTFB is opaque without server-side telemetry. Emit the W3C 'Server-Timing' HTTP response header from Next.js middleware and API routes to expose database query time, cache lookups, and authentication latency directly in DevTools and SpeedPilot.",
      explanationAgency: "Enables instant root-cause identification of server lag, separating database slowness from network or CDN issues.",
      explanationSaaSTeam: "Standardize Server-Timing telemetry across microservices and edge gateways.",
      remediationCodeSnippet: `// middleware.ts - Next.js Server-Timing Telemetry
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const start = performance.now();
  const response = NextResponse.next();

  // Simulate internal timing metrics:
  const duration = (performance.now() - start).toFixed(1);

  // W3C Server-Timing header (readable by Chrome DevTools & Lighthouse):
  response.headers.set(
    'Server-Timing',
    \`edge;dur=\${duration};desc="Edge Routing", cache;desc="MISS"\`
  );

  return response;
}`,
      implementationSteps: [
        "Instrument database queries and external fetch calls with performance.now()",
        "Construct and append the Server-Timing header to the HTTP response",
        "Inspect Chrome DevTools Network tab -> Timing -> Server Timing to see exact breakdowns",
      ],
      verificationSteps: [
        "Run 'curl -I https://enterprise-saas.com' and verify 'Server-Timing' header is returned",
        "Inspect SpeedPilot diagnostic breakdown to locate sub-millisecond bottlenecks",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 39. CSS Containment for Interaction Jank
  {
    id: "react-css-containment-jank",
    issueCode: "mainthread-work-breakdown",
    techStack: "REACT",
    title: "Eliminate Full-Page Layout Reflows Using CSS Containment (contain: content)",
    inputDescription: "Target: https://dashboard-app.io - Flagged: 240ms layout recalculation during sidebar toggle and notifications popup",
    flaggedAssets: ["https://dashboard-app.io/src/Sidebar.tsx"],
    goldStandardOutput: {
      detectedStack: "REACT",
      explanationMarketer: "Opening a menu or clicking a dropdown causes the entire web page to stutter because the phone recalculates the position of every single element on the screen.",
      explanationDeveloper: "DOM tree mutations trigger document-wide layout reflows when container boundaries are undefined. Apply 'contain: layout style paint;' (or 'contain: content;') to independent UI widgets (sidebars, cards, modals) so browser reflows remain confined strictly to that component's sub-tree.",
      explanationAgency: "Eliminates interaction jank and cuts style recalculation time by 60-80% during user clicks.",
      explanationSaaSTeam: "Incorporate CSS containment into design system primitive wrappers.",
      remediationCodeSnippet: `/* styles/components.css - CSS Containment for Fast Interactions */

/* Isolate independent card or list items so their layout never triggers full-page reflow */
.feed-item,
.dashboard-widget {
  contain: content; /* Equates to: contain: layout paint style; */
}

/* Isolate sliding off-canvas drawers and dialogs */
.drawer-container,
.modal-overlay {
  contain: layout paint;
  will-change: transform;
}`,
      implementationSteps: [
        "Identify high-frequency dynamic components (dropdowns, dialogs, feed cards)",
        "Add 'contain: content' or 'contain: layout paint' in stylesheet",
        "Verify that absolute/fixed positioning inside the container does not leak outside expected boundaries",
      ],
      verificationSteps: [
        "Open Chrome DevTools Performance panel, trigger interaction, and verify 'Recalculate Style' covers < 20 elements instead of the whole DOM",
        "Re-run SpeedPilot audit to confirm mainthread-work-breakdown drops",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 40. Shopify Brand Font Display Swap & Preload
  {
    id: "shopify-font-display-swap-preload",
    issueCode: "font-display-insight",
    techStack: "SHOPIFY",
    title: "Add font-display: swap and High-Priority Preloading for Shopify Brand Fonts",
    inputDescription: "Target: https://jewelry-store.myshopify.com - Flagged: Header typography font causes 480ms Flash of Invisible Text (FOIT) on mobile",
    flaggedAssets: ["https://jewelry-store.myshopify.com/cdn/fonts/playfair.woff2"],
    goldStandardOutput: {
      detectedStack: "SHOPIFY",
      explanationMarketer: "Headlines on your store disappear completely while brand fonts download, leaving blank gaps for half a second. Swapping to a system font immediately keeps customers reading without delay.",
      explanationDeveloper: "Default Liquid 'font_face' outputs @font-face rules without 'font-display: swap', blocking text rendering. In Shopify 2.0 theme.liquid, pass 'font_display: \"swap\"' to font_face and inject an early <link rel='preload' as='font'> in <head>.",
      explanationAgency: "Eliminates blank headline flashes and recovers 300-500ms of First Contentful Paint latency.",
      explanationSaaSTeam: "Enforce font_display: swap across Shopify theme settings schemas.",
      remediationCodeSnippet: `<!-- In layout/theme.liquid <head>: -->

<!-- 1. Preload primary header WOFF2 font with high priority: -->
<link
  rel="preload"
  as="font"
  href="{{ settings.type_header_font | font_url }}"
  type="font/woff2"
  crossorigin
>

<!-- 2. Apply font-display: swap in Liquid font_face filter: -->
<style>
  {{ settings.type_header_font | font_face: font_display: 'swap' }}
  {{ settings.type_base_font | font_face: font_display: 'swap' }}
</style>`,
      implementationSteps: [
        "Locate where {{ settings.type_header_font | font_face }} is rendered in layout/theme.liquid",
        "Add the parameter: font_display: 'swap'",
        "Inject <link rel='preload' as='font' type='font/woff2' href='{{ ... | font_url }}' crossorigin> right after opening <head>",
      ],
      verificationSteps: [
        "In DevTools Network tab with Slow 3G, confirm text displays immediately using fallback font",
        "Re-run SpeedPilot audit to verify font-display-insight passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 41. Next.js Tailwind CSS Purging & Glob Optimization
  {
    id: "nextjs-tailwind-unused-css-purge",
    issueCode: "unused-css-rules",
    techStack: "NEXTJS",
    title: "Eliminate Unused Tailwind CSS via Strict Content Scanning in Next.js",
    inputDescription: "Target: https://growth-saas.com - Flagged: /_next/static/css/app.css contains 180KB of unused CSS selectors",
    flaggedAssets: ["https://growth-saas.com/_next/static/css/app.css"],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "Your website downloads thousands of style rules that are never used on this page, inflating download time on mobile networks.",
      explanationDeveloper: "Tailwind generates un-purged CSS when 'tailwind.config.js' contains overly broad glob paths (e.g. scanning node_modules) or when code uses dynamic string interpolation (e.g. \`bg-\${color}-500\`). Restrict 'content' scanning to actual source paths and use complete static class mappings.",
      explanationAgency: "Cuts stylesheet weight from 180KB down to 14KB, accelerating First Contentful Paint.",
      explanationSaaSTeam: "Enforce strict Tailwind content globs in CI build verification.",
      remediationCodeSnippet: `// 1. In tailwind.config.ts - Restrict content scanning strictly to application source:
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    // NEVER include './node_modules/**' or broad root wildcards!
  ],
  theme: { extend: {} },
  plugins: [],
};
export default config;

// 2. BAD: Dynamic string interpolation (forces Tailwind to keep full palette):
// <div className={\`bg-\${color}-500\`} />

// GOOD: Complete static class lookup map (allows PurgeCSS to drop unused colors):
const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
};
<div className={COLOR_MAP[color] || 'bg-gray-500'} />`,
      implementationSteps: [
        "Audit tailwind.config.js content array and remove any node_modules or unneeded paths",
        "Refactor dynamic template literals (\`text-\${variant}\`) into static object maps",
        "Run 'npm run build' and inspect the generated CSS output in .next/static/css",
      ],
      verificationSteps: [
        "Check built CSS file size: confirm it drops under 20KB gzipped",
        "Re-run SpeedPilot audit to verify unused-css-rules passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 42. WordPress Heartbeat API Frontend Deregistration
  {
    id: "wordpress-heartbeat-admin-ajax-throttle",
    issueCode: "bootup-time",
    techStack: "WORDPRESS",
    title: "Disable Frontend WordPress Heartbeat API Polling & Throttle admin-ajax",
    inputDescription: "Target: https://magazine-portal.com - Flagged: Heartbeat API triggers periodic /wp-admin/admin-ajax.php POST calls every 15s on public posts",
    flaggedAssets: ["https://magazine-portal.com/wp-admin/admin-ajax.php"],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "Your site continuously pings your web server in the background while visitors read articles, wasting phone battery and overloading server resources.",
      explanationDeveloper: "The WordPress Heartbeat API polls 'admin-ajax.php' every 15-60 seconds for session keep-alive and post-lock checks. This is completely unnecessary on public guest-facing pages. Deregister 'heartbeat' on non-admin routes and throttle its frequency in wp-admin.",
      explanationAgency: "Cuts recurring AJAX server queries by 90%, freeing origin worker threads for real user traffic.",
      explanationSaaSTeam: "Enforce Heartbeat frontend deregistration in production WordPress configurations.",
      remediationCodeSnippet: `// In functions.php (Disable Frontend Heartbeat & Throttle Admin Intervals):

// 1. Completely disable Heartbeat on the frontend for public visitors:
add_action('init', function() {
    if (!is_admin()) {
        wp_deregister_script('heartbeat');
    }
}, 1);

// 2. Throttle wp-admin heartbeat interval from 15s to 120s to conserve server CPU:
add_filter('heartbeat_settings', function($settings) {
    $settings['interval'] = 120; // Sets polling rate to 2 minutes
    return $settings;
});`,
      implementationSteps: [
        "Add the heartbeat deregistration code into child theme functions.php",
        "Inspect page source: confirm 'heartbeat.min.js' is no longer enqueued on public pages",
        "Verify post editing in wp-admin functions normally with throttled interval",
      ],
      verificationSteps: [
        "Open Chrome DevTools Network tab on an article page for 60s: verify ZERO admin-ajax.php calls occur",
        "Re-run SpeedPilot audit to verify bootup-time passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "MEDIUM",
    },
  },

  // 43. Shopify Cart MutationObserver INP Optimization
  {
    id: "shopify-mutation-observer-cart-jank",
    issueCode: "interaction-to-next-paint",
    techStack: "SHOPIFY",
    title: "Fix Shopify Cart Drawer MutationObserver Recursion & INP Lockups",
    inputDescription: "Target: https://apparel-store.myshopify.com - Flagged: 320ms main thread lockup during cart quantity changes due to recursive MutationObserver triggers",
    flaggedAssets: ["https://apparel-store.myshopify.com/assets/cart.js"],
    goldStandardOutput: {
      detectedStack: "SHOPIFY",
      explanationMarketer: "When customers update item quantities in the cart, the buttons freeze for a third of a second. Removing recursive background listeners makes quantity buttons snap immediately.",
      explanationDeveloper: "A MutationObserver listening to cart DOM tree changes re-triggers itself during programmatic HTML updates, locking the main thread. Disconnect the observer before mutating the DOM and resume observation inside requestAnimationFrame.",
      explanationAgency: "Brings cart drawer INP from 320ms down to 60ms, preventing cart abandonment during checkout adjustments.",
      explanationSaaSTeam: "Standardize MutationObserver patterns in theme cart components.",
      remediationCodeSnippet: `// assets/cart.js - Safe MutationObserver Batching
let cartObserver = null;

function updateCartDOM(newHtml) {
  const container = document.getElementById('cart-drawer-items');
  if (!container) return;

  // 1. Temporarily disconnect observer to prevent recursive mutation loops:
  if (cartObserver) {
    cartObserver.disconnect();
  }

  // 2. Perform DOM update:
  container.innerHTML = newHtml;

  // 3. Re-attach observer on the next animation frame:
  requestAnimationFrame(() => {
    if (cartObserver) {
      cartObserver.observe(container, { childList: true, subtree: true });
    }
  });
}`,
      implementationSteps: [
        "Identify MutationObserver instances inside assets/cart.js",
        "Wrap container.innerHTML or element modifications with observer.disconnect()",
        "Resume observation inside requestAnimationFrame",
      ],
      verificationSteps: [
        "In DevTools Performance tab, click +/- on cart items with 4x CPU throttle",
        "Verify INP latency remains below 80ms with zero recursive script loops",
        "Re-run SpeedPilot audit to confirm INP passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 44. Service Worker Cache-First for Hashed Static Assets
  {
    id: "custom-service-worker-cache-first",
    issueCode: "uses-long-cache-ttl",
    techStack: "CUSTOM",
    title: "Implement Cache-First Service Worker Strategy for Hashed Static Assets",
    inputDescription: "Target: https://webapp-portal.com - Flagged: Returning visitors endure network latency for versioned bundles",
    flaggedAssets: ["https://webapp-portal.com/dist/bundle.a1b2c3.js"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Returning visitors shouldn't have to wait for the network to re-check stylesheets and scripts. Instant service-worker caching loads repeat visits in under 100 milliseconds.",
      explanationDeveloper: "Service Workers intercept network requests. For immutable hashed assets (CSS/JS/Fonts), a Cache-First strategy serves the cached file directly from CacheStorage without making an HTTP request to the origin server.",
      explanationAgency: "Cuts repeat visit page load time by 70%, delivering instant app-like navigation.",
      explanationSaaSTeam: "Deploy Service Worker runtime caching for static hashed build artifacts.",
      remediationCodeSnippet: `// sw.js - Service Worker Cache-First Strategy for Hashed Assets
const STATIC_CACHE = 'static-v1';
const HASHED_ASSET_REGEX = /\\.(?:[a-f0-9]{8,}\\.)(?:js|css|woff2|webp)$/i;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache-First for hashed assets:
  if (HASHED_ASSET_REGEX.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;

        // Fetch from network, cache response, and return:
        const networkResponse = await fetch(event.request);
        if (networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      })
    );
  }
});`,
      implementationSteps: [
        "Register sw.js in your application entry point",
        "Configure Cache-First handling for hashed asset URLs matching the regex pattern",
        "Keep HTML navigation requests on Network-First to ensure fresh deployments are seen immediately",
      ],
      verificationSteps: [
        "Inspect DevTools Network tab: confirm static assets report '(ServiceWorker)' in the Size column",
        "Re-run SpeedPilot audit to verify repeat visit cache performance",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 45. Next.js Image Aspect-Ratio Container CLS Fix
  {
    id: "nextjs-image-wrapper-cls",
    issueCode: "cumulative-layout-shift",
    techStack: "NEXTJS",
    title: "Fix Next.js Image Layout Shift with Aspect-Ratio Container Classes",
    inputDescription: "Target: https://travel-guide.io - Flagged: Responsive hero image causes 0.18 CLS because wrapper height collapses before image downloads",
    flaggedAssets: ["https://travel-guide.io/images/hero.webp"],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "When your hero picture loads, the whole page suddenly pushes down by 200 pixels, annoying visitors and causing accidental clicks on the wrong links.",
      explanationDeveloper: "Using 'fill' on a Next.js Image requires the parent element to define an explicit dimensional boundary. When the parent lacks height or aspect-ratio, it renders at 0px tall initially, then jumps to full height upon image paint. Add CSS 'aspect-ratio' or Tailwind 'aspect-[16/9]' to reserve the space before download.",
      explanationAgency: "Cuts CLS from 0.18 to 0.00, instantly passing Google's Core Web Vitals threshold.",
      explanationSaaSTeam: "Enforce aspect-ratio wrapper standards for Next.js image components.",
      remediationCodeSnippet: `// components/HeroBanner.tsx - Zero-CLS Aspect-Ratio Reservation
import Image from 'next/image';

export function HeroBanner() {
  return (
    // 1. Explicit aspect-ratio on parent container reserves space before image loads:
    <div className="relative w-full aspect-[16/9] max-h-[500px] overflow-hidden bg-slate-100 rounded-2xl">
      <Image
        src="/images/hero.webp"
        alt="Travel Destination"
        fill
        priority // Ensures preload in <head>
        fetchPriority="high"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
        className="object-cover"
      />
    </div>
  );
}`,
      implementationSteps: [
        "Add 'aspect-[16/9]' (or the image's exact ratio) to the parent relative container",
        "Add a subtle background color placeholder (e.g. bg-slate-100) to smooth loading",
        "Pass accurate 'sizes' attribute so the browser downloads appropriately scaled images",
      ],
      verificationSteps: [
        "In Chrome DevTools, turn on 3G network throttle and reload: verify no text shifts down when image draws",
        "Re-run SpeedPilot audit to confirm CLS is 0.00",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 46. WordPress Transient Cleanup & System Cron Offloading
  {
    id: "wordpress-cron-transient-cleanup",
    issueCode: "server-response-time",
    techStack: "WORDPRESS",
    title: "Purge Expired Transients & Offload WP-Cron to System Crontab",
    inputDescription: "Target: https://high-traffic-blog.com - Flagged: Server Response Time is 1,450ms due to 35,000 expired transient rows and WP_CRON firing on visitor requests",
    flaggedAssets: ["https://high-traffic-blog.com/"],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "Visitors randomly experience 2-second freezes because WordPress runs internal maintenance chores in the middle of opening pages for real people. Offloading chores to the background makes every page snap open.",
      explanationDeveloper: "By default, WordPress executes scheduled tasks (WP_CRON) inside visitor HTTP requests, blocking TTFB. Furthermore, expired transients accumulate in 'wp_options', bloating autoload size. Disable WP_CRON in wp-config.php, trigger cron via system crontab, and clean expired transients.",
      explanationAgency: "Stabilizes TTFB across 100% of visits, preventing random 1500ms latency spikes.",
      explanationSaaSTeam: "Standardize server-level crontab scheduling across all managed WordPress instances.",
      remediationCodeSnippet: `# 1. In wp-config.php - Disable visitor-triggered cron:
define('DISABLE_WP_CRON', true);

# 2. In server crontab (crontab -e) - Run maintenance every 10 minutes via CLI:
*/10 * * * * wp cron event run --due-now --path=/var/www/html >/dev/null 2>&1
# Or via curl:
# */10 * * * * curl -s -k https://high-traffic-blog.com/wp-cron.php?doing_wp_cron >/dev/null 2>&1

# 3. Clean accumulated expired transients in MySQL / phpMyAdmin:
# DELETE FROM wp_options WHERE option_name LIKE ('_transient_timeout_%') AND option_value < UNIX_TIMESTAMP();
# DELETE FROM wp_options WHERE option_name LIKE ('_transient_%') AND option_name NOT LIKE ('_transient_timeout_%') AND option_name NOT IN (SELECT CONCAT('_transient_', SUBSTRING(option_name, 20)) FROM wp_options WHERE option_name LIKE ('_transient_timeout_%'));`,
      implementationSteps: [
        "Add define('DISABLE_WP_CRON', true); in wp-config.php",
        "Set up system cron job in Linux crontab to execute every 10 minutes",
        "Run the SQL query in phpMyAdmin or execute 'wp transient delete --expired' in WP-CLI",
      ],
      verificationSteps: [
        "Run 'wp cron event list' to confirm scheduled events still run properly",
        "Run SpeedPilot audit and confirm TTFB drops below 300ms",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 47. Shopify Variant Matrix JSON Deferral
  {
    id: "shopify-product-variant-json-defer",
    issueCode: "mainthread-work-breakdown",
    techStack: "SHOPIFY",
    title: "Defer Shopify Product Variant Matrix JSON Parsing to Idle Time",
    inputDescription: "Target: https://megastore.myshopify.com - Flagged: 280ms script evaluation on product page caused by 200KB inline variant JSON object",
    flaggedAssets: ["https://megastore.myshopify.com/products/jacket"],
    goldStandardOutput: {
      detectedStack: "SHOPIFY",
      explanationMarketer: "Products with many colors and sizes download a giant database of variations upfront, freezing customer phones before they can scroll or read the description.",
      explanationDeveloper: "Outputting monolithic product JSON inside inline <script> tags forces the browser parser to synchronously evaluate large JavaScript objects during initial document parsing. Store variant data inside a non-evaluating <script type='application/json'> block and parse it only when the shopper interacts with option selectors.",
      explanationAgency: "Cuts 250ms of upfront main thread execution, reducing Total Blocking Time on complex eCommerce SKUs.",
      explanationSaaSTeam: "Modernize product variant data architecture across Shopify themes.",
      remediationCodeSnippet: `<!-- In sections/main-product.liquid: -->

<!-- 1. Store variant data safely in non-evaluating JSON (Zero JS execution cost on load): -->
<script type="application/json" id="ProductJson-{{ section.id }}">
  {{ product.variants | json }}
</script>

<!-- 2. Parse on-demand ONLY when the user touches an option dropdown: -->
<script>
  (function() {
    let cachedVariants = null;
    const select = document.getElementById('variant-picker');
    if (!select) return;

    function getVariants() {
      if (!cachedVariants) {
        const raw = document.getElementById('ProductJson-{{ section.id }}');
        cachedVariants = JSON.parse(raw.textContent);
      }
      return cachedVariants;
    }

    select.addEventListener('focus', getVariants, { once: true, passive: true });
    select.addEventListener('change', function(e) {
      const selected = getVariants().find(v => v.id == e.target.value);
      updatePriceUI(selected);
    });
  })();
</script>`,
      implementationSteps: [
        "Replace inline JavaScript variable assignments (var variants = {{ product.variants | json }}) with <script type='application/json'>",
        "Add a lazy accessor function that parses JSON only on user focus or click",
        "Verify price and image switching still works when options change",
      ],
      verificationSteps: [
        "In Chrome DevTools Performance tab, verify zero long tasks occur during initial page load for variant parsing",
        "Re-run SpeedPilot audit to confirm mainthread-work-breakdown passes",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 48. Webfont Unicode Subsetting with pyftsubset
  {
    id: "custom-font-unicode-subsetting",
    issueCode: "render-blocking-resources",
    techStack: "CUSTOM",
    title: "Subset Heavy Custom WOFF2 Webfonts to Latin Glyphs with pyftsubset",
    inputDescription: "Target: https://corporate-portal.com - Flagged: 840KB brand font file downloading 2,400 unused international glyphs",
    flaggedAssets: ["https://corporate-portal.com/fonts/brand-font.woff2"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Your custom brand font is 800KB because it includes thousands of symbols from other languages you don't even use on your English website. Trimming unused symbols reduces the file size to just 28KB (a 96% reduction).",
      explanationDeveloper: "Full-character set WOFF2 fonts contain thousands of unused Unicode glyphs (Cyrillic, Greek, math symbols, ligatures). Use open-source 'pyftsubset' (from fonttools) to strip unused character tables and extract only the Latin and Latin-1 Supplement glyph ranges (U+0000-00FF).",
      explanationAgency: "Instantly sheds 700-800KB from initial font downloads, cutting FCP delay by hundreds of milliseconds.",
      explanationSaaSTeam: "Add automated font subsetting to design asset build pipelines.",
      remediationCodeSnippet: `# Terminal command to subset WOFF2 to Latin glyphs (using fonttools / pyftsubset):
pip install fonttools brotli

pyftsubset brand-font.ttf \\
  --output-file=brand-font-subset.woff2 \\
  --flavor=woff2 \\
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \\
  --layout-features='*' \\
  --desubroutinize

<!-- In HTML <head>: Preload the lightweight 28KB subset font -->
<link rel="preload" href="/fonts/brand-font-subset.woff2" as="font" type="font/woff2" crossorigin>`,
      implementationSteps: [
        "Run pyftsubset on your original TTF/OTF font file using the Latin glyph range command above",
        "Replace the heavy 840KB font with the generated 28KB .woff2 subset file in your stylesheet",
        "Verify that all letters, numbers, punctuation, and common currency symbols render correctly",
      ],
      verificationSteps: [
        "Inspect Network tab in DevTools: confirm font transfer size is < 35KB",
        "Re-run SpeedPilot audit to verify render-blocking-resources and payload savings",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 49. Next.js Server Actions & Optimistic UI for Zero-Lag INP
  {
    id: "nextjs-server-actions-optimistic-inp",
    issueCode: "interaction-to-next-paint",
    techStack: "NEXTJS",
    title: "Eliminate Interaction Delay on Form & Cart Actions with React 19 useOptimistic and Server Actions",
    inputDescription: "Target: https://commerce-store.com - Flagged: Add-to-cart button locks main thread with 410ms INP while awaiting network response",
    flaggedAssets: ["https://commerce-store.com/app/components/AddToCartButton.tsx"],
    goldStandardOutput: {
      detectedStack: "NEXTJS",
      explanationMarketer: "When shoppers click 'Add to Bag', the page freezes for nearly half a second while contacting the server, making the button feel broken. Optimistic updates make the button respond instantly in under 16ms while the background sync takes care of the cart.",
      explanationDeveloper: "Client-side state updates awaiting async HTTP roundtrips inflate Interaction to Next Paint (INP) to > 400ms. In Next.js 15 with React 19, use the 'useOptimistic' hook and 'useTransition' wrapping a Server Action ('use server') to paint the UI immediately without blocking the browser thread.",
      explanationAgency: "Cuts Interaction to Next Paint (INP) from 410ms down to a blazing 12ms, providing frictionless consumer tactile feedback.",
      explanationSaaSTeam: "Enforce optimistic state transitions and Next.js Server Actions across all high-frequency user actions.",
      remediationCodeSnippet: `'use client';

import { useOptimistic, useTransition } from 'react';
import { addToCartAction } from '@/app/actions/cart';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
}

export function AddToCartButton({ item }: { item: CartItem }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticCount, setOptimisticCount] = useOptimistic(
    item.quantity,
    (state, amount: number) => state + amount
  );

  const handleAdd = () => {
    startTransition(async () => {
      // 1. Immediately paint the incremented state in < 16ms:
      setOptimisticCount(1);
      // 2. Perform the server action in the background:
      await addToCartAction(item.id);
    });
  };

  return (
    <button
      onClick={handleAdd}
      disabled={isPending}
      className="btn-primary"
      aria-busy={isPending}
    >
      {isPending ? 'Updating...' : \`Add to Bag (\${optimisticCount})\`}
    </button>
  );
}`,
      implementationSteps: [
        "Import useOptimistic and useTransition from 'react' in the client component",
        "Define an optimistic reducer that immediately updates UI counts on click",
        "Wrap the Server Action dispatch inside startTransition to yield main thread immediately",
      ],
      verificationSteps: [
        "In Chrome DevTools Performance panel, record an 'Add to Bag' click: verify INP duration is < 40ms",
        "Re-run SpeedPilot audit to verify interaction-to-next-paint passes with green score",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 50. WordPress WooCommerce Block Asset Splitting
  {
    id: "wordpress-woocommerce-block-asset-split",
    issueCode: "unused-javascript",
    techStack: "WORDPRESS",
    title: "Prevent Global Enqueue of Heavy WooCommerce Block Scripts on Blog & Content Pages",
    inputDescription: "Target: https://lifestyle-shop.com - Flagged: 380KB of wc-blocks-checkout and wc-blocks-cart JavaScript loaded on homepage and blog posts",
    flaggedAssets: ["https://lifestyle-shop.com/wp-content/plugins/woocommerce/assets/client/blocks/wc-blocks.js"],
    goldStandardOutput: {
      detectedStack: "WORDPRESS",
      explanationMarketer: "Your online store is loading its checkout and payment processing code on your homepage and blog articles, where no shopping cart is even visible. Stopping these unnecessary scripts saves 380KB on every content view.",
      explanationDeveloper: "WooCommerce Blocks registers cart and checkout script packages globally, forcing heavy React bundles into the head of non-e-commerce templates. Use WordPress 'wp_enqueue_scripts' conditional dequeuing with high priority to remove unused block scripts and stylesheets from content pages.",
      explanationAgency: "Cuts 380KB+ of unused JavaScript from landing pages and blog posts, dramatically boosting Mobile PageSpeed scores.",
      explanationSaaSTeam: "Add conditional WooCommerce asset isolation to child theme or custom performance mu-plugin.",
      remediationCodeSnippet: `// In functions.php or a custom mu-plugin:
add_action('wp_enqueue_scripts', function() {
    // Check if we are on a WooCommerce cart, checkout, or account page:
    $is_wc_page = is_cart() || is_checkout() || is_account_page();
    
    // Also verify if the current post content actually contains WooCommerce blocks:
    $has_wc_blocks = false;
    if (is_singular() && has_blocks(get_the_ID())) {
        $post = get_post();
        if (has_block('woocommerce/cart', $post) || has_block('woocommerce/checkout', $post)) {
            $has_wc_blocks = true;
        }
    }

    // If neither condition is met, dequeue heavy block scripts & styles:
    if (!$is_wc_page && !$has_wc_blocks) {
        wp_dequeue_script('wc-blocks-vendors-style');
        wp_dequeue_script('wc-blocks-checkout');
        wp_dequeue_script('wc-blocks-cart');
        wp_dequeue_style('wc-blocks-packages-style');
        wp_dequeue_style('wc-blocks-style');
    }
}, 100);`,
      implementationSteps: [
        "Add the conditional hook inside your child theme's functions.php or wp-content/mu-plugins/wc-optimizer.php",
        "Inspect non-shop pages to ensure cart/checkout scripts are completely absent from Network panel",
        "Verify checkout and cart pages still function normally with full block styling",
      ],
      verificationSteps: [
        "In Chrome DevTools Network tab, inspect homepage: verify wc-blocks.js is NOT transferred",
        "Re-run SpeedPilot audit to verify unused-javascript score improves by 25+ points",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 51. Shopify Responsive Art Direction with Explicit Picture Element
  {
    id: "shopify-responsive-art-direction-cls",
    issueCode: "cumulative-layout-shift",
    techStack: "SHOPIFY",
    title: "Eliminate Responsive Hero Banner Layout Shifts (CLS) using Liquid <picture> with Focal Points",
    inputDescription: "Target: https://apparel-brand.myshopify.com - Flagged: 0.24 CLS caused by responsive hero banner resizing dynamically when viewport adjusts",
    flaggedAssets: ["https://apparel-brand.myshopify.com/cdn/shop/files/hero-desktop.jpg"],
    goldStandardOutput: {
      detectedStack: "SHOPIFY",
      explanationMarketer: "When your hero banner loads on mobile phones, it starts tiny and suddenly jumps to full size after a second, pushing the headline down and disorienting customers. Setting precise responsive dimensions fixes the shift completely.",
      explanationDeveloper: "Hero images served across mobile and desktop breakpoints often omit explicit aspect-ratio and dimension hints for each media query, triggering layout shift (0.2+ CLS). Use Liquid's HTML5 <picture> element with srcset and explicit width/height per breakpoint, preserving focal points via CSS object-position.",
      explanationAgency: "Eliminates 0.24 Cumulative Layout Shift on hero sections, bringing the homepage into green Google Core Web Vitals thresholds.",
      explanationSaaSTeam: "Refactor theme hero and banner Liquid sections to use explicit <picture> art-direction markup.",
      remediationCodeSnippet: `<!-- In sections/hero-banner.liquid: -->
{%- assign mobile_image = section.settings.image_mobile | default: section.settings.image -%}
{%- assign desktop_image = section.settings.image -%}

<div class="hero-media-wrapper" style="position: relative; width: 100%; aspect-ratio: 16/9;">
  <picture>
    <!-- Mobile Crop (max 749px): 4:5 aspect ratio -->
    <source
      media="(max-width: 749px)"
      srcset="{{ mobile_image | image_url: width: 750 }} 750w, {{ mobile_image | image_url: width: 375 }} 375w"
      width="750"
      height="938"
    >
    <!-- Desktop Crop (750px+): 16:9 aspect ratio -->
    <source
      media="(min-width: 750px)"
      srcset="{{ desktop_image | image_url: width: 2000 }} 2000w, {{ desktop_image | image_url: width: 1500 }} 1500w"
      width="2000"
      height="1125"
    >
    <!-- Fallback <img> with high fetchpriority -->
    <img
      src="{{ desktop_image | image_url: width: 1500 }}"
      alt="{{ section.settings.heading | escape }}"
      width="2000"
      height="1125"
      fetchpriority="high"
      loading="eager"
      decoding="async"
      style="width: 100%; height: 100%; object-fit: cover; object-position: {{ desktop_image.presentation.focal_point }};"
    >
  </picture>
</div>`,
      implementationSteps: [
        "Replace the generic {{ image | image_tag }} in sections/hero-banner.liquid with the <picture> markup above",
        "Define explicit width and height attributes matching the intended aspect ratio for both mobile and desktop",
        "Verify object-position binds to Shopify's image.presentation.focal_point",
      ],
      verificationSteps: [
        "Emulate mobile and desktop viewport changes in DevTools: verify layout does not jump",
        "Re-run SpeedPilot audit to verify cumulative-layout-shift drops to 0.00",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 52. Modern Vite / Nginx Brotli Static Pre-Compression
  {
    id: "custom-vite-nginx-brotli-static-compression",
    issueCode: "uses-text-compression",
    techStack: "CUSTOM",
    title: "Pre-compress Assets at Build Time with Brotli Level 11 and Serve via Nginx brotli_static",
    inputDescription: "Target: https://portal-analytics.com - Flagged: Nginx dynamic Brotli quality capped at level 4 to save CPU, wasting 180KB of transfer bandwidth",
    flaggedAssets: ["https://portal-analytics.com/dist/assets/index.js"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Your web server is quickly compressing website files on the fly at low quality so it doesn't overheat its processor. Compressing files at maximum quality in advance saves an extra 180KB per visit with zero CPU strain.",
      explanationDeveloper: "On-the-fly Brotli compression is usually restricted to quality 4-5 to avoid CPU latency. By generating pre-compressed '.br' and '.gz' assets during build using 'vite-plugin-compression2' at maximum Brotli quality 11, Nginx serves optimal bytes with 'brotli_static on;' directly from disk with zero CPU penalty.",
      explanationAgency: "Shrinks production bundle payloads by up to 22% compared to standard Gzip, accelerating asset delivery on cellular connections.",
      explanationSaaSTeam: "Add static Brotli pre-compression to Vite/Rollup build scripts and enable Nginx brotli_static.",
      remediationCodeSnippet: `// 1. In vite.config.ts: Pre-compress at build time:
import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    // Pre-compress with Brotli (maximum quality 11):
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\\.(br|gz|png|jpg|webp)$/i],
      threshold: 1024,
    }),
    // Pre-compress with Gzip fallback:
    compression({
      algorithm: 'gzip',
      exclude: [/\\.(br|gz|png|jpg|webp)$/i],
      threshold: 1024,
    }),
  ],
});

# 2. In /etc/nginx/conf.d/default.conf:
server {
    listen 443 ssl http2;
    server_name portal-analytics.com;
    root /var/www/html/dist;

    # Serve pre-compressed .br and .gz files directly from disk:
    brotli_static on;
    gzip_static on;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
}`,
      implementationSteps: [
        "Install vite-plugin-compression2: npm install -D vite-plugin-compression2",
        "Add both brotliCompress and gzip plugins to vite.config.ts",
        "Enable 'brotli_static on;' and 'gzip_static on;' in your Nginx server block and reload Nginx",
      ],
      verificationSteps: [
        "Curl production asset: 'curl -I -H \"Accept-Encoding: br\" https://portal-analytics.com/assets/index.js' - verify 'content-encoding: br'",
        "Re-run SpeedPilot audit to verify uses-text-compression audit passes with 100% score",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 53. Laravel Livewire V3 Lazy Hydration
  {
    id: "laravel-livewire-lazy-hydration-inp",
    issueCode: "interaction-to-next-paint",
    techStack: "LARAVEL",
    title: "Defer Offscreen Livewire V3 Component Hydration with :lazy to Prevent INP Bottlenecks",
    inputDescription: "Target: https://saas-crm.laravel.app - Flagged: Livewire hydrates 14 nested subcomponents on load, locking UI for 490ms INP",
    flaggedAssets: ["https://saas-crm.laravel.app/livewire/livewire.js"],
    goldStandardOutput: {
      detectedStack: "LARAVEL",
      explanationMarketer: "Your dashboard attempts to boot and activate all interactive tables, charts, and activity logs the second the page opens, causing the screen to freeze when users try to click. Deferring offscreen sections keeps the interface immediately clickable.",
      explanationDeveloper: "Eager initialization of multiple Livewire v3 components floods the browser event loop during DOMContentLoaded, resulting in high Total Blocking Time and poor INP. Use Livewire's native ':lazy=\"true\"' attribute with a lightweight skeleton placeholder so only above-the-fold components hydrate immediately.",
      explanationAgency: "Cuts initial Livewire CPU execution time by 70%, ensuring instant response to first user clicks.",
      explanationSaaSTeam: "Standardize on Livewire v3 lazy hydration for complex dashboard widgets.",
      remediationCodeSnippet: `{{-- In resources/views/dashboard.blade.php --}}

{{-- 1. Critical above-the-fold component: hydrates immediately --}}
<livewire:dashboard.kpi-summary />

{{-- 2. Defer heavy activity feed until visible in viewport --}}
<livewire:dashboard.activity-feed :lazy="true" />

{{-- 3. In app/Livewire/Dashboard/ActivityFeed.php: Define skeleton placeholder --}}
<?php

namespace App\\Livewire\\Dashboard;

use Livewire\\Component;

class ActivityFeed extends Component
{
    public function placeholder()
    {
        return <<<'HTML'
        <div class="animate-pulse space-y-4 p-6 bg-white rounded-lg">
            <div class="h-4 bg-gray-200 rounded w-1/4"></div>
            <div class="space-y-2">
                <div class="h-3 bg-gray-200 rounded"></div>
                <div class="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
        </div>
        HTML;
    }

    public function render()
    {
        return view('livewire.dashboard.activity-feed', [
            'activities' => \\App\\Models\\Activity::latest()->take(20)->get(),
        ]);
    }
}`,
      implementationSteps: [
        "Add :lazy='true' to heavy or below-the-fold <livewire:... /> component tags in Blade templates",
        "Implement the placeholder() method in the corresponding Livewire component class returning a Tailwind skeleton",
        "Verify in browser network tab that lazy requests fire only as the user scrolls into view",
      ],
      verificationSteps: [
        "Inspect DevTools Performance tab: verify TBT drops from 490ms to < 80ms",
        "Re-run SpeedPilot audit to verify interaction-to-next-paint passes with green score",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 54. React / Vite Dynamic Chunk Splitting
  {
    id: "react-vite-manual-chunks-code-splitting",
    issueCode: "unused-javascript",
    techStack: "REACT",
    title: "Isolate Heavy Vendor Libraries (Charts, Editors, Tables) with Vite rollupOptions.manualChunks",
    inputDescription: "Target: https://cloud-dashboard.io - Flagged: 1.4MB monolithic vendor bundle loaded on login screen containing unused Chart.js and CodeEditor",
    flaggedAssets: ["https://cloud-dashboard.io/assets/vendor-bundle.js"],
    goldStandardOutput: {
      detectedStack: "REACT",
      explanationMarketer: "Visitors logging into your application are downloading charting and code editor software that isn't even used on the login screen, delaying login loading by over two seconds on 4G connections.",
      explanationDeveloper: "Vite's default bundler grouping can create an oversized vendor chunk containing heavy third-party dependencies required on only one or two routes. Configure 'rollupOptions.output.manualChunks' in vite.config.ts to isolate major libraries into dedicated, asynchronously-loaded chunks.",
      explanationAgency: "Cuts initial vendor bundle size by over 60%, drastically accelerating login and landing page speeds.",
      explanationSaaSTeam: "Enforce dynamic manual chunking in Vite build pipeline to prevent bundle bloat.",
      remediationCodeSnippet: `// 1. In vite.config.ts:
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Isolate heavy libraries into their own async chunks:
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/@monaco-editor') || id.includes('node_modules/monaco-editor')) {
            return 'vendor-editor';
          }
          if (id.includes('node_modules/@tanstack/react-table')) {
            return 'vendor-tables';
          }
        },
      },
    },
  },
});

// 2. In your route component: Lazy load heavy features:
import React, { Suspense } from 'react';
const HeavyChart = React.lazy(() => import('./components/AnalyticsChart'));

export function AnalyticsView() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
      <HeavyChart />
    </Suspense>
  );
}`,
      implementationSteps: [
        "In vite.config.ts, configure build.rollupOptions.output.manualChunks matching large dependencies",
        "Use React.lazy() and dynamic import() inside views that require the heavy widgets",
        "Wrap the lazy components in React <Suspense> with an appropriate skeleton fallback",
      ],
      verificationSteps: [
        "Run 'npx vite build' and inspect the generated dist/assets folder: confirm vendor-charts.js is a separate chunk",
        "Re-run SpeedPilot audit to confirm unused-javascript penalty is eliminated",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
    },
  },

  // 55. WooCommerce Cart Fragments AJAX Loop Elimination
  {
    id: "woocommerce-cart-fragments-ajax-elimination",
    issueCode: "server-response-time",
    techStack: "WOOCOMMERCE",
    title: "Disable Heavy wc-cart-fragments AJAX Polling on Static Pages to Restore Edge TTFB",
    inputDescription: "Target: https://direct-gadgets.com - Flagged: 920ms TTFB spike caused by uncacheable wc-ajax=get_refreshed_fragments request on every pageview",
    flaggedAssets: ["https://direct-gadgets.com/?wc-ajax=get_refreshed_fragments"],
    goldStandardOutput: {
      detectedStack: "WOOCOMMERCE",
      explanationMarketer: "WooCommerce runs a background server query on every single page to see if someone added something to their shopping cart, which ruins fast caching and adds almost a full second of lag to browsing.",
      explanationDeveloper: "WooCommerce's legacy 'wc-cart-fragments.js' makes an uncacheable HTTP POST to '?wc-ajax=get_refreshed_fragments' on every pageview. Dequeue this script on catalog and informational pages, and replace it with a lightweight client-side sessionStorage cart counter that updates only when an item is added.",
      explanationAgency: "Allows 100% of non-checkout pages to be served straight from Redis / Cloudflare Edge cache, dropping TTFB to < 150ms.",
      explanationSaaSTeam: "Install custom cart-fragment optimizer snippet to unlock full edge caching for WooCommerce.",
      remediationCodeSnippet: `// 1. In functions.php: Dequeue cart fragments on non-e-commerce pages
add_action('wp_enqueue_scripts', function() {
    // Only run cart fragments on cart and checkout pages:
    if (!is_cart() && !is_checkout()) {
        wp_dequeue_script('wc-cart-fragments');
    }
}, 100);

<!-- 2. In theme footer: Lightweight localStorage mini-cart counter without AJAX loops -->
<script>
  (function() {
    // Update cart badge from standard WooCommerce cookies without hitting admin-ajax:
    function syncCartCount() {
      const match = document.cookie.match(/woocommerce_items_in_cart=([0-9]+)/);
      const count = match ? match[1] : '0';
      const badge = document.querySelector('.header-cart-count');
      if (badge) badge.textContent = count;
    }
    document.addEventListener('DOMContentLoaded', syncCartCount);
    // Listen for WooCommerce added_to_cart trigger:
    if (window.jQuery) {
      jQuery(document.body).on('added_to_cart', syncCartCount);
    }
  })();
</script>`,
      implementationSteps: [
        "Add the wp_dequeue_script('wc-cart-fragments') filter to functions.php",
        "Add the client-side cookie reader script to update the header cart badge without AJAX requests",
        "Test adding an item to cart and verify cart counter updates accurately",
      ],
      verificationSteps: [
        "Check Network panel on homepage: verify '?wc-ajax=get_refreshed_fragments' request no longer fires",
        "Re-run SpeedPilot audit to verify server-response-time drops to green (< 200ms)",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },

  // 56. CSS Content-Visibility for Giant DOM Trees
  {
    id: "custom-content-visibility-dom-size",
    issueCode: "dom-size",
    techStack: "CUSTOM",
    title: "Skip Offscreen Rendering in Giant DOM Catalogs with content-visibility: auto",
    inputDescription: "Target: https://big-catalog.com - Flagged: 4,800 DOM elements causing 950ms layout calculation and scroll stutter",
    flaggedAssets: ["https://big-catalog.com/catalog/grid"],
    goldStandardOutput: {
      detectedStack: "CUSTOM",
      explanationMarketer: "Your catalog loads thousands of product cards at once, forcing the browser to compute styling for products the shopper hasn't scrolled down to yet. Skipping offscreen cards makes page scrolling silky smooth.",
      explanationDeveloper: "Large DOM trees (> 3,000 nodes) severely degrade rendering performance and recalculation costs. Applying 'content-visibility: auto' along with 'contain-intrinsic-size' instructs the browser rendering engine to skip layout and painting for offscreen cards until they enter the viewport proximity.",
      explanationAgency: "Cuts main-thread rendering and layout calculation time by up to 85% without changing backend pagination.",
      explanationSaaSTeam: "Apply CSS containment across all large data tables, product grids, and comment threads.",
      remediationCodeSnippet: `/* In global stylesheet: */
.product-grid-item,
.catalog-card {
  /* Skips layout, painting, and hit-testing until element is near viewport */
  content-visibility: auto;
  
  /* Reserves placeholder height (320px) to prevent scrollbar jumps: */
  contain-intrinsic-size: auto 320px;
}

/* For infinite-scroll container or large lists: */
.catalog-container {
  /* Isolates subtree changes from causing full document reflow */
  contain: layout style;
}`,
      implementationSteps: [
        "Identify repeated card or item containers that contribute to large DOM counts",
        "Add 'content-visibility: auto' and 'contain-intrinsic-size: auto [estimated-height]' to CSS classes",
        "Verify scrollbar stability while scrolling through the catalog",
      ],
      verificationSteps: [
        "In Chrome DevTools Rendering panel, enable 'Rendering > Paint flashing': observe offscreen cards do not flash paints",
        "Re-run SpeedPilot audit to confirm dom-size audit passes with improved rendering metrics",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    },
  },
];

export function findBestTrainingExemplar(issueCode: string, techStack: TechStack): TrainingExemplar | undefined {
  // 1. Exact match on issueCode and techStack
  const exact = TRAINING_CORPUS.find(
    (e) => e.issueCode === issueCode && e.techStack === techStack
  );
  if (exact) return exact;

  // 2. Match on issueCode
  const issueMatch = TRAINING_CORPUS.find((e) => e.issueCode === issueCode);
  if (issueMatch) return issueMatch;

  // 3. Fallback to closest category
  if (issueCode.includes("lcp") || issueCode.includes("largest-contentful-paint")) {
    return TRAINING_CORPUS.find((e) => e.issueCode.includes("largest-contentful-paint"));
  }
  if (issueCode.includes("cls") || issueCode.includes("layout-shift")) {
    return TRAINING_CORPUS.find((e) => e.issueCode.includes("cumulative-layout-shift"));
  }
  if (issueCode.includes("inp") || issueCode.includes("blocking-time") || issueCode.includes("tbt")) {
    return TRAINING_CORPUS.find((e) => e.issueCode.includes("interaction-to-next-paint"));
  }
  if (issueCode.includes("render-blocking")) {
    return TRAINING_CORPUS.find((e) => e.issueCode.includes("render-blocking"));
  }
  if (issueCode.includes("third-party")) {
    return TRAINING_CORPUS.find((e) => e.issueCode.includes("third-party"));
  }
  if (issueCode.includes("server-response") || issueCode.includes("ttfb")) {
    return TRAINING_CORPUS.find((e) => e.issueCode.includes("server-response"));
  }

  return undefined;
}
