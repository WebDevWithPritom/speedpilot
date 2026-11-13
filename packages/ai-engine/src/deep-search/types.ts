import { TechStack, NormalizedAuditIssue } from "@speedpilot/shared";
import { AIProvider } from "../providers.js";

export type DeepSearchPersona = "DEVELOPER" | "MARKETER" | "AGENCY" | "SAAS_TEAM";

export interface DeepSearchRequest {
  targetUrl: string;
  techStack: TechStack;
  issue: NormalizedAuditIssue;
  persona?: DeepSearchPersona | "ALL";
  apiKey?: string;
  provider?: AIProvider;
  baseUrl?: string;
  model?: string;
}

export interface DeveloperDeepSearchResult {
  persona: "DEVELOPER";
  detectedStack: TechStack;
  rootCauseAnalysis: string;
  offendingResource?: string;
  remediationDiff: string;
  bundlerConfigPatch?: string;
  cliVerificationCommand: string;
  recommendedPackages?: string[];
  estimatedDevMinutes: number;
}

export interface MarketerDeepSearchResult {
  persona: "MARKETER";
  serpRankRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  projectedBounceRateDelta: string; // e.g. "-12.4% mobile bounce probability"
  estimatedConversionUplift: string; // e.g. "+3.2% checkout completion"
  plainEnglishSummary: string;
  executiveBulletPoints: string[];
  competitorGapNotice: string;
}

export interface AgencyDeepSearchResult {
  persona: "AGENCY";
  clientPitchNarrative: string;
  projectedScoreLift: string; // e.g. "+15 to +22 points"
  workBreakdownStructure: Array<{
    task: string;
    estimatedHours: number;
    priority: "QUICK_WIN" | "HIGH_IMPACT" | "ARCHITECTURAL";
  }>;
  totalEstimatedHours: number;
  clientDeliverableSummary: string;
  riskIfIgnored: string;
}

export interface SaaSTeamDeepSearchResult {
  persona: "SAAS_TEAM";
  slaBreachRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  performanceBudgetRule: {
    metric: string;
    targetThreshold: string;
    enforcementAction: "WARN" | "BLOCK_PR" | "FAIL_BUILD";
  };
  ciConfigSnippet: string; // e.g. lighthouserc.json or GitHub Actions step
  sprintTicket: {
    title: string;
    description: string;
    acceptanceCriteria: string[];
  };
  syntheticVsRumNote: string;
}

export interface MultiPersonaDeepSearchResult {
  signature: string;
  targetUrl: string;
  techStack: TechStack;
  issueCode: string;
  developer?: DeveloperDeepSearchResult;
  marketer?: MarketerDeepSearchResult;
  agency?: AgencyDeepSearchResult;
  saasTeam?: SaaSTeamDeepSearchResult;
  source: "AI_GENERATED" | "DETERMINISTIC_SEARCH_ENGINE";
  executionMs: number;
}
