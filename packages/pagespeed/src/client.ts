import { SingleDevice } from "@speedpilot/shared";
import { GooglePSIConfig, ParsedPageSpeedResult } from "./types.js";
import { parseGooglePSIResponse } from "./parser.js";

export class PageSpeedAPIError extends Error {
  constructor(message: string, public readonly status?: number, public readonly details?: unknown) {
    super(message);
    this.name = "PageSpeedAPIError";
  }
}

export class PageSpeedClient {
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly baseUrl = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

  constructor(config: GooglePSIConfig = {}) {
    this.apiKey = config.apiKey || process.env.GOOGLE_PAGESPEED_API_KEY;
    this.timeoutMs = config.timeoutMs ?? 60_000; // PSI audits can take 15-45s
  }

  /**
   * Runs a genuine Google PageSpeed Insights audit on a target URL for a given device.
   */
  async runAudit(url: string, device: SingleDevice): Promise<ParsedPageSpeedResult> {
    const strategy = device === "MOBILE" ? "mobile" : "desktop";
    const endpoint = new URL(this.baseUrl);

    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("strategy", strategy);

    // Request all 4 standard categories
    endpoint.searchParams.append("category", "performance");
    endpoint.searchParams.append("category", "accessibility");
    endpoint.searchParams.append("category", "best-practices");
    endpoint.searchParams.append("category", "seo");

    if (this.apiKey) {
      endpoint.searchParams.set("key", this.apiKey);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let attempts = 0;
    const maxAttempts = 3;
    let delay = 2000;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await fetch(endpoint.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          let parsedError: unknown = errorBody;
          try {
            parsedError = JSON.parse(errorBody);
          } catch {
            // keep raw text
          }

          // Handle 429 Too Many Requests or 503 Backend Error with exponential backoff
          if ((response.status === 429 || response.status === 503) && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }

          throw new PageSpeedAPIError(
            `Google PageSpeed Insights API returned HTTP ${response.status}: ${response.statusText}`,
            response.status,
            parsedError
          );
        }

        const rawData = await response.json();
        return parseGooglePSIResponse(rawData, url, device);
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof PageSpeedAPIError) throw err;
        if ((err as Error).name === "AbortError") {
          throw new PageSpeedAPIError(`PageSpeed audit for '${url}' timed out after ${this.timeoutMs}ms.`, 408);
        }
        if (attempts >= maxAttempts) {
          throw new PageSpeedAPIError(`PageSpeed audit failed: ${(err as Error).message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    throw new PageSpeedAPIError(`Failed to audit '${url}' after ${maxAttempts} attempts.`);
  }
}
