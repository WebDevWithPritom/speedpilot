import { describe, it, expect } from "vitest";
import { detectTechStack } from "../src/tech-detector.js";

describe("Technology Framework Detection", () => {
  it("should accurately detect Next.js websites", () => {
    const nextHtml = `
      <html>
      <head>
        <script src="/_next/static/chunks/main-app.js"></script>
      </head>
      <body>
        <script id="__NEXT_DATA__" type="application/json">{}</script>
      </body>
      </html>
    `;
    const res = detectTechStack(nextHtml);
    expect(res.detectedStack).toBe("NEXTJS");
    expect(res.confidence).toBe("HIGH");
  });

  it("should accurately detect WordPress sites", () => {
    const wpHtml = `
      <html>
      <head>
        <meta name="generator" content="WordPress 6.4.2" />
        <link rel="stylesheet" href="https://example.com/wp-content/themes/twentytwentyfour/style.css" />
      </head>
      <body></body>
      </html>
    `;
    const res = detectTechStack(wpHtml);
    expect(res.detectedStack).toBe("WORDPRESS");
    expect(res.confidence).toBe("HIGH");
  });

  it("should detect WooCommerce over plain WordPress when WooCommerce markers exist", () => {
    const wooHtml = `
      <body class="woocommerce woocommerce-page">
        <script src="/wp-content/plugins/woocommerce/assets/js/frontend/woocommerce.min.js"></script>
      </body>
    `;
    const res = detectTechStack(wooHtml);
    expect(res.detectedStack).toBe("WOOCOMMERCE");
    expect(res.confidence).toBe("HIGH");
  });

  it("should detect Shopify storefronts", () => {
    const shopifyHtml = `
      <html>
      <head>
        <script src="//cdn.shopify.com/s/files/1/000/t/1/assets/theme.js"></script>
      </head>
      <body>
        <script>window.Shopify = { theme: { id: 1234 } };</script>
      </body>
      </html>
    `;
    const res = detectTechStack(shopifyHtml);
    expect(res.detectedStack).toBe("SHOPIFY");
    expect(res.confidence).toBe("HIGH");
  });

  it("should return UNKNOWN when no framework markers are present", () => {
    const plainHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Handcrafted HTML</title></head>
      <body><p>Clean vanilla page</p></body>
      </html>
    `;
    const res = detectTechStack(plainHtml);
    expect(res.detectedStack).toBe("UNKNOWN");
  });

  it("should extract sub-stacks (plugins/CDN), existing head hints, and response headers", () => {
    const wpLiteSpeedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="preload" as="font" href="/wp-content/themes/Divi/fonts/main.woff2">
        <link rel="stylesheet" href="/wp-content/litespeed/css/bundle.css">
      </head>
      <body class="et_pb_section"></body>
      </html>
    `;
    const headers = new Headers({
      server: "cloudflare",
      "cf-ray": "abc123",
      "content-encoding": "br",
      "cache-control": "public, max-age=3600",
    });
    const res = detectTechStack(wpLiteSpeedHtml, headers);
    expect(res.detectedStack).toBe("WORDPRESS");
    expect(res.subStacks).toEqual(expect.arrayContaining(["LiteSpeed Cache", "Divi Theme", "Cloudflare CDN"]));
    expect(res.existingHints).toContain("/wp-content/themes/Divi/fonts/main.woff2");
    expect(res.responseHeaders.contentEncoding).toBe("br");
    expect(res.responseHeaders.server).toBe("cloudflare");
  });
});

