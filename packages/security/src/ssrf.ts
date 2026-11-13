import * as dns from "node:dns/promises";
import * as net from "node:net";

export class SecurityError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SecurityError";
  }
}

/**
 * Checks whether an IPv4 address string falls into private, loopback, link-local, or reserved ranges.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 treated as unsafe
  }

  const [a, b] = parts as [number, number, number, number];

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local, including Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private network: 172.16.0.0 – 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;

  // 100.64.0.0/10 (Shared address space / Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0) return true;

  // 198.18.0.0/15 (Network benchmark tests)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved for future use)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks whether an IPv6 address string falls into loopback, unique local, or link-local ranges.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // ::1/128 (Loopback) or :: (Unspecified)
  if (normalized === "::1" || normalized === "::") return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith("::ffff:")) {
    const v4Part = normalized.replace("::ffff:", "");
    if (net.isIPv4(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
  }

  // fc00::/7 (Unique local address)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // fe80::/10 (Link-local address)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || 
      normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }

  return false;
}

/**
 * Determines whether an IP address (v4 or v6) is private or internal.
 */
export function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateIPv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isPrivateIPv6(ip);
  }
  return true; // If not valid IP, treat as unsafe
}

/**
 * Resolves a hostname via DNS and verifies that all resolved IP addresses are strictly public.
 */
export async function validateHostAgainstSSRF(hostname: string): Promise<string[]> {
  const trimmed = hostname.trim().toLowerCase();

  // Block localhost and standard loopback hostnames directly
  if (
    trimmed === "localhost" ||
    trimmed.endsWith(".localhost") ||
    trimmed.endsWith(".local") ||
    trimmed.endsWith(".internal")
  ) {
    throw new SecurityError(`Access to host '${trimmed}' is forbidden (SSRF protection).`, "FORBIDDEN_HOST");
  }

  // Check if hostname is an IP literal
  if (net.isIP(trimmed)) {
    if (isPrivateIP(trimmed)) {
      throw new SecurityError(`Access to private IP '${trimmed}' is forbidden (SSRF protection).`, "PRIVATE_IP_BLOCKED");
    }
    return [trimmed];
  }

  // Resolve DNS A and AAAA records
  try {
    const addresses = await dns.lookup(trimmed, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new SecurityError(`Could not resolve hostname '${trimmed}'.`, "DNS_RESOLUTION_FAILED");
    }

    const publicIps: string[] = [];
    for (const record of addresses) {
      if (isPrivateIP(record.address)) {
        throw new SecurityError(
          `Hostname '${trimmed}' resolved to private address '${record.address}' (SSRF protection).`,
          "PRIVATE_IP_BLOCKED"
        );
      }
      publicIps.push(record.address);
    }

    return publicIps;
  } catch (err: unknown) {
    if (err instanceof SecurityError) throw err;
    throw new SecurityError(`DNS lookup failed for '${trimmed}': ${(err as Error).message}`, "DNS_LOOKUP_ERROR");
  }
}
