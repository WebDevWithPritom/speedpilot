import {
  LighthouseScorecard,
  LighthouseLabMetrics,
  CrUXFieldData,
  NormalizedAuditIssue,
  SingleDevice,
} from "@speedpilot/shared";

export interface ParsedPageSpeedResult {
  url: string;
  device: SingleDevice;
  scores: LighthouseScorecard;
  labMetrics: LighthouseLabMetrics;
  cruxFieldData: CrUXFieldData;
  issues: NormalizedAuditIssue[];
  rawExecutionTimeMs: number;
}

export interface GooglePSIConfig {
  apiKey?: string;
  timeoutMs?: number;
}
