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
          rootCauseAnalysis: `Enqueue scripts/styles in WordPress 'wp_head' without async/defer attributes halts DOM construction for ${wastedMs}ms. Offending asset: ${primaryResource}.`,
          offendingResource: primaryResource,
          remediationDiff: `// functions.php
add_filter('style_loader_tag', function($html, $handle) {
    if (in_array($handle, ['non-critical-plugin-style', 'theme-extra'])) {
        return str_replace("rel='stylesheet'", "rel='preload' as='style' onload=\\"this.onload=null;this.rel='stylesheet'\\"", $html);
    }
    return $html;
}, 10, 2);

add_filter('script_loader_tag', function($tag, $handle) {
    if (!is_admin() && $handle !== 'jquery-core') {
        return str_replace(' src', ' defer src', $tag);
    }
    return $tag;
}, 10, 2);`,
          bundlerConfigPatch: `# .htaccess / NGINX Caching header
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>`,
          cliVerificationCommand: `wp-scripts build && wp cache flush`,
          recommendedPackages: ["wp-scripts"],
          estimatedDevMinutes: 60,
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
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=largest-contentful-paint-element`,
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
          : `# Origin Cache Headers (Nginx/Apache)
+ Header set Cache-Control "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"`,
        bundlerConfigPatch: `// Database query indexing & connection pooling
// Ensure connection pooling (e.g., PgBouncer / Prisma Accelerate) is active`,
        cliVerificationCommand: `curl -w "TTFB: %{time_starttransfer}s\\n" -o /dev/null -s ${targetUrl}`,
        estimatedDevMinutes: 40,
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
