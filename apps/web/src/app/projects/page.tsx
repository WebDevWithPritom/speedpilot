import Link from "next/link";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { FolderKanban, Plus, Globe, Zap, ArrowRight, Layers } from "lucide-react";
import { MetricBadge } from "@/components/ui/MetricBadge";

export const revalidate = 0;

export default async function ProjectsPage() {
  const workspace = await getOrCreateDefaultWorkspace();

  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { urls: true, auditJobs: true },
      },
      auditJobs: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          executions: {
            take: 1,
            include: { lighthouse: true },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize multi-site portfolios, client properties, and tracked domain groups.
          </p>
        </div>

        <Link
          href="/audits/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Project & Audit
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
          <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">No Projects Created</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Projects group your web properties, domains, and historical audit benchmark reports.
          </p>
          <Link
            href="/audits/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
          >
            <Zap className="w-3.5 h-3.5" />
            Add First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const latestExec = p.auditJobs[0]?.executions[0];
            const latestScore = latestExec?.lighthouse?.performanceScore;

            return (
              <div
                key={p.id}
                className="p-5 rounded-lg border border-border bg-card shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{p.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono mt-0.5">
                        <Globe className="w-3.5 h-3.5" />
                        {p.primaryDomain}
                      </div>
                    </div>
                    {latestScore != null && <MetricBadge score={latestScore} size="sm" />}
                  </div>

                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-mono text-[11px]">
                      {p.techStack}
                    </span>
                    <span>•</span>
                    <span>{p._count.urls} tracked URLs</span>
                    <span>•</span>
                    <span>{p._count.auditJobs} job(s)</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                  <Link
                    href={`/audits/new`}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    Run Audit <ArrowRight className="w-3 h-3" />
                  </Link>

                  <span className="text-[11px] text-muted-foreground">
                    Created {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
