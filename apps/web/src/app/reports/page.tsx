import Link from "next/link";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { FileText, Download, Printer, ExternalLink, Zap } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const revalidate = 0;

export default async function ReportsPage() {
  const workspace = await getOrCreateDefaultWorkspace();

  const auditJobs = await prisma.auditJob.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      project: true,
      _count: {
        select: { executions: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-500" />
            Executive Reports & Client Exports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate presentation-ready, printable executive PDF/HTML audit reports and structured CSV datasets.
          </p>
        </div>

        <Link
          href="/audits/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
        >
          <Zap className="w-4 h-4" />
          Run New Audit
        </Link>
      </div>

      {auditJobs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">No Audits to Generate Reports From</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Once you execute an audit on any web property, SpeedPilot will automatically synthesize presentation-ready client reports here.
          </p>
          <Link
            href="/audits/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
          >
            <Zap className="w-3.5 h-3.5" />
            Start First Audit
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm divide-y divide-border">
          {auditJobs.map((job) => (
            <div
              key={job.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{job.project.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">({job.project.primaryDomain})</span>
                  <StatusBadge status={job.status} />
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{job._count.executions} audited execution(s)</span>
                  <span>•</span>
                  <span>Device: {job.deviceMode}</span>
                  <span>•</span>
                  <span>{new Date(job.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/v1/reports/export?jobId=${job.id}&format=HTML`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold hover:bg-secondary transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Printable Executive Report (PDF)
                </a>

                <a
                  href={`/api/v1/reports/export?jobId=${job.id}&format=CSV`}
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
      )}
    </div>
  );
}
