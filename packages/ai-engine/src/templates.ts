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

  // Link discernible name
  if (issueCode === "link-name") {
    return {
      detectedStack: techStack,
      explanationMarketer: `Links on the page lack clear text (e.g. icon-only links or empty anchor tags). Search engine spiders and AI agents cannot determine where these links lead, hurting SEO and conversions.`,
      explanationDeveloper: `<a> anchor tags lack discernible text content, 'aria-label', or 'aria-labelledby'. Screen readers and AI agent crawlers cannot announce or crawl the destination.`,
      explanationAgency: `Fundamental SEO and accessibility requirement. Every link must explicitly state its destination for both humans and AI bots.`,
      explanationSaaSTeam: `Prevents crawler dead-ends and ensures complete sitemap traversal by agentic web spiders.`,
      remediationCodeSnippet: `<!-- Before -->\n<a href="/cart"><i class="fa fa-shopping-bag"></i></a>\n\n<!-- Recommended Fix -->\n<a href="/cart" aria-label="View Shopping Cart (3 items)">\n  <i class="fa fa-shopping-bag" aria-hidden="true"></i>\n  <span class="sr-only">Shopping Cart</span>\n</a>`,
      implementationSteps: [
        "Locate all icon-only links across headers, footers, and product cards",
        "Add explicit 'aria-label' describing destination or include a .sr-only visually hidden text span",
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

  // Largest Contentful Paint (LCP)
  if (issueCode === "largest-contentful-paint" || issueCode === "lcp") {
    return {
      detectedStack: techStack,
      explanationMarketer: `The largest visual element on the page (usually hero banner, headline, or carousel) takes too long to appear${savingsNotice}. Improving LCP creates an immediate impression of speed and directly boosts Google rankings.`,
      explanationDeveloper: `LCP element suffers from slow resource load time or render delay. Preload the LCP hero image with fetchpriority='high' and eliminate render-blocking CSS/JS ahead of it.`,
      explanationAgency: `Google Core Web Vitals ranking factor. Keeping LCP under 2.5 seconds passes the official search ranking threshold.`,
      explanationSaaSTeam: `Critical conversion metric. B2B and e-commerce conversions jump when LCP is under 2.0s.`,
      remediationCodeSnippet: `<!-- In HTML <head>: Priority Preload LCP Asset -->\n<link rel="preload" as="image" href="/hero-banner.webp" fetchpriority="high" type="image/webp">\n\n<!-- On LCP <img> Tag -->\n<img src="/hero-banner.webp" alt="Hero" fetchpriority="high" loading="eager" width="1200" height="600">`,
      implementationSteps: [
        "Identify LCP node in audit evidence (hero image or primary heading)",
        "Add <link rel='preload' as='image' fetchpriority='high'> to <head>",
        "Ensure LCP image has loading='eager' (never loading='lazy')",
        "Serve LCP image from a global edge CDN in modern WebP/AVIF format",
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

  // Unused JavaScript / Code-Splitting
  if (issueCode === "unused-javascript") {
    return {
      detectedStack: techStack,
      explanationMarketer: `The website is downloading large scripts containing code that isn't needed on this page${savingsNotice}. This drains user mobile data and slows down phone processors.`,
      explanationDeveloper: `Bundles contain unexecuted code paths. Implement dynamic imports (code-splitting), review vendor dependencies, and remove unused heavy packages.`,
      explanationAgency: `Cuts initial bundle weight by 30-50%. Directly improves Interaction to Next Paint (INP) and Total Blocking Time (TBT).`,
      explanationSaaSTeam: `Reduces script compilation overhead on low-end client devices.`,
      remediationCodeSnippet: `// Dynamic import for heavy components (Next.js / React)\nimport dynamic from 'next/dynamic';\nconst HeavyDataChart = dynamic(() => import('@/components/HeavyChart'), {\n  ssr: false,\n  loading: () => <div className="h-64 animate-pulse bg-muted rounded" />,\n});`,
      implementationSteps: [
        "Analyze bundle using next/bundle-analyzer or webpack-bundle-analyzer",
        "Convert non-initial route components, modals, and charts to dynamic imports",
        "Audit third-party tags in Google Tag Manager and remove obsolete scripts",
      ],
      verificationSteps: [
        "Inspect Network tab to verify reduced JavaScript payload",
        "Verify Total Blocking Time (TBT) drop in SpeedPilot",
      ],
      estimatedDifficulty: "MEDIUM",
      estimatedImpact: "HIGH",
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

