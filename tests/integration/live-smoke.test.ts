import { describe, it, expect } from "vitest";

const BASE_URL = process.env.SPEEDPILOT_URL || "https://speedpilot.webdevwithpritom.com";

describe("Live Production Integration & Smoke Suite — SpeedPilot API Gateway", { timeout: 20000 }, () => {
  it("verifies health check endpoint returns 200 OK and connected database", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.database).toBe("connected");
    expect(data.timestamp).toBeDefined();
  });

  it("verifies head-to-head battle comparison endpoint enforces input validation", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/comparisons/battle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("provide both URLs");
  });

  it("verifies single-page trial audit endpoint enforces valid target URLs", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/audits/trial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "not-a-valid-url" }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("verifies client white-label portal safely rejects non-existent share tokens", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/share/audit/invalid-token-test-xyz`);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe("Audit report not found or link has been revoked.");
  });

  it("verifies Next.js auth middleware strictly guards protected API routes", async () => {
    // Protected SEO diff endpoint
    const resSeo = await fetch(`${BASE_URL}/api/v1/seo/diff`);
    expect(resSeo.status).toBe(401);

    // Protected sitemap discovery endpoint
    const resSitemap = await fetch(`${BASE_URL}/api/v1/sitemaps/discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "example.com" }),
    });
    expect(resSitemap.status).toBe(401);

    // Protected batch processing endpoint
    const resBatch = await fetch(`${BASE_URL}/api/v1/audits/non-existent-uuid/process-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retryTimeouts: true }),
    });
    expect(resBatch.status).toBe(401);
  });

  it("verifies public SSR frontend routes return 200 OK and valid HTML", async () => {
    const [resHome, resPricing, resFeatures] = await Promise.all([
      fetch(`${BASE_URL}/`),
      fetch(`${BASE_URL}/pricing`),
      fetch(`${BASE_URL}/features`),
    ]);

    expect(resHome.status).toBe(200);
    expect(resHome.headers.get("content-type")).toContain("text/html");

    expect(resPricing.status).toBe(200);
    expect(resPricing.headers.get("content-type")).toContain("text/html");

    expect(resFeatures.status).toBe(200);
    expect(resFeatures.headers.get("content-type")).toContain("text/html");
  });
});
