export type DeviceMode = "MOBILE" | "DESKTOP" | "BOTH";
export type SingleDevice = "MOBILE" | "DESKTOP";

export type MetricCategory = "GOOD" | "NEEDS_IMPROVEMENT" | "POOR";

export type AuditJobStatus = 
  | "PENDING"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL_FAILURE"
  | "FAILED"
  | "CANCELLED";

export type AuditExecutionStatus =
  | "QUEUED"
  | "FETCHING"
  | "AUDITING"
  | "ANALYZING_AI"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type TechStack = 
  | "WORDPRESS"
  | "WOOCOMMERCE"
  | "SHOPIFY"
  | "NEXTJS"
  | "REACT"
  | "LARAVEL"
  | "CUSTOM"
  | "UNKNOWN";

export type IssueSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AudienceMode = "MARKETER" | "DEVELOPER" | "AGENCY" | "SAAS_TEAM";

export interface LighthouseScorecard {
  performance: number; // 0 - 100
  accessibility: number;
  bestPractices: number;
  seo: number;
  agenticBrowsing?: number | null; // 0 - 100 (Google Agentic Browsing & WebMCP Readiness)
  agenticRatio?: string | null; // e.g. "1/2" or "2/2"
}

export interface LighthouseLabMetrics {
  fcpMs: number;
  lcpMs: number;
  tbtMs: number;
  cls: number;
  speedIndexMs: number;
}

export interface CrUXFieldData {
  scope: "URL" | "ORIGIN" | "UNAVAILABLE";
  lcpValueMs: number | null;
  lcpCategory: MetricCategory | null;
  inpValueMs: number | null;
  inpCategory: MetricCategory | null;
  clsValue: number | null;
  clsCategory: MetricCategory | null;
  collectionPeriod: string | null;
}

export interface SEOResultData {
  httpStatus: number;
  isHttps: boolean;
  pageTitle: string | null;
  titleLength: number | null;
  metaDescription: string | null;
  descriptionLength: number | null;
  canonicalUrl: string | null;
  isCanonicalMatch: boolean;
  robotsDirectives: string | null;
  h1Count: number;
  h1Text: string | null;
  hasBrokenInternalLinks: boolean;
  brokenLinksCount: number;
  missingAltImagesCount: number;
  hasOpenGraph: boolean;
  hasStructuredData: boolean;

  // Screaming Frog crawl & hygiene telemetry
  internalLinksCount?: number;
  externalLinksCount?: number;
  nofollowLinksCount?: number;
  h2Count?: number;
  h3Count?: number;
  wordCount?: number;
  readingTimeMin?: number;
  isIndexable?: boolean;
  indexabilityReason?: string;
  totalImagesCount?: number;

  // Semrush On-Page SEO & SERP simulator
  semrushScore?: number;
  topKeywords?: Array<{
    word: string;
    count: number;
    densityPercent: number;
    inTitle: boolean;
    inH1: boolean;
  }>;
  serpSnippetPreview?: {
    pixelWidthEstimate: number;
    isTitleTruncated: boolean;
    previewUrlDisplay: string;
    snippet: string;
  };

  // Ahrefs site health & schema telemetry
  ahrefsHealthScore?: number;
  schemaTypes?: string[];
  openGraphData?: {
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImage?: string | null;
    twitterCard?: string | null;
  };
}

export interface NormalizedAuditIssue {
  code: string;
  title: string;
  category: "PERFORMANCE" | "ACCESSIBILITY" | "BEST_PRACTICES" | "SEO" | "TECHNICAL_SEO";
  severity: IssueSeverity;
  displayValue?: string;
  score?: number;
  evidenceItems: Array<{
    url?: string;
    wastedMs?: number;
    wastedBytes?: number;
    description?: string;
    selector?: string;
    snippet?: string;
    nodeLabel?: string;
  }>;
}

export interface AIRecommendationOutput {
  detectedStack: TechStack;
  explanationMarketer: string;
  explanationDeveloper: string;
  explanationAgency: string;
  explanationSaaSTeam: string;
  remediationCodeSnippet?: string;
  implementationSteps: string[];
  verificationSteps: string[];
  estimatedDifficulty: "EASY" | "MEDIUM" | "HARD";
  estimatedImpact: "LOW" | "MEDIUM" | "HIGH";
}

