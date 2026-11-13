import { safeFetch, SafeFetchOptions } from "@speedpilot/security";
import { inspectHtmlSEO, ParsedSEOInspection } from "./parser.js";
import { detectTechStack, TechDetectionResult } from "./tech-detector.js";

export interface CrawlInspectionResult {
  url: string;
  inspection: ParsedSEOInspection;
  techDetection: TechDetectionResult;
  httpStatus: number;
}

/**
 * Safely fetches a target URL through SSRF-guarded safeFetch and executes static SEO inspection.
 */
export async function crawlAndInspectSEO(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<CrawlInspectionResult> {
  const parsed = new URL(targetUrl);
  const isHttps = parsed.protocol === "https:";

  const response = await safeFetch(targetUrl, {
    ...options,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...options.headers,
    },
  });

  const html = await response.text();
  const inspection = inspectHtmlSEO(html, targetUrl, response.status, isHttps);
  const techDetection = detectTechStack(html, response.headers);

  return {
    url: targetUrl,
    inspection,
    techDetection,
    httpStatus: response.status,
  };
}

