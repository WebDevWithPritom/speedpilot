import {
  LighthouseScorecard,
  LighthouseLabMetrics,
  CrUXFieldData,
  SEOResultData,
  AIRecommendationOutput,
  SingleDevice,
} from "@speedpilot/shared";

export interface WhiteLabelConfig {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  reportFooter?: string;
  hidePoweredBy?: boolean;
}

export interface ReportExecutionItem {
  id: string;
  url: string;
  device: SingleDevice;
  status: string;
  executionTimeMs?: number | null;
  scores?: LighthouseScorecard | null;
  labMetrics?: LighthouseLabMetrics | null;
  crux?: CrUXFieldData | null;
  seo?: SEOResultData | null;
  issues?: Array<{
    code: string;
    title: string;
    severity: string;
    displayValue?: string;
    recommendation?: AIRecommendationOutput;
  }>;
}

export interface AuditReportData {
  reportTitle: string;
  projectName: string;
  primaryDomain: string;
  createdAt: Date | string;
  deviceMode: string;
  whiteLabel?: WhiteLabelConfig;
  executions: ReportExecutionItem[];
}

