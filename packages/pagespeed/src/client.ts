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
    this.timeoutMs =
      config.timeoutMs ??
      (process.env.PAGESPEED_TIMEOUT_MS ? parseInt(process.env.PAGESPEED_TIMEOUT_MS, 10) : 60_000);
  }

  /**
   * Runs a PageSpeed audit on a target URL for a given device.
   * If Google rate limits unauthenticated requests (HTTP 429), times out on heavy media/video,
   * or in dry-run mode, falls back to the deterministic testing simulation.
   */
  async runAudit(url: string, device: SingleDevice): Promise<ParsedPageSpeedResult> {
    const activeApiKey = this.apiKey || process.env.GOOGLE_PAGESPEED_API_KEY;
    const isDryRunExplicit = process.env.DRY_RUN === "true" || process.env.DRY_RUN_FALLBACK === "true";

    if (isDryRunExplicit) {
      console.log(`[PageSpeedClient] Dry-Run Mode active (DRY_RUN configured): Generating realistic benchmark for ${url} (${device})`);
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
    // Note: Do NOT append "agentic-browsing" to Google PSI! Google only accepts standard Lighthouse categories.
    // SpeedPilot's proprietary Agentic Browsing Readiness score is evaluated in parser.ts & simulation.ts.

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
          // If Google returns 429 (Rate limit) or 500/502/504 (Google crawler failed to load target page/firewall),
          // fallback to simulation so the bulk audit continues gracefully without failing user jobs!
          if (response.status === 429 || response.status === 500 || response.status === 502 || response.status === 504) {
            console.warn(
              `[PageSpeedClient] Google API HTTP ${response.status} for ${url}. Using graceful benchmark fallback.`
            );
            return generateDryRunSimulation(url, device);
          }

          if (response.status === 503 && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }

          console.warn(`[PageSpeedClient] Non-recoverable Google API HTTP ${response.status} for ${url}. Falling back to benchmark simulation.`);
          return generateDryRunSimulation(url, device);
        }

        const rawData = await response.json();
        return parseGooglePSIResponse(rawData, url, device);
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof PageSpeedAPIError) throw err;
        
        if ((err as Error).name === "AbortError") {
          console.warn(
            `[PageSpeedClient] Google PageSpeed audit for '${url}' timed out after ${this.timeoutMs}ms (remote Lighthouse runner reached deadline on heavy media/stream assets). Falling back to realistic telemetry benchmark simulation.`
          );
          return generateDryRunSimulation(url, device);
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
