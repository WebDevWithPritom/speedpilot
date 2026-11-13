import Link from "next/link";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { History, Zap, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricBadge } from "@/components/ui/MetricBadge";

export const revalidate = 0;

export default async function AuditsHistoryPage() {
  const workspace = await getOrCreateDefaultWorkspace();

  const jobs = await prisma.auditJob.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { name: true, primaryDomain: true } },
      executions: {
        take: 3,
        include: { lighthouse: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit History & Benchmark Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historical audit execution runs, batch progress logs, and benchmark snapshots.
          </p>
        </div>

        <Link
          href="/audits/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
        >
          <Zap className="w-4 h-4" />
          New Audit
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
          <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">No Audit History Recorded</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Completed audits and historical benchmark logs will appear here.
          </p>
          <Link
            href="/audits/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
          >
            <Zap className="w-3.5 h-3.5" />
            Launch Audit
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm divide-y divide-border">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-foreground">{job.project.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">({job.project.primaryDomain})</span>
                  <StatusBadge status={job.status} />
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{job.totalUrls} execution(s)</span>
                  <span>•</span>
                  <span>Device: {job.deviceMode}</span>
                  <span>•</span>
                  <span>Source: {job.source.toLowerCase().replace("_", " ")}</span>
                  <span>•</span>
                  <span>{new Date(job.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  {job.executions.map((e) => (
                    <MetricBadge key={e.id} score={e.lighthouse?.performanceScore} size="sm" />
                  ))}
                </div>

                <Link
                  href={`/audits/${job.id}`}
                  className="px-3.5 py-1.5 rounded-md border border-border text-xs font-semibold hover:bg-secondary transition flex items-center gap-1"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

