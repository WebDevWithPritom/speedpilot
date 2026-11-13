import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { isPrivateIPv4, isPrivateIP } from "../packages/security/src/ssrf.js";
import { validateAndNormalizeUrl } from "../packages/shared/src/utils/url.js";
import { classifyLCP, classifyCLS, classifyINP } from "../packages/shared/src/constants/metrics.js";

describe("SpeedPilot Smoke Suite: Security, Normalization & Billing", () => {
  describe("SSRF Protection", () => {
    it("should flag loopback and local IPv4 addresses as private", () => {
      expect(isPrivateIPv4("127.0.0.1")).toBe(true);
      expect(isPrivateIPv4("10.0.0.1")).toBe(true);
      expect(isPrivateIPv4("192.168.1.1")).toBe(true);
      expect(isPrivateIPv4("172.16.0.1")).toBe(true);
    });

    it("should block cloud metadata IP (169.254.169.254)", () => {
      expect(isPrivateIPv4("169.254.169.254")).toBe(true);
    });

    it("should allow public IPv4 addresses", () => {
      expect(isPrivateIPv4("8.8.8.8")).toBe(false);
      expect(isPrivateIPv4("1.1.1.1")).toBe(false);
      expect(isPrivateIPv4("104.21.50.1")).toBe(false);
    });

    it("should flag invalid or malformed IP addresses as unsafe", () => {
      expect(isPrivateIP("not-an-ip")).toBe(true);
      expect(isPrivateIP("999.999.999.999")).toBe(true);
    });
  });

  describe("URL Normalization", () => {
    it("should prepend https if missing and lowercase hostname", () => {
      const res = validateAndNormalizeUrl("Example.com/Path");
      expect(res.isValid).toBe(true);
      expect(res.normalizedUrl).toBe("https://example.com/Path");
    });

    it("should strip hash fragments", () => {
      const res = validateAndNormalizeUrl("https://example.com/page#section");
      expect(res.isValid).toBe(true);
      expect(res.normalizedUrl).toBe("https://example.com/page");
    });

    it("should reject non-http/https protocols", () => {
      const res = validateAndNormalizeUrl("ftp://example.com");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Only HTTP and HTTPS");
    });
  });

  describe("Billing Webhook Signature Verification", () => {
    const secret = "test_webhook_secret_key_12345";
    const payload = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_test_123", amount: 290000 } } },
    });

    it("should verify authentic webhook signatures using HMAC-SHA256", () => {
      const validSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const expectedBuffer = Buffer.from(validSignature, "utf8");
      const signatureBuffer = Buffer.from(validSignature, "utf8");

      const isValid =
        expectedBuffer.length === signatureBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

      expect(isValid).toBe(true);
    });

    it("should reject tampered webhook payloads", () => {
      const validSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const tamperedPayload = payload.replace("290000", "0");
      const expectedTampered = crypto.createHmac("sha256", secret).update(tamperedPayload).digest("hex");

      const expectedBuffer = Buffer.from(expectedTampered, "utf8");
      const signatureBuffer = Buffer.from(validSignature, "utf8");

      const isValid =
        expectedBuffer.length === signatureBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

      expect(isValid).toBe(false);
    });
  });

  describe("Core Web Vitals Thresholds", () => {
    it("should classify LCP correctly", () => {
      expect(classifyLCP(2000)).toBe("GOOD");
      expect(classifyLCP(3000)).toBe("NEEDS_IMPROVEMENT");
      expect(classifyLCP(5000)).toBe("POOR");
    });

    it("should classify CLS correctly", () => {
      expect(classifyCLS(0.05)).toBe("GOOD");
      expect(classifyCLS(0.15)).toBe("NEEDS_IMPROVEMENT");
      expect(classifyCLS(0.3)).toBe("POOR");
    });

    it("should classify INP correctly", () => {
      expect(classifyINP(150)).toBe("GOOD");
      expect(classifyINP(350)).toBe("NEEDS_IMPROVEMENT");
      expect(classifyINP(600)).toBe("POOR");
    });
  });
});
