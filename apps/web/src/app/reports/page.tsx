import Link from "next/link";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { FileText, Zap } from "lucide-react";
import { ReportsExportClient } from "@/components/reports/ReportsExportClient";

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
        <ReportsExportClient
          jobs={auditJobs.map((job) => ({
            id: job.id,
            deviceMode: job.deviceMode,
            status: job.status,
            createdAt: job.createdAt.toISOString(),
            project: {
              name: job.project.name,
              primaryDomain: job.project.primaryDomain,
            },
            executionsCount: job._count.executions,
          }))}
        />
      )}
    </div>
  );
}
