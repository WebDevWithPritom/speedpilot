import { describe, it, expect } from "vitest";
import { validateAndNormalizeUrl } from "@speedpilot/shared";

describe("Shared Utils Suite — URL Normalization & Sanitization", () => {
  it("normalizes root domains with standard https protocol", () => {
    const res = validateAndNormalizeUrl("example.com");
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe("https://example.com/");
  });

  it("strips hash fragments while preserving query parameters", () => {
    const res = validateAndNormalizeUrl("https://example.com/products?sort=asc#reviews");
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe("https://example.com/products?sort=asc");
  });

  it("removes trailing slashes from subpaths but preserves root trailing slash", () => {
    const subpath = validateAndNormalizeUrl("https://example.com/blog/article-1/");
    expect(subpath.isValid).toBe(true);
    expect(subpath.normalizedUrl).toBe("https://example.com/blog/article-1");

    const root = validateAndNormalizeUrl("https://example.com/");
    expect(root.isValid).toBe(true);
    expect(root.normalizedUrl).toBe("https://example.com/");
  });

  it("collapses duplicate redundant slashes in pathname", () => {
    const res = validateAndNormalizeUrl("https://example.com///docs///guide");
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe("https://example.com/docs/guide");
  });

  it("lowercases hostnames while preserving case-sensitive query params", () => {
    const res = validateAndNormalizeUrl("https://SUB.DOMAIN.EXAMPLE.COM/Path?SearchToken=AbCdEf");
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toContain("https://sub.domain.example.com/");
    expect(res.normalizedUrl).toContain("SearchToken=AbCdEf");
  });

  it("rejects invalid, empty, or unsupported protocol URLs", () => {
    expect(validateAndNormalizeUrl("").isValid).toBe(false);
    expect(validateAndNormalizeUrl("ftp://files.example.com").isValid).toBe(false);
    expect(validateAndNormalizeUrl("javascript:void(0)").isValid).toBe(false);
    expect(validateAndNormalizeUrl("not a url at all").isValid).toBe(false);
  });
});
