/**
 * Validates and normalizes target URLs.
 */

export interface URLValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  error?: string;
}

/**
 * Validates URL syntax and ensures http/https scheme.
 */
export function validateAndNormalizeUrl(rawInput: string): URLValidationResult {
  if (!rawInput || typeof rawInput !== "string") {
    return { isValid: false, error: "URL string cannot be empty." };
  }

  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: "URL string cannot be empty." };
  }

  // Prepend https:// if protocol is missing
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);

    // Only allow http and https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { isValid: false, error: "Only HTTP and HTTPS protocols are supported." };
    }

    // Host must have at least one dot or be a valid domain structure
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return { isValid: false, error: "Invalid hostname format." };
    }

    // Strip hash fragments (#...) as they do not affect server responses
    parsed.hash = "";

    // Normalize hostname to lowercase
    parsed.hostname = parsed.hostname.toLowerCase();

    // Standardize pathname (remove duplicate slashes)
    parsed.pathname = parsed.pathname.replace(/\/+/g, "/");

    // Standardize trailing slash: preserve root '/' but remove trailing slash on subpaths
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return {
      isValid: true,
      normalizedUrl: parsed.toString(),
    };
  } catch {
    return { isValid: false, error: "Malformed URL syntax." };
  }
}

/**
 * Ingests a raw multiline or comma-separated string of URLs and returns unique valid URLs.
 */
export function parseBulkUrlString(rawText: string): {
  validUrls: string[];
  invalidEntries: Array<{ raw: string; reason: string }>;
} {
  const lines = rawText.split(/[\r\n,]+/);
  const validSet = new Set<string>();
  const invalidEntries: Array<{ raw: string; reason: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const res = validateAndNormalizeUrl(trimmed);
    if (res.isValid && res.normalizedUrl) {
      validSet.add(res.normalizedUrl);
    } else {
      invalidEntries.push({ raw: trimmed, reason: res.error || "Invalid URL" });
    }
  }

  return {
    validUrls: Array.from(validSet),
    invalidEntries,
  };
}

/**
 * Extracts the base origin or root domain from a valid URL.
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}
