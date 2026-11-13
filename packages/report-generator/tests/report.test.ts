import { describe, it, expect } from "vitest";
import { generateAuditCSV, generateExecutiveHTMLReport, AuditReportData } from "../src/index.js";

describe("Report Generator", () => {
  const mockReport: AuditReportData = {
    reportTitle: "Executive Speed Audit",
    projectName: "Test Project",
    primaryDomain: "example.com",
    createdAt: new Date().toISOString(),
    filterDevice: "ALL",
    executions: [
      {
        id: "exec-1",
        url: "https://example.com",
        device: "MOBILE",
        status: "COMPLETED",
        scores: {
          performance: 92,
          accessibility: 95,
          bestPractices: 90,
          seo: 96,
        },
        labMetrics: {
          lcpMs: 1400,
          fcpMs: 800,
          tbtMs: 40,
          cls: 0.02,
          speedIndexMs: 1200,
        },
        cruxMetrics: undefined,
        seoData: {
          title: "Test Page",
          h1Count: 1,
          missingAltCount: 0,
        },
        issues: [],
      },
    ],
  };

  it("should generate CSV report string with headers", () => {
    const csv = generateAuditCSV(mockReport);
    expect(csv).toContain("Project Name,URL,Device,Status");
    expect(csv).toContain("https://example.com");
    expect(csv).toContain("92");
  });

  it("should generate client executive HTML report", () => {
    const html = generateExecutiveHTMLReport(mockReport);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Executive Speed Audit");
    expect(html).toContain("92");
  });
});
