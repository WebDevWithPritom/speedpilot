import { TechStack, NormalizedAuditIssue } from "@speedpilot/shared";
import { DeveloperDeepSearchResult } from "./types.js";
import { detectVendorSignatures } from "../vendor-intelligence.js";

export function getDeterministicDeveloperDeepSearch(
  issue: NormalizedAuditIssue,
  techStack: TechStack,
  targetUrl: string
): DeveloperDeepSearchResult {
  const primaryResource = issue.evidenceItems[0]?.url || targetUrl;
  const wastedMs = issue.evidenceItems[0]?.wastedMs || 450;
  const evidenceUrls = issue.evidenceItems.map((e) => e.url).filter((u): u is string => Boolean(u));
  const detectedVendors = detectVendorSignatures(evidenceUrls);
  const topVendor = detectedVendors[0];

  switch (issue.code) {
    case "render-blocking-resources":
    case "render-blocking-insight":
      if (techStack === "NEXTJS") {
        return {
          persona: "DEVELOPER",
          detectedStack: "NEXTJS",
          rootCauseAnalysis: `Synchronous CSS/JS resource '${primaryResource}' halts HTML parsing before the First Contentful Paint. In Next.js App Router, global layout styles should use modular CSS or Next.js font loading to avoid main-thread blocking (${wastedMs}ms delay).`,
          offendingResource: primaryResource,
          remediationDiff: `// app/layout.tsx
- import '../styles/heavy-theme.css';
+ import { Inter } from 'next/font/google';
+ import '../styles/critical.css';
+ 
+ const inter = Inter({ subsets: ['latin'], display: 'swap' });
+ 
+ export default function RootLayout({ children }: { children: React.ReactNode }) {
+   return (
+     <html lang="en" className={inter.className}>
+       <head>
+         <link rel="preload" href="${primaryResource}" as="style" />
+         <link rel="stylesheet" href="${primaryResource}" media="print" onLoad="this.media='all'" />
+       </head>
+       <body>{children}</body>
+     </html>
+   );
+ }`,
          bundlerConfigPatch: `// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
export default nextConfig;`,
          cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=render-blocking-resources --view`,
          recommendedPackages: ["next/font", "critters"],
          estimatedDevMinutes: 45,
        };
      }

      if (techStack === "WORDPRESS" || techStack === "WOOCOMMERCE") {
        return {
          persona: "DEVELOPER",
          detectedStack: techStack,
          rootCauseAnalysis: `Synchronous CSS and JS assets in WordPress 'wp_head' halt DOM parsing for ${wastedMs}ms. In WordPress 6.3+, native script loading strategies and core block asset separation eliminate render-blocking without legacy string replacement.`,
          offendingResource: primaryResource,
          remediationDiff: `// functions.php - Modern WordPress 6.3+ Asset Loading
+ // 1. Native script deferral strategy:
+ wp_enqueue_script('theme-main', get_stylesheet_directory_uri() . '/js/main.js', array('jquery'), '1.0', array('strategy' => 'defer', 'in_footer' => true));
+ 
+ // 2. Separate Gutenberg block CSS (load only on pages that use the block):
+ add_filter('should_load_separate_core_block_assets', '__return_true');
+ 
+ // 3. Preload non-critical plugin styles:
+ add_filter('style_loader_tag', function($html, $handle) {
+     if (in_array($handle, ['non-critical-plugin-style', 'theme-extra'])) {
+         return str_replace("rel='stylesheet'", "rel='preload' as='style' onload=\\"this.onload=null;this.rel='stylesheet'\\"", $html) . "<noscript>" . $html . "</noscript>";
+     }
+     return $html;
+ }, 10, 2);`,
          bundlerConfigPatch: `# .htaccess / NGINX Caching header
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>`,
          cliVerificationCommand: `wp-scripts build && wp cache flush`,
          recommendedPackages: ["wp-scripts"],
          estimatedDevMinutes: 30,
        };
      }

      if (techStack === "SHOPIFY") {
        return {
          persona: "DEVELOPER",
          detectedStack: "SHOPIFY",
          rootCauseAnalysis: `Liquid {{ 'theme.css' | asset_url | stylesheet_tag }} injected in theme.liquid synchronously blocks document parsing. Wasted parser latency: ${wastedMs}ms.`,
          offendingResource: primaryResource,
          remediationDiff: `<!-- layout/theme.liquid -->
- {{ 'theme.css' | asset_url | stylesheet_tag }}
+ <link rel="preload" href="{{ 'theme.css' | asset_url }}" as="style">
+ <link rel="stylesheet" href="{{ 'theme.css' | asset_url }}" media="print" onload="this.media='all'">
+ <noscript>{{ 'theme.css' | asset_url | stylesheet_tag }}</noscript>`,
          bundlerConfigPatch: `// Shopify CLI theme build check
shopify theme check layout/theme.liquid`,
          cliVerificationCommand: `shopify theme check && shopify theme push`,
          recommendedPackages: ["@shopify/cli"],
          estimatedDevMinutes: 30,
        };
      }

      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Synchronous resource '${primaryResource}' halts HTML parsing before first paint (${wastedMs}ms blocked).`,
        offendingResource: primaryResource,
        remediationDiff: `<!-- Critical HTML Head -->
- <link rel="stylesheet" href="${primaryResource}">
+ <link rel="preload" href="${primaryResource}" as="style">
+ <link rel="stylesheet" href="${primaryResource}" media="print" onload="this.media='all'">`,
        bundlerConfigPatch: `// vite.config.ts: Split chunks for initial bundle
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules') ? 'vendor' : undefined),
      },
    },
  },
};`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=render-blocking-resources`,
        estimatedDevMinutes: 30,
      };

    case "largest-contentful-paint-element":
    case "largest-contentful-paint":
    case "prioritize-lcp-image":
    case "lcp":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Hero visual element at '${primaryResource}' lacks high fetchpriority and preload hints, inflating Largest Contentful Paint by ~${wastedMs}ms.`,
        offendingResource: primaryResource,
        remediationDiff: techStack === "NEXTJS"
          ? `// Next.js App Router: app/page.tsx
- <img src="${primaryResource}" alt="Hero" />
+ <Image
+   src="${primaryResource}"
+   alt="Hero"
+   fill
+   priority
+   fetchPriority="high"
+   sizes="100vw"
+   className="object-cover"
+ />`
          : techStack === "WORDPRESS" || techStack === "WOOCOMMERCE"
          ? `// functions.php & single.php (WordPress 6.3+ LCP Optimization)
+ // 1. Preload post thumbnail in <head>:
+ add_action('wp_head', function() {
+   if (is_singular() && has_post_thumbnail()) {
+     echo '<link rel="preload" as="image" href="' . esc_url(get_the_post_thumbnail_url(get_the_ID(), 'large')) . '" fetchpriority="high">' . "\\n";
+   }
+ }, 1);
+ 
+ // 2. Ensure post header featured image renders eager and high priority:
- the_post_thumbnail('large');
+ the_post_thumbnail('large', array('loading' => 'eager', 'fetchpriority' => 'high', 'decoding' => 'async'));`
          : techStack === "SHOPIFY"
          ? `<!-- sections/hero-banner.liquid (Shopify 2.0 LCP Image Optimization) -->
- <img src="{{ section.settings.image | img_url: 'master' }}" loading="lazy">
+ {{ section.settings.image | image_url: width: 1440 | image_tag:
+   preload: true,
+   fetchpriority: 'high',
+   loading: 'eager',
+   decoding: 'async',
+   widths: '375, 550, 750, 1100, 1440',
+   sizes: '100vw',
+   alt: section.settings.image.alt | default: shop.name | escape
+ }}`
          : techStack === "LARAVEL"
          ? `<!-- resources/views/layouts/app.blade.php & hero component -->
+ <link rel="preload" as="image" href="{{ asset('${primaryResource}') }}" fetchpriority="high">
- <img src="{{ asset('${primaryResource}') }}" loading="lazy">
+ <img src="{{ asset('${primaryResource}') }}" fetchpriority="high" loading="eager" decoding="async" width="1200" height="600">`
          : `<!-- High Priority Hero Preload in <head> -->
+ <link rel="preload" fetchpriority="high" as="image" href="${primaryResource}" type="image/webp">
<!-- Hero <img> tag -->
- <img src="${primaryResource}" loading="lazy">
+ <img src="${primaryResource}" fetchpriority="high" loading="eager" decoding="async" width="1200" height="600">`,
        bundlerConfigPatch: techStack === "NEXTJS"
          ? `// next.config.mjs
export default {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
};`
          : undefined,
        cliVerificationCommand: techStack === "SHOPIFY"
          ? `shopify theme check sections/hero-banner.liquid`
          : techStack === "LARAVEL"
          ? `php artisan view:clear && npm run build`
          : `npx lighthouse ${targetUrl} --only-audits=largest-contentful-paint-element`,
        recommendedPackages: techStack === "NEXTJS" ? ["sharp"] : undefined,
        estimatedDevMinutes: 25,
      };

    case "cumulative-layout-shift":
    case "layout-shifts":
    case "layout-shift-elements":
    case "cls":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Un-dimensioned media or dynamic banner container at '${primaryResource}' causes unscheduled DOM reflows and layout shifting.`,
        offendingResource: primaryResource,
        remediationDiff: `/* styles/global.css - Aspect-Ratio Box Reservation */
- .banner-container { width: 100%; }
+ .banner-container {
+   width: 100%;
+   aspect-ratio: 16 / 9;
+   min-height: 280px;
+   background-color: #f3f4f6;
+ }

<!-- HTML Markup -->
- <img src="${primaryResource}" alt="Banner">
+ <img src="${primaryResource}" width="1200" height="675" style="width:100%;height:auto;" alt="Banner">`,
        bundlerConfigPatch: `/* CSS Containment */
.banner-container {
  contain: layout paint;
}`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=cumulative-layout-shift`,
        estimatedDevMinutes: 20,
      };

    case "non-composited-animations":
    case "unsupported-animation-keyframes":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Animation at '${primaryResource}' targets non-composited properties (e.g. top, left, width, margin), forcing the browser to perform layout calculation and repaint on every frame.`,
        offendingResource: primaryResource,
        remediationDiff: `/* Convert layout transitions to GPU-composited transforms */
- .animated-box {
-   left: -100px;
-   transition: left 0.3s ease-out;
- }
- .animated-box.open {
-   left: 0;
- }
+ .animated-box {
+   transform: translate3d(-100px, 0, 0);
+   opacity: 0;
+   transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out;
+   will-change: transform, opacity;
+ }
+ .animated-box.open {
+   transform: translate3d(0, 0, 0);
+   opacity: 1;
+ }`,
        bundlerConfigPatch: `/* CSS will-change rule promotes layer to GPU compositor */
.animated-box {
  will-change: transform, opacity;
}`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=non-composited-animations`,
        estimatedDevMinutes: 25,
      };

    case "dom-size":
    case "excessive-dom-size":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Total DOM elements exceed 800 nodes, inflating style recalculation time and memory usage.`,
        offendingResource: primaryResource,
        remediationDiff: techStack === "NEXTJS" || techStack === "REACT"
          ? `// Virtualize large lists with @tanstack/react-virtual
- {items.map((item) => <ItemRow key={item.id} item={item} />)}
+ import { useVirtualizer } from '@tanstack/react-virtual';
+ // Render only visible slice (~10 DOM elements instead of 500)`
          : `/* CSS content-visibility skips layout of offscreen sections */
+ .below-fold-section {
+   content-visibility: auto;
+   contain-intrinsic-size: 0 600px;
+ }`,
        bundlerConfigPatch: `// Virtualization budget`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=dom-size`,
        recommendedPackages: ["@tanstack/react-virtual"],
        estimatedDevMinutes: 40,
      };

    case "interaction-to-next-paint":
    case "inp":
    case "total-blocking-time":
    case "tbt":
    case "long-tasks":
    case "mainthread-work-breakdown":
    case "bootup-time":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Main thread is blocked by long synchronous tasks (> 50ms) in '${primaryResource}'. User interactions are queued without UI feedback, severely degrading INP.`,
        offendingResource: primaryResource,
        remediationDiff: techStack === "NEXTJS"
          ? `// Chunk heavy loops with scheduler.yield() & use React startTransition
import { useTransition } from 'react';

export function HeavyComponent() {
  const [isPending, startTransition] = useTransition();

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Immediate UI update
    setRawValue(e.target.value);
    // 2. Yield and defer heavy computations
    startTransition(() => {
      recomputeHeavyState(e.target.value);
    });
  };
}`
          : `// Break up long loops with scheduler.yield()
async function yieldToMain() {
  if ('scheduler' in window && 'yield' in window.scheduler) {
    return await window.scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

for (let i = 0; i < items.length; i++) {
  processItem(items[i]);
  if (i % 50 === 0) await yieldToMain();
}`,
        bundlerConfigPatch: `// Next.js / Webpack: optimize bundle splitting
experimental: {
  optimizePackageImports: ['lodash-es', 'date-fns'],
}`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=total-blocking-time`,
        recommendedPackages: ["web-vitals"],
        estimatedDevMinutes: 50,
      };

    case "third-party-summary":
    case "third-party-facades":
      if (topVendor) {
        return {
          persona: "DEVELOPER",
          detectedStack: techStack,
          rootCauseAnalysis: `Third-party vendor '${topVendor.vendorName}' (${topVendor.flaggedUrl}) executes heavy tracking/media code on initial page load. ${topVendor.impactDescription}`,
          offendingResource: topVendor.flaggedUrl,
          remediationDiff: techStack === "NEXTJS"
            ? topVendor.recommendedRealFix.NEXTJS
            : techStack === "WORDPRESS" || techStack === "WOOCOMMERCE"
            ? topVendor.recommendedRealFix.WORDPRESS
            : techStack === "SHOPIFY"
            ? topVendor.recommendedRealFix.SHOPIFY
            : topVendor.recommendedRealFix.GENERAL,
          bundlerConfigPatch: `// Preconnect to third-party domain in <head>
<link rel="preconnect" href="${new URL(topVendor.flaggedUrl).origin}" crossorigin>`,
          cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=third-party-summary`,
          recommendedPackages: techStack === "NEXTJS" ? ["@next/third-parties"] : undefined,
          estimatedDevMinutes: 35,
        };
      }
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Heavy third-party embeds at '${primaryResource}' consume main thread bandwidth before user interaction.`,
        offendingResource: primaryResource,
        remediationDiff: `<!-- Click-to-load Facade Pattern -->
<div class="embed-facade" onclick="this.innerHTML='<iframe src=\\'${primaryResource}\\' allow=\\'autoplay\\' frameborder=\\'0\\'></iframe>'">
  <img src="/preview.webp" alt="Load Content" loading="lazy">
  <button type="button" aria-label="Play">▶</button>
</div>`,
        bundlerConfigPatch: `// Load embed asynchronously on interaction`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=third-party-facades`,
        estimatedDevMinutes: 30,
      };

    case "cache-insight":
    case "uses-long-cache-ttl":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Static asset '${primaryResource}' is delivered without immutable or long max-age cache headers, forcing repeat visitors to re-download unchanged files.`,
        offendingResource: primaryResource,
        remediationDiff: `# Nginx Configuration (/etc/nginx/conf.d/cache.conf)
location ~* \\.(css|js|woff2|webp|avif|png|jpg|svg)$ {
+   expires 1y;
+   add_header Cache-Control "public, max-age=31536000, immutable";
}

# Apache .htaccess
+ <FilesMatch "\\.(css|js|woff2|webp|avif|png|jpg|svg)$">
+   Header set Cache-Control "public, max-age=31536000, immutable"
+ </FilesMatch>`,
        bundlerConfigPatch: `# Cloudflare Edge Cache Rule
Edge Cache TTL: 1 year for /_next/static/* and /assets/*`,
        cliVerificationCommand: `curl -I ${primaryResource} | grep -i cache-control`,
        estimatedDevMinutes: 15,
      };

    case "unused-javascript":
    case "unused-css-rules":
      if (techStack === "WORDPRESS" || techStack === "WOOCOMMERCE") {
        return {
          persona: "DEVELOPER",
          detectedStack: techStack,
          rootCauseAnalysis: `WooCommerce frontend scripts (cart-fragments) and global Gutenberg block stylesheets are being requested on pages where they are completely unused, adding ${wastedMs}ms of unneeded parsing overhead.`,
          offendingResource: primaryResource,
          remediationDiff: `// functions.php - Dequeue Store Bloat & Separate Block Assets
+ // 1. Dequeue WooCommerce Cart Fragments & styles on non-eCommerce pages:
+ add_action('wp_enqueue_scripts', function() {
+     if (function_exists('is_woocommerce') && !is_woocommerce() && !is_cart() && !is_checkout() && !is_account_page()) {
+         wp_dequeue_script('wc-cart-fragments'); // Disables background AJAX polling on content pages
+         wp_dequeue_script('woocommerce');
+         wp_dequeue_style('woocommerce-general');
+         wp_dequeue_style('woocommerce-layout');
+     }
+ }, 99);
+ 
+ // 2. Conditionally load Gutenberg block CSS only when block is rendered:
+ add_filter('should_load_separate_core_block_assets', '__return_true');`,
          bundlerConfigPatch: `// Disable frontend emoji detection scripts
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');`,
          cliVerificationCommand: `wp cache flush`,
          recommendedPackages: ["@wordpress/scripts"],
          estimatedDevMinutes: 20,
        };
      }

      if (techStack === "LARAVEL") {
        return {
          persona: "DEVELOPER",
          detectedStack: "LARAVEL",
          rootCauseAnalysis: `Unused script bundle '${primaryResource}' loaded on all Blade views. Splitting vendor chunks via Vite cuts initial parsing overhead.`,
          offendingResource: primaryResource,
          remediationDiff: `// vite.config.js - Laravel Vite Plugin manualChunks
+ export default defineConfig({
+   plugins: [laravel(['resources/css/app.css', 'resources/js/app.js'])],
+   build: {
+     rollupOptions: {
+       output: {
+         manualChunks: (id) => id.includes('node_modules') ? 'vendor' : undefined,
+       },
+     },
+   },
+ });`,
          bundlerConfigPatch: `// resources/views/layouts/app.blade.php: Defer non-critical scripts\n@vite(['resources/js/app.js'])`,
          cliVerificationCommand: `npm run build && php artisan view:cache`,
          recommendedPackages: ["laravel-vite-plugin"],
          estimatedDevMinutes: 25,
        };
      }

      if (techStack === "SHOPIFY") {
        return {
          persona: "DEVELOPER",
          detectedStack: "SHOPIFY",
          rootCauseAnalysis: `Cart drawer and theme app extensions in '${primaryResource}' execute synchronously before user interaction.`,
          offendingResource: primaryResource,
          remediationDiff: `<!-- layout/theme.liquid -->
- <script src="{{ 'cart-drawer.js' | asset_url }}"></script>
+ <script src="{{ 'cart-drawer.js' | asset_url }}" defer="defer"></script>`,
          bundlerConfigPatch: `// Debounce cart quantity updates in cart-drawer.js\nconst debounce = (fn, delay = 300) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; };`,
          cliVerificationCommand: `shopify theme check`,
          estimatedDevMinutes: 20,
        };
      }

      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Unused code in bundle '${primaryResource}' increases compile and parse overhead.`,
        offendingResource: primaryResource,
        remediationDiff: techStack === "NEXTJS"
          ? `// Dynamic import non-initial component with { ssr: false }
- import HeavyWidget from '@/components/HeavyWidget';
+ const HeavyWidget = dynamic(() => import('@/components/HeavyWidget'), { ssr: false });`
          : techStack === "REACT"
          ? `// React.lazy dynamic component splitting
- import HeavyModal from './components/HeavyModal';
+ const HeavyModal = React.lazy(() => import('./components/HeavyModal'));`
          : `// Lazy load with import()
+ const module = await import('${primaryResource}');`,
        bundlerConfigPatch: `// Bundle splitting configuration`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=unused-javascript`,
        estimatedDevMinutes: 30,
      };

    case "server-response-time":
    case "time-to-first-byte":
    case "ttfb":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Origin server TTFB took ~${wastedMs}ms before serving the first byte of HTML. Caused by uncached SSR, cold starts, or slow database queries.`,
        offendingResource: primaryResource,
        remediationDiff: techStack === "NEXTJS"
          ? `// app/page.tsx: Enable ISR (Incremental Static Regeneration)
+ export const revalidate = 3600; // Cache on edge CDN for 1 hour

export default async function Page() {
  const data = await fetch('https://api.example.com/items', { next: { revalidate: 3600 } });
  return <main>...</main>;
}`
          : techStack === "WORDPRESS" || techStack === "WOOCOMMERCE"
          ? `// wp-config.php & .htaccess (WordPress Origin Response Optimization)
+ // 1. Limit post revisions to prevent wp_posts and wp_postmeta table bloat:
+ define('WP_POST_REVISIONS', 5);
+ define('WP_CACHE', true);
+ define('WP_REDIS_HOST', '127.0.0.1');
+ 
+ // 2. In .htaccess: Serve cached HTML directly to guest visitors (bypass for logged-in):
+ Header set Cache-Control "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" "expr=%{REQUEST_METHOD} == 'GET' && %{HTTP_COOKIE} !~ /wordpress_logged_in|woocommerce_items_in_cart/"`
          : techStack === "LARAVEL"
          ? `// app/Http/Controllers/PostController.php (Eliminate N+1 Queries)
- $posts = Post::all();
+ $posts = Post::with(['author', 'tags'])->paginate(15);
+ 
+ // Deployment optimizations:
+ // php artisan config:cache && php artisan route:cache && php artisan view:cache`
          : techStack === "SHOPIFY"
          ? `<!-- sections/main-collection.liquid: Paginate Liquid Queries -->
- {% for product in collection.products %}
+ {% paginate collection.products by 24 %}
+   {% for product in collection.products %}
+     {% render 'product-card', product: product %}
+   {% endfor %}
+ {% endpaginate %}`
          : `# Origin Cache Headers (Nginx/Apache)
+ Header set Cache-Control "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"`,
        bundlerConfigPatch: techStack === "WORDPRESS"
          ? `// Check wp_options autoload size in MySQL:
// SELECT option_name, length(option_value) FROM wp_options WHERE autoload = 'yes' ORDER BY length(option_value) DESC LIMIT 15;`
          : techStack === "LARAVEL"
          ? `// config/cache.php & .env: Use Redis for sessions & caching\nCACHE_DRIVER=redis\nSESSION_DRIVER=redis`
          : `// Database query indexing & connection pooling
// Ensure connection pooling (e.g., PgBouncer / Prisma Accelerate) is active`,
        cliVerificationCommand: techStack === "LARAVEL"
          ? `php artisan route:cache && php artisan config:cache && curl -w "TTFB: %{time_starttransfer}s\\n" -o /dev/null -s ${targetUrl}`
          : `curl -w "TTFB: %{time_starttransfer}s\\n" -o /dev/null -s ${targetUrl}`,
        estimatedDevMinutes: 35,
      };

    case "bfcache":
    case "bfcache-not-supported":
    case "back-forward-cache":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Page is blocked from entering browser bfcache. Navigating 'Back' forces a full network round-trip and document rebuild instead of instant memory retrieval.`,
        offendingResource: primaryResource,
        remediationDiff: `// Replace deprecated unload listener with pagehide
- window.addEventListener('unload', (e) => {
-   cleanupSession();
- });
+ window.addEventListener('pagehide', (e) => {
+   if (e.persisted) {
+     // Page is stored in bfcache
+   }
+   cleanupSession();
+ });`,
        bundlerConfigPatch: `// Server header check: ensure Cache-Control is NOT 'no-store' on HTML\nHeader set Cache-Control "private, no-cache, must-revalidate"`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=bfcache`,
        estimatedDevMinutes: 20,
      };

    case "duplicated-javascript":
    case "legacy-javascript":
    case "modern-browsers":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Duplicated library instances or outdated ES5/IE11 polyfills detected in '${primaryResource}'.`,
        offendingResource: primaryResource,
        remediationDiff: `// package.json - Target modern evergreen browsers
- "browserslist": ["> 0.2%", "not dead"]
+ "browserslist": [
+   "defaults and fully supports es6-module",
+   "> 0.5%",
+   "not dead"
+ ],
+ "overrides": {
+   "lodash": "^4.17.21"
+ }`,
        bundlerConfigPatch: `// vite.config.js / next.config.mjs: Deduplicate modules via alias\nresolve: { alias: { lodash: 'lodash-es' } }`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=duplicated-javascript`,
        estimatedDevMinutes: 25,
      };

    case "uses-text-compression":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Payload '${primaryResource}' is delivered uncompressed, wasting network bandwidth and increasing download time.`,
        offendingResource: primaryResource,
        remediationDiff: `# Nginx Server Block (/etc/nginx/nginx.conf)
+ gzip on;
+ gzip_types text/plain text/css application/javascript application/json image/svg+xml;
+ brotli on;
+ brotli_types text/plain text/css application/javascript application/json image/svg+xml;`,
        bundlerConfigPatch: `// Enable Brotli in CDN / Cloudflare Speed settings`,
        cliVerificationCommand: `curl -H "Accept-Encoding: gzip, br" -I ${primaryResource} | grep -i content-encoding`,
        estimatedDevMinutes: 15,
      };

    default:
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Diagnostic audit '${issue.title}' flagged for '${primaryResource}'. Parser and execution overhead impact Core Web Vitals score.`,
        offendingResource: primaryResource,
        remediationDiff: primaryResource.endsWith(".js")
          ? `<!-- Defer or dynamically import flagged script -->\n- <script src="${primaryResource}"></script>\n+ <script src="${primaryResource}" defer></script>`
          : primaryResource.endsWith(".css")
          ? `<!-- Preload stylesheet and load asynchronously -->\n+ <link rel="preload" href="${primaryResource}" as="style">\n+ <link rel="stylesheet" href="${primaryResource}" media="print" onload="this.media='all'">`
          : `// Optimize asset delivery for ${issue.code}\n// Ensure caching, modern format, and non-blocking loading are applied`,
        bundlerConfigPatch: `// Optimize production build configuration for ${techStack}`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=${issue.code}`,
        estimatedDevMinutes: 30,
      };
  }
}
