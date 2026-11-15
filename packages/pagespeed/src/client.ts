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
    this.timeoutMs =
      config.timeoutMs ??
      (process.env.PAGESPEED_TIMEOUT_MS ? parseInt(process.env.PAGESPEED_TIMEOUT_MS, 10) : 12_000);
  }

  /**
   * Runs a PageSpeed audit on a target URL for a given device against Google PSI API.
   * Throws PageSpeedAPIError on rate-limits, timeouts, or network failures.
   */
  async runAudit(url: string, device: SingleDevice): Promise<ParsedPageSpeedResult> {
    const activeApiKey = this.apiKey || process.env.GOOGLE_PAGESPEED_API_KEY;

    const strategy = device === "MOBILE" ? "mobile" : "desktop";
    const endpoint = new URL(this.baseUrl);

    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("strategy", strategy);

    endpoint.searchParams.append("category", "performance");
    endpoint.searchParams.append("category", "accessibility");
    endpoint.searchParams.append("category", "best-practices");
    endpoint.searchParams.append("category", "seo");
    // Note: Do NOT append "agentic-browsing" to Google PSI! Google only accepts standard Lighthouse categories.
    // SpeedPilot's proprietary Agentic Browsing Readiness score is evaluated deterministically in parser.ts.

    if (activeApiKey) {
      endpoint.searchParams.set("key", activeApiKey);
    }

    let attempts = 0;
    const maxAttempts = 2;
    let delay = 1500;

    while (attempts < maxAttempts) {
      attempts++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
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
          if (response.status === 503 && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }

          if (response.status === 429) {
            throw new PageSpeedAPIError(
              `Google PageSpeed Insights API rate limit reached (HTTP 429). Please add your Google API key in Settings or retry shortly.`,
              429
            );
          }

          let errDetail = "";
          try {
            const errData = await response.json();
            errDetail = errData?.error?.message ? `: ${errData.error.message}` : "";
          } catch { }

          if (response.status === 400) {
            throw new PageSpeedAPIError(
              `Google PageSpeed could not inspect '${url}'${errDetail || " (Invalid URL or unreachable target)"}.`,
              400
            );
          }

          throw new PageSpeedAPIError(
            `Google PageSpeed Insights returned HTTP ${response.status}${errDetail}. Target site may be blocking Google's crawler.`,
            response.status
          );
        }

        const rawData = await response.json();
        return parseGooglePSIResponse(rawData, url, device);
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof PageSpeedAPIError) throw err;

        if ((err as Error).name === "AbortError") {
          throw new PageSpeedAPIError(
            `Google PageSpeed audit for '${url}' timed out after ${this.timeoutMs}ms. Remote Lighthouse runner reached deadline.`,
            408
          );
        }

        if (attempts >= maxAttempts) {
          throw new PageSpeedAPIError(
            `Google PageSpeed Insights API request failed for '${url}': ${(err as Error).message}`,
            500
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    throw new PageSpeedAPIError(`Google PageSpeed audit failed for '${url}' after ${maxAttempts} attempts.`, 500);
  }
}
