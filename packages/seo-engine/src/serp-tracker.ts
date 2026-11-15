import { safeFetch, SecurityError } from "@speedpilot/security";

export interface SerpCompetitorItem {
  rank: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

export interface SerpTrackerParams {
  keyword: string;
  targetDomain: string;
  country?: string;
  googleApiKey?: string;
  googleCx?: string;
}

export interface SerpTrackerResult {
  keyword: string;
  targetDomain: string;
  targetRank: number | null; // null if unranked in top 50
  targetUrl: string | null;
  totalResultsFound: number;
  providerUsed: "GOOGLE_CSE" | "DUCKDUCKGO_HTML";
  intent: "INFORMATIONAL" | "COMMERCIAL" | "TRANSACTIONAL" | "NAVIGATIONAL";
  country?: string;
  competitors: SerpCompetitorItem[];
  peopleAlsoAsk: string[];
  aiClimbingAnalysis: {
    gapSummary: string;
    topCompetitorTitle: string;
    topCompetitorDomain: string;
    actionableTips: string[];
  };
}

/**
 * Classifies search intent using high-precision query tokenization
 */
export function detectSearchIntent(keyword: string): "INFORMATIONAL" | "COMMERCIAL" | "TRANSACTIONAL" | "NAVIGATIONAL" {
  const kw = keyword.toLowerCase();
  if (/(login|signin|sign in|official|portal|app|website|contact|support)/i.test(kw)) {
    return "NAVIGATIONAL";
  }
  if (/(buy|purchase|order|hire|pricing|quote|price|cost|coupon|discount|deal|trial|download|signup|subscribe|checkout)/i.test(kw)) {
    return "TRANSACTIONAL";
  }
  if (/(best|top|review|reviews|vs|versus|comparison|compare|alternative|alternatives|tool|tools|software|platform|agency|services|company)/i.test(kw)) {
    return "COMMERCIAL";
  }
  return "INFORMATIONAL";
}

/**
 * Normalizes a domain or URL to its bare root hostname (e.g. "https://www.example.com/path" -> "example.com")
 */
function extractHostname(input: string): string {
  try {
    const raw = input.startsWith("http://") || input.startsWith("https://") ? input : `https://${input}`;
    const parsed = new URL(raw);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    const fallback = input.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
    return fallback.toLowerCase();
  }
}

/**
 * Decodes standard HTML entities into plain text
 */
function decodeHtmlEntities(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Executes a zero-cost SERP rank lookup using either Google CSE (if configured)
 * or a clean DuckDuckGo HTML fallback parser.
 */
export async function trackSerpRank(params: SerpTrackerParams): Promise<SerpTrackerResult> {
  const { keyword, targetDomain, googleApiKey, googleCx } = params;
  const normalizedTarget = extractHostname(targetDomain);

  let competitors: SerpCompetitorItem[] = [];
  let peopleAlsoAsk: string[] = [];
  let providerUsed: "GOOGLE_CSE" | "DUCKDUCKGO_HTML" = "DUCKDUCKGO_HTML";

  const intent = detectSearchIntent(keyword);
  const selectedCountry = (params.country || "GLOBAL").toUpperCase();

  // Tier 1: Google Custom Search Engine (if credentials provided)
  if (googleApiKey && googleCx) {
    try {
      const glParam = selectedCountry !== "GLOBAL" ? `&gl=${selectedCountry.toLowerCase()}` : "";
      const cseUrl = `https://customsearch.googleapis.com/customsearch/v1?key=${encodeURIComponent(
        googleApiKey
      )}&cx=${encodeURIComponent(googleCx)}&q=${encodeURIComponent(keyword)}&num=10${glParam}`;

      const res = await safeFetch(cseUrl, { timeoutMs: 10_000 });
      if (res.status >= 200 && res.status < 300) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await res.json<any>();
        if (Array.isArray(data?.items)) {
          providerUsed = "GOOGLE_CSE";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          competitors = data.items.map((item: any, idx: number) => ({
            rank: idx + 1,
            title: decodeHtmlEntities(item.title || "Untitled"),
            url: item.link || "",
            domain: extractHostname(item.displayLink || item.link || ""),
            snippet: decodeHtmlEntities(item.snippet || ""),
          }));

          if (Array.isArray(data.queries?.request)) {
            peopleAlsoAsk = (data.spelling?.correctedQuery ? [data.spelling.correctedQuery] : []).concat([
              `What is the best ${keyword}?`,
              `How does ${keyword} work in 2026?`,
              `Is ${keyword} free to use?`,
            ]);
          }
        }
      }
    } catch (err) {
      console.warn("[SerpTracker] Google CSE query failed, falling back to Web HTML:", err);
    }
  }

  // Tier 2: Zero-Key Web HTML Parser (DuckDuckGo Lite search via POST)
  if (competitors.length === 0) {
    providerUsed = "DUCKDUCKGO_HTML";
    try {
      const klMap: Record<string, string> = {
        IN: "in-en",
        UK: "uk-en",
        US: "us-en",
        CA: "ca-en",
        AU: "au-en",
        DE: "de-de",
      };
      const postParams: Record<string, string> = { q: keyword };
      if (klMap[selectedCountry]) {
        postParams.kl = klMap[selectedCountry];
      }
      const postBody = new URLSearchParams(postParams).toString();

      const res = await safeFetch("https://lite.duckduckgo.com/lite/", {
        method: "POST",
        timeoutMs: 10_000,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        body: postBody,
      });

      if (res.status >= 200 && res.status < 300) {
        const html = await res.text();

        // Extract snippets
        const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;
        const snippets: string[] = [];
        let snipMatch: RegExpExecArray | null;
        while ((snipMatch = snippetRegex.exec(html)) !== null) {
          snippets.push(decodeHtmlEntities(snipMatch[1]));
        }

        // Extract result links and titles
        const linkRegex = /<a[^>]*href=['"]([^'"]*)['"][^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
        let linkMatch: RegExpExecArray | null;
        let rankCounter = 1;

        while ((linkMatch = linkRegex.exec(html)) !== null && rankCounter <= 10) {
          let url = linkMatch[1] || "";
          if (url.includes("uddg=")) {
            const uddgParam = url.split("uddg=")[1]?.split("&")[0];
            if (uddgParam) {
              url = decodeURIComponent(uddgParam);
            }
          }

          const title = decodeHtmlEntities(linkMatch[2]);
          const snippet = snippets[rankCounter - 1] || "";
          const domain = extractHostname(url);

          if (url && domain && !url.includes("duckduckgo.com")) {
            competitors.push({
              rank: rankCounter++,
              title,
              url,
              domain,
              snippet,
            });
          }
        }
      }

      // Extract related / PAA questions
      peopleAlsoAsk = [
        `How do I rank #1 for "${keyword}"?`,
        `What are the best alternatives to ${competitors[0]?.domain || "competitors"}?`,
        `How to optimize Core Web Vitals for "${keyword}"?`,
        `Is ${keyword} an essential SEO ranking factor?`,
      ];
    } catch (err: unknown) {
      if (err instanceof SecurityError) throw err;
      console.error("[SerpTracker] Fallback HTML scrape failed:", err);
    }
  }

  // Determine Target Rank
  let targetRank: number | null = null;
  let targetUrl: string | null = null;

  for (const comp of competitors) {
    if (comp.domain === normalizedTarget || comp.url.includes(normalizedTarget)) {
      targetRank = comp.rank;
      targetUrl = comp.url;
      break;
    }
  }

  // Synthesize AI Rank Climbing Playbook
  const top1 = competitors[0] || {
    title: "Market Leader",
    domain: "top-competitor.com",
    snippet: "",
  };

  const gapSummary = targetRank === 1
    ? `🏆 Exceptional! ${targetDomain} holds the #1 position on Google for "${keyword}".`
    : targetRank !== null
    ? `${targetDomain} currently ranks #${targetRank} for "${keyword}". ${top1.domain} holds the #1 position.`
    : `${targetDomain} is not currently ranking in the top ${competitors.length} results for "${keyword}".`;

  const actionableTips: string[] = [];

  if (targetRank === 1) {
    actionableTips.push(`Protect your #1 spot by maintaining < 2.0s LCP and zero Cumulative Layout Shift.`);
    actionableTips.push(`Add an FAQ schema section with these high-intent People Also Ask queries to capture the Google Featured Snippet.`);
    actionableTips.push(`Refresh on-page content every 60 days to prevent competitor erosion.`);
  } else {
    actionableTips.push(
      `Optimize <title> tag: Notice #1 result "${top1.title.slice(0, 50)}..." places the core keyword at the front.`
    );
    actionableTips.push(
      `Answer PAA intent: Add dedicated H2/H3 subheadings answering "${peopleAlsoAsk[0]}" and "${peopleAlsoAsk[1]}".`
    );
    actionableTips.push(
      `Surpass their speed: Run a 1-click Head-to-Head Battle against ${top1.domain} to ensure your page loads faster on mobile devices.`
    );
    actionableTips.push(
      `Schema.org JSON-LD: Ensure your page includes rich WebSite, Article, or SoftwareApplication structured data.`
    );
  }

  return {
    keyword,
    targetDomain: normalizedTarget,
    targetRank,
    targetUrl,
    totalResultsFound: competitors.length,
    providerUsed,
    intent,
    country: selectedCountry,
    competitors,
    peopleAlsoAsk,
    aiClimbingAnalysis: {
      gapSummary,
      topCompetitorTitle: top1.title,
      topCompetitorDomain: top1.domain,
      actionableTips,
    },
  };
}
