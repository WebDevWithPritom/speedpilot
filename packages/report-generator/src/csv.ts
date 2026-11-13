import { AuditReportData } from "./types.js";

/**
 * Escapes a cell value for standard CSV compatibility (RFC 4180).
 */
function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC 4180-compliant CSV string from audit report data.
 */
export function generateAuditCSV(report: AuditReportData): string {
  const headers = [
    "Project Name",
    "URL",
    "Device",
    "Status",
    "Performance Score",
    "Accessibility Score",
    "Best Practices Score",
    "SEO Score",
    "LCP Lab (ms)",
    "TBT Lab (ms)",
    "CLS Lab",
    "Speed Index (ms)",
    "CrUX INP (ms)",
    "CrUX LCP (ms)",
    "CrUX Scope",
    "Page Title",
    "H1 Count",
    "Missing Alt Images",
    "Issue Count",
  ];

  const rows: string[] = [headers.map(escapeCSV).join(",")];

  for (const ex of report.executions) {
    const row = [
      report.projectName,
      ex.url,
      ex.device,
      ex.status,
      ex.scores?.performance ?? "",
      ex.scores?.accessibility ?? "",
      ex.scores?.bestPractices ?? "",
      ex.scores?.seo ?? "",
      ex.labMetrics?.lcpMs ?? "",
      ex.labMetrics?.tbtMs ?? "",
      ex.labMetrics?.cls ?? "",
      ex.labMetrics?.speedIndexMs ?? "",
      ex.crux?.inpValueMs ?? "",
      ex.crux?.lcpValueMs ?? "",
      ex.crux?.scope ?? "",
      ex.seo?.pageTitle ?? "",
      ex.seo?.h1Count ?? "",
      ex.seo?.missingAltImagesCount ?? "",
      ex.issues?.length ?? 0,
    ];

    rows.push(row.map(escapeCSV).join(","));
  }

  return rows.join("\r\n");
}

