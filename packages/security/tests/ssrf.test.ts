import { describe, it, expect } from "vitest";
import { isPrivateIPv4, isPrivateIPv6, isPrivateIP, validateHostAgainstSSRF, SecurityError } from "../src/ssrf.js";

describe("SSRF Protection - IP Validation", () => {
  it("should block loopback addresses", () => {
    expect(isPrivateIPv4("127.0.0.1")).toBe(true);
    expect(isPrivateIPv4("127.10.20.30")).toBe(true);
    expect(isPrivateIPv6("::1")).toBe(true);
    expect(isPrivateIPv6("::ffff:127.0.0.1")).toBe(true);
  });

  it("should block RFC 1918 private subnets", () => {
    // 10.0.0.0/8
    expect(isPrivateIPv4("10.0.0.1")).toBe(true);
    expect(isPrivateIPv4("10.255.255.254")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateIPv4("172.16.0.1")).toBe(true);
    expect(isPrivateIPv4("172.31.255.255")).toBe(true);
    expect(isPrivateIPv4("172.32.0.1")).toBe(false); // Public

    // 192.168.0.0/16
    expect(isPrivateIPv4("192.168.1.1")).toBe(true);
    expect(isPrivateIPv4("192.168.100.254")).toBe(true);
  });

  it("should block Cloud Metadata and Link-Local addresses (169.254.169.254)", () => {
    expect(isPrivateIPv4("169.254.169.254")).toBe(true);
    expect(isPrivateIPv4("169.254.1.1")).toBe(true);
    expect(isPrivateIPv6("fe80::1")).toBe(true);
  });

  it("should block 0.0.0.0 and carrier grade NAT 100.64.0.0/10", () => {
    expect(isPrivateIPv4("0.0.0.0")).toBe(true);
    expect(isPrivateIPv4("100.64.0.1")).toBe(true);
    expect(isPrivateIPv4("100.127.255.255")).toBe(true);
    expect(isPrivateIPv4("100.128.0.1")).toBe(false); // Public
  });

  it("should allow valid public IP addresses", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("1.1.1.1")).toBe(false);
    expect(isPrivateIP("142.250.190.46")).toBe(false);
  });

  it("should reject localhost and internal hostnames directly", async () => {
    await expect(validateHostAgainstSSRF("localhost")).rejects.toThrow(SecurityError);
    await expect(validateHostAgainstSSRF("app.internal")).rejects.toThrow(SecurityError);
    await expect(validateHostAgainstSSRF("service.local")).rejects.toThrow(SecurityError);
  });

  it("should reject IP literal pointing to loopback or private range", async () => {
    await expect(validateHostAgainstSSRF("127.0.0.1")).rejects.toThrow(SecurityError);
    await expect(validateHostAgainstSSRF("169.254.169.254")).rejects.toThrow(SecurityError);
    await expect(validateHostAgainstSSRF("10.0.0.5")).rejects.toThrow(SecurityError);
  });
});

