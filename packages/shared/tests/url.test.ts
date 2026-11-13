import { describe, it, expect } from "vitest";
import { validateAndNormalizeUrl, parseBulkUrlString, extractDomain } from "../src/utils/url.js";

describe("URL Utilities & Normalization", () => {
  it("should normalize valid URLs without protocol", () => {
    const res = validateAndNormalizeUrl("example.com/pricing");
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe("https://example.com/pricing");
  });

  it("should strip URL hash fragments", () => {
    const res = validateAndNormalizeUrl("https://example.com/docs#installation");
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe("https://example.com/docs");
  });

  it("should standardize lowercase hostnames and remove duplicate slashes", () => {
    const res = validateAndNormalizeUrl("HTTP://MySite.COM//blog///speed");
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe("http://mysite.com/blog/speed");
  });

  it("should preserve query parameters", () => {
    const res = validateAndNormalizeUrl("https://example.com/search?q=speed&sort=asc");
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe("https://example.com/search?q=speed&sort=asc");
  });

  it("should reject non-HTTP schemes like javascript: or file:", () => {
    expect(validateAndNormalizeUrl("javascript:alert(1)").isValid).toBe(false);
    expect(validateAndNormalizeUrl("file:///etc/passwd").isValid).toBe(false);
    expect(validateAndNormalizeUrl("ftp://files.example.com").isValid).toBe(false);
  });

  it("should parse multiline text into unique valid URLs", () => {
    const raw = `
      https://example.com
      https://example.com/
      example.com/pricing
      not a valid url @@!
      https://example.com/blog#section
    `;
    const result = parseBulkUrlString(raw);
    expect(result.validUrls).toHaveLength(3);
    expect(result.validUrls).toContain("https://example.com/");
    expect(result.validUrls).toContain("https://example.com/pricing");
    expect(result.validUrls).toContain("https://example.com/blog");
    expect(result.invalidEntries).toHaveLength(1);
    expect(result.invalidEntries[0]?.raw).toContain("not a valid url");
  });

  it("should extract domain accurately", () => {
    expect(extractDomain("https://store.acme.co.uk/products?id=12")).toBe("store.acme.co.uk");
    expect(extractDomain("invalid-url")).toBeNull();
  });
});
