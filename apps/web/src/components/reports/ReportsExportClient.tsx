"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface ReportJobRow {
  id: string;
  deviceMode: string;
  status: string;
  createdAt: string;
  project: {
    name: string;
    primaryDomain: string;
  };
  executionsCount: number;
}

export function ReportsExportClient({ jobs }: { jobs: ReportJobRow[] }) {
  const [companyName, setCompanyName] = useState("SpeedPilot Intelligence");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [reportFooter, setReportFooter] = useState("");

  useEffect(() => {
    const savedCompany = localStorage.getItem("sp_wl_company");
    const savedColor = localStorage.getItem("sp_wl_color");
    const savedFooter = localStorage.getItem("sp_wl_footer");
    if (savedCompany) setCompanyName(savedCompany);
    if (savedColor) setPrimaryColor(savedColor);
    if (savedFooter) setReportFooter(savedFooter);
  }, []);

  const updateField = (key: string, val: string, setter: (v: string) => void) => {
    setter(val);
    if (typeof window !== "undefined") localStorage.setItem(key, val);
  };

  const buildReportUrl = (jobId: string, format: "HTML" | "CSV") => {
    const params = new URLSearchParams({ jobId, format });
    if (format === "HTML") {
      if (companyName.trim()) params.set("companyName", companyName.trim());
      if (primaryColor) params.set("primaryColor", primaryColor);
      if (reportFooter.trim()) params.set("reportFooter", reportFooter.trim());
    }
    return `/api/v1/reports/export?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* White-Label Agency Branding Controls */}
      <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            White-Label Agency Report Branding
          </div>
          <span className="text-[11px] text-muted-foreground">Applied to Printable PDF / HTML exports</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Agency / Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => updateField("sp_wl_company", e.target.value, setCompanyName)}
              placeholder="e.g., WebDevWithPritom Agency"
              className="w-full px-3 py-1.5 rounded-md border border-border bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Brand Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => updateField("sp_wl_color", e.target.value, setPrimaryColor)}
                className="w-9 h-8 rounded border border-border bg-background cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => updateField("sp_wl_color", e.target.value, setPrimaryColor)}
                className="flex-1 px-3 py-1.5 rounded-md border border-border bg-background font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Custom Footer Note (Optional)</label>
            <input
              type="text"
              value={reportFooter}
              onChange={(e) => updateField("sp_wl_footer", e.target.value, setReportFooter)}
              placeholder="Prepared exclusively for client review"
              className="w-full px-3 py-1.5 rounded-md border border-border bg-background"
            />
          </div>
        </div>
      </div>

      {/* Audit Jobs Export List */}
      <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm divide-y divide-border">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-foreground">{job.project.name}</span>
                <span className="text-xs text-muted-foreground font-mono">({job.project.primaryDomain})</span>
                <StatusBadge status={job.status} />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{job.executionsCount} audited execution(s)</span>
                <span>•</span>
                <span>Device: {job.deviceMode}</span>
                <span>•</span>
                <span>{new Date(job.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={buildReportUrl(job.id, "HTML")}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold hover:bg-secondary transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Printable Executive Report (PDF)
              </a>

              <a
                href={buildReportUrl(job.id, "CSV")}
                download
                className="px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

