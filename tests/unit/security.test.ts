import { describe, it, expect } from "vitest";
import { isPrivateIPv4, isPrivateIPv6, isPrivateIP, safeFetch, SecurityError } from "@speedpilot/security";

describe("Security Suite — SSRF & IP Boundary Protection", () => {
  it("blocks private IPv4 loopback ranges (127.0.0.1)", () => {
    expect(isPrivateIPv4("127.0.0.1")).toBe(true);
    expect(isPrivateIPv4("127.0.1.10")).toBe(true);
    expect(isPrivateIP("127.0.0.1")).toBe(true);
  });

  it("blocks AWS/GCP cloud metadata IP (169.254.169.254)", () => {
    expect(isPrivateIPv4("169.254.169.254")).toBe(true);
    expect(isPrivateIPv4("169.254.1.1")).toBe(true);
    expect(isPrivateIP("169.254.169.254")).toBe(true);
  });

  it("blocks RFC 1918 private IPv4 subnets (10.x, 172.16-31.x, 192.168.x)", () => {
    expect(isPrivateIPv4("10.0.0.1")).toBe(true);
    expect(isPrivateIPv4("10.255.255.255")).toBe(true);
    expect(isPrivateIPv4("172.16.0.1")).toBe(true);
    expect(isPrivateIPv4("172.31.255.255")).toBe(true);
    expect(isPrivateIPv4("192.168.1.1")).toBe(true);
    expect(isPrivateIPv4("192.168.0.254")).toBe(true);
    expect(isPrivateIP("192.168.1.1")).toBe(true);
  });

  it("allows safe public IPv4 addresses", () => {
    expect(isPrivateIPv4("8.8.8.8")).toBe(false);
    expect(isPrivateIPv4("1.1.1.1")).toBe(false);
    expect(isPrivateIPv4("142.250.190.46")).toBe(false);
    expect(isPrivateIP("8.8.8.8")).toBe(false);
  });

  it("blocks IPv6 loopback (::1) and private IPv6 ranges", () => {
    expect(isPrivateIPv6("::1")).toBe(true);
    expect(isPrivateIPv6("fe80::1")).toBe(true);
    expect(isPrivateIPv6("fc00::1")).toBe(true);
    expect(isPrivateIP("::1")).toBe(true);
  });

  it("validates and rejects non-http/https schemes in safeFetch", async () => {
    await expect(safeFetch("ftp://example.com")).rejects.toThrow(SecurityError);
    await expect(safeFetch("file:///etc/passwd")).rejects.toThrow(SecurityError);
    await expect(safeFetch("javascript:alert(1)")).rejects.toThrow(SecurityError);
  });

  it("rejects loopback and localhost hostnames via SSRF guard in safeFetch", async () => {
    await expect(safeFetch("http://localhost:3000")).rejects.toThrow(SecurityError);
    await expect(safeFetch("http://127.0.0.1:8080")).rejects.toThrow(SecurityError);
    await expect(safeFetch("http://169.254.169.254/latest/meta-data/")).rejects.toThrow(SecurityError);
  });
});
