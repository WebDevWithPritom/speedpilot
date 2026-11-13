import { AIRecommendationOutput, TechStack } from "@speedpilot/shared";

export function getDeterministicRecommendation(
  issueCode: string,
  techStack: TechStack,
  evidenceResource?: string,
  wastedMs?: number
): AIRecommendationOutput {
  const savingsNotice = wastedMs ? ` (~${wastedMs}ms potential savings)` : "";
  const resourceNotice = evidenceResource ? ` affecting '${evidenceResource}'` : "";

  // Render-blocking resources
  if (issueCode === "render-blocking-resources") {
    if (techStack === "NEXTJS") {
      return {
        detectedStack: "NEXTJS",
        explanationMarketer: `The website takes extra time to render visible content because stylesheets or scripts are loaded synchronously before HTML elements are drawn${savingsNotice}. Delaying non-critical styles improves first impressions and organic search rankings.`,
        explanationDeveloper: `Synchronous CSS or JS links in <head> block the browser parser from building the Render Tree${resourceNotice}. In Next.js App Router, rely on CSS Modules or Next.js built-in font/style optimization with 'next/font' and preload non-critical CSS.`,
        explanationAgency: `High impact optimization. Eliminating this block directly recovers ~${wastedMs || 500}ms on mobile devices, lifting Core Web Vitals LCP into the 'Good' tier.`,
        explanationSaaSTeam: `Core render path bottleneck. Resolving this protects the 75th percentile LCP target during incoming marketing campaigns.`,
        remediationCodeSnippet: `// Next.js App Router (app/layout.tsx)\n// 1. Use next/font to automatically inline critical font CSS\nimport { Inter } from 'next/font/google';\nconst inter = Inter({ subsets: ['latin'], display: 'swap' });\n\n// 2. Preload non-critical external third-party styles\n<link rel="preload" href="/theme-extra.css" as="style" />\n<link rel="stylesheet" href="/theme-extra.css" media="print" onLoad="this.media='all'" />`,
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
        remediationCodeSnippet: `// In your theme's functions.php or custom plugin:\nadd_filter('style_loader_tag', function($html, $handle) {\n    if ($handle === 'non-critical-plugin-style') {\n        return str_replace("rel='stylesheet'", "rel='preload' as='style' onload=\\"this.onload=null;this.rel='stylesheet'\\"", $html);\n    }\n    return $html;\n}, 10, 2);`,
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
        remediationCodeSnippet: `<!-- In theme.liquid: replace standard stylesheet_tag with preload -->\n{{ 'theme.css' | asset_url | preload_tag: as: 'style' }}\n<link rel="stylesheet" href="{{ 'theme.css' | asset_url }}" media="print" onload="this.media='all'">`,
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
      remediationCodeSnippet: `<!-- Defer non-critical scripts -->\n<script src="/bundle.js" defer></script>\n\n<!-- Preload styles -->\n<link rel="preload" href="/style.css" as="style" onload="this.onload=null;this.rel='stylesheet'">`,
      implementationSteps: [
        "Add defer or async to all non-critical script tags",
        "Extract above-the-fold CSS and inline into <head>",
      ],
      verificationSteps: [
        "Audit with SpeedPilot and check First Contentful Paint decrease",
      ],
      estimatedDifficulty: "EASY",
      estimatedImpact: "HIGH",
    };
  }

  // Modern image formats & image optimization
  if (issueCode === "modern-image-formats" || issueCode === "uses-optimized-images") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Images on the page are stored in older formats (PNG/JPEG) that are 50-80% larger than modern formats (WebP/AVIF). Switching to modern formats cuts mobile data usage and speeds up image load time.`,
      explanationDeveloper: `Large raster images contribute excess payload to the network critical path. Convert source images to WebP or AVIF using next/image, sharp, or build-time imagemin pipelines.`,
      explanationAgency: `Quick win for client sites. Compressing and modernizing images frequently cuts page weight by several megabytes.`,
      explanationSaaSTeam: `Bandwidth reduction and CDN egress cost optimization.`,
      remediationCodeSnippet: `<!-- HTML Modern Picture Syntax -->\n<picture>\n  <source srcset="/banner.avif" type="image/avif">\n  <source srcset="/banner.webp" type="image/webp">\n  <img src="/banner.jpg" alt="Hero Banner" width="1200" height="600" loading="lazy" decoding="async">\n</picture>`,
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

  // Default fallback for any other diagnostic issue
  return {
    detectedStack: techStack,
    explanationMarketer: `SpeedPilot identified an opportunity to optimize '${issueCode}'${savingsNotice}. Resolving this issue improves user responsiveness and site performance.`,
    explanationDeveloper: `Lighthouse diagnostic flagged '${issueCode}'${resourceNotice}. Inspect asset size, cache headers, and execution order.`,
    explanationAgency: `Recommended optimization to include in client performance roadmap.`,
    explanationSaaSTeam: `Monitor metric regression in continuous delivery pipeline.`,
    remediationCodeSnippet: `// Review offending resource configuration and optimize loading strategy`,
    implementationSteps: [
      "Review the specific offending URLs highlighted in the audit evidence",
      "Apply minification, caching, or code-splitting as appropriate",
    ],
    verificationSteps: [
      "Run SpeedPilot audit to verify resolution",
    ],
    estimatedDifficulty: "MEDIUM",
    estimatedImpact: "MEDIUM",
  };
}

