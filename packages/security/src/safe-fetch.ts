import { validateHostAgainstSSRF, SecurityError } from "./ssrf.js";

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxRedirects?: number;
  maxResponseSizeBytes?: number;
}

export interface SafeFetchResponse {
  url: string;
  status: number;
  statusText: string;
  headers: Headers;
  text: () => Promise<string>;
  json: <T = unknown>() => Promise<T>;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Executes a secure HTTP/HTTPS fetch with SSRF mitigation, DNS verification,
 * redirect protection, timeout enforcement, and response size limits.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBytes = options.maxResponseSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;

  let currentUrl = rawUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new SecurityError(`Invalid URL string: '${currentUrl}'.`, "INVALID_URL");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new SecurityError(`Protocol '${parsed.protocol}' is not allowed. Only HTTP and HTTPS are permitted.`, "FORBIDDEN_PROTOCOL");
    }

    // SSRF Check: Validate host and its resolved DNS addresses
    await validateHostAgainstSSRF(parsed.hostname);

    // Prepare AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        ...options,
        redirect: "manual", // Handle redirects manually to enforce SSRF validation at every hop
        signal: controller.signal,
        headers: {
          "User-Agent": "SpeedPilot-Auditor/1.0 (+https://speedpilot.dev)",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Handle 3xx Redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new SecurityError(`Redirect status ${response.status} returned without Location header.`, "MISSING_LOCATION");
        }

        // Resolve relative redirects against current URL
        const redirectUrl = new URL(location, currentUrl).toString();
        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new SecurityError(`Too many redirects (exceeded limit of ${maxRedirects}).`, "MAX_REDIRECTS_EXCEEDED");
        }

        currentUrl = redirectUrl;
        continue; // Next hop
      }

      // Check Content-Length header if present
      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader) {
        const len = parseInt(contentLengthHeader, 10);
        if (!isNaN(len) && len > maxBytes) {
          throw new SecurityError(`Response size (${len} bytes) exceeds limit of ${maxBytes} bytes.`, "PAYLOAD_TOO_LARGE");
        }
      }

      // Stream body with byte limit
      const reader = response.body?.getReader();
      if (!reader) {
        return {
          url: currentUrl,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          text: async () => "",
          json: async <T>() => ({}) as T,
        };
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > maxBytes) {
            reader.cancel();
            throw new SecurityError(`Streamed response exceeded limit of ${maxBytes} bytes.`, "PAYLOAD_TOO_LARGE");
          }
          chunks.push(value);
        }
      }

      // Combine chunks into single Buffer / Uint8Array
      const totalBuffer = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder("utf-8");
      const bodyText = decoder.decode(totalBuffer);

      return {
        url: currentUrl,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        text: async () => bodyText,
        json: async <T>() => JSON.parse(bodyText) as T,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof SecurityError) throw err;
      if ((err as Error).name === "AbortError") {
        throw new SecurityError(`Request to '${currentUrl}' timed out after ${timeoutMs}ms.`, "REQUEST_TIMEOUT");
      }
      throw err;
    }
  }

  throw new SecurityError(`Too many redirects.`, "MAX_REDIRECTS_EXCEEDED");
}

