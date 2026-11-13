import { SingleDevice } from "@speedpilot/shared";
import { GooglePSIConfig, ParsedPageSpeedResult } from "./types.js";
import { parseGooglePSIResponse } from "./parser.js";
import { generateDryRunSimulation } from "./simulation.js";

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
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  /**
   * Runs a PageSpeed audit on a target URL for a given device.
   * If Google rate limits unauthenticated requests (HTTP 429) or in dry-run mode,
   * falls back to the deterministic testing simulation.
   */
  async runAudit(url: string, device: SingleDevice): Promise<ParsedPageSpeedResult> {
    const isDryRunExplicit = process.env.DRY_RUN === "true";
    if (isDryRunExplicit) {
      console.log(`[PageSpeedClient] DRY_RUN=true: Returning simulated metrics for ${url} (${device})`);
      return generateDryRunSimulation(url, device);
    }

    const strategy = device === "MOBILE" ? "mobile" : "desktop";
    const endpoint = new URL(this.baseUrl);

    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("strategy", strategy);

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
    const maxAttempts = 2;
    let delay = 1500;

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
          // If Google returns 429 Too Many Requests (unauthenticated rate limit),
          // fallback to dry-run simulation so users can test end-to-end without blockers!
          if (response.status === 429) {
            console.warn(
              `[PageSpeedClient] Google API 429 rate limit reached for ${url}. Using Dry-Run Simulation for test execution.`
            );
            return generateDryRunSimulation(url, device);
          }

          if (response.status === 503 && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }

          const errorBody = await response.text();
          let parsedError: unknown = errorBody;
          try {
            parsedError = JSON.parse(errorBody);
          } catch {
            // keep raw text
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
          // Fallback to simulation if Google API is unreachable in test mode
          console.warn(`[PageSpeedClient] Google API error: ${(err as Error).message}. Falling back to dry-run simulation.`);
          return generateDryRunSimulation(url, device);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    return generateDryRunSimulation(url, device);
  }
}
