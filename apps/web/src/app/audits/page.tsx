import Link from "next/link";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { Zap } from "lucide-react";
import { AuditsListClient } from "./AuditsListClient";

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

      <AuditsListClient initialJobs={jobs} />
    </div>
  );
}


