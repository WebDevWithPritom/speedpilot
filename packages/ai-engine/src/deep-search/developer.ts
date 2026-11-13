import { TechStack, NormalizedAuditIssue } from "@speedpilot/shared";
import { DeveloperDeepSearchResult } from "./types.js";

export function getDeterministicDeveloperDeepSearch(
  issue: NormalizedAuditIssue,
  techStack: TechStack,
  targetUrl: string
): DeveloperDeepSearchResult {
  const primaryResource = issue.evidenceItems[0]?.url || targetUrl;
  const wastedMs = issue.evidenceItems[0]?.wastedMs || 450;

  switch (issue.code) {
    case "render-blocking-resources":
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
+         <link rel="preload" href="/heavy-theme.css" as="style" />
+         <link rel="stylesheet" href="/heavy-theme.css" media="print" onLoad="this.media='all'" />
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
          cliVerificationCommand: `npx lighthouse ${targetUrl} --only-categories=performance --view`,
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
          bundlerConfigPatch: `// Shopify CLI 3.x build config
// Ensure theme app extensions defer async script blocks
export default {
  theme: {
    sync: true,
  }
};`,
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
        bundlerConfigPatch: `// vite.config.ts / webpack.config.js: Split chunks for initial bundle`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=render-blocking-resources`,
        estimatedDevMinutes: 30,
      };

    case "largest-contentful-paint-element":
    case "prioritize-lcp-image":
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Hero visual element at '${primaryResource}' lacks high fetchpriority and preload hints, inflating Largest Contentful Paint.`,
        offendingResource: primaryResource,
        remediationDiff: techStack === "NEXTJS"
          ? `// Next.js Image Component
- <Image src="/hero.jpg" alt="Hero" width={1200} height={600} />
+ <Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority fetchPriority="high" sizes="100vw" />`
          : `<!-- High Priority Hero Preload -->
+ <link rel="preload" fetchpriority="high" as="image" href="${primaryResource}" type="image/webp">`,
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

    default:
      return {
        persona: "DEVELOPER",
        detectedStack: techStack,
        rootCauseAnalysis: `Diagnostic audit '${issue.title}' flagged for '${primaryResource}'. Parser and execution overhead impact Core Web Vitals score.`,
        offendingResource: primaryResource,
        remediationDiff: `// Optimized implementation
// Review resource loading strategy for ${issue.code}`,
        bundlerConfigPatch: `// Optimize production bundler config for ${techStack}`,
        cliVerificationCommand: `npx lighthouse ${targetUrl} --only-audits=${issue.code}`,
        estimatedDevMinutes: 40,
      };
  }
}
