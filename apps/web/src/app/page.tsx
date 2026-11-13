import Link from "next/link";
import { prisma } from "@speedpilot/database";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { LandingPage } from "@/components/landing/LandingPage";
import { MetricBadge } from "@/components/ui/MetricBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  FolderKanban,
  Zap,
  Globe,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export const revalidate = 0; // Fresh real-time data

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <LandingPage />;
  }

  // Use the JWT session workspaceId directly to eliminate an extra sequential DB roundtrip
  const workspaceId = user.workspaceId || (await getOrCreateDefaultWorkspace()).id;

  const [projectCount, totalUrlsCount, recentJobs, allLighthouseScores] = await Promise.all([
    prisma.project.count({ where: { workspaceId } }),
    prisma.projectURL.count({ where: { project: { workspaceId } } }),
    prisma.auditJob.findMany({
      where: { workspaceId },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { name: true, primaryDomain: true } },
        executions: {
          take: 3,
          include: { lighthouse: true },
        },
      },
    }),
    prisma.lighthouseResult.findMany({
      take: 50,
      select: { performanceScore: true, seoScore: true, lcpMs: true, tbtMs: true, cls: true },
    }),
  ]);

  // Compute actual averages from genuine database records
  const hasAudits = allLighthouseScores.length > 0;
  const avgPerf = hasAudits
    ? Math.round(
        allLighthouseScores.reduce((acc, curr) => acc + curr.performanceScore, 0) /
          allLighthouseScores.length
      )
    : null;

  const avgSEO = hasAudits
    ? Math.round(
        allLighthouseScores.reduce((acc, curr) => acc + curr.seoScore, 0) /
          allLighthouseScores.length
      )
    : null;

  const avgLCP = hasAudits
    ? (
        allLighthouseScores.reduce((acc, curr) => acc + curr.lcpMs, 0) /
        allLighthouseScores.length /
        1000
      ).toFixed(2)
    : null;

  const avgCLS = hasAudits
    ? (
        allLighthouseScores.reduce((acc, curr) => acc + curr.cls, 0) /
        allLighthouseScores.length
      ).toFixed(3)
    : null;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Intelligence Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time Core Web Vitals telemetry, synthetic Lighthouse benchmarks, and AI optimizations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/audits/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
          >
            <Zap className="w-4 h-4" />
            New Audit
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Performance</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            {avgPerf != null ? (
              <span className="text-3xl font-extrabold tracking-tight font-mono">{avgPerf}</span>
            ) : (
              <span className="text-sm text-muted-foreground italic">No audits yet</span>
            )}
            {avgPerf != null && <MetricBadge score={avgPerf} size="sm" />}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Lighthouse synthetic lab score</p>
        </div>

        <div className="p-5 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Average SEO Health</span>
            <Globe className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            {avgSEO != null ? (
              <span className="text-3xl font-extrabold tracking-tight font-mono">{avgSEO}</span>
            ) : (
              <span className="text-sm text-muted-foreground italic">No audits yet</span>
            )}
            {avgSEO != null && <MetricBadge score={avgSEO} size="sm" />}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Technical SEO indexability</p>
        </div>

        <div className="p-5 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Monitored Projects</span>
            <FolderKanban className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight font-mono">{projectCount}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{totalUrlsCount} total distinct page URLs</p>
        </div>

        <div className="p-5 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">LCP (Lab Average)</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            {avgLCP != null ? (
              <span className="text-3xl font-extrabold tracking-tight font-mono">{avgLCP}s</span>
            ) : (
              <span className="text-sm text-muted-foreground italic">—</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Target: ≤ 2.5s for Good</p>
        </div>
      </div>

      {/* Core Web Vitals Standard Threshold Reference */}
      <div className="p-5 rounded-lg border border-border bg-card/60">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Official Google Core Web Vitals Guidance (2026 Thresholds)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded border border-border bg-secondary/30">
            <div className="font-semibold text-foreground flex justify-between">
              <span>Largest Contentful Paint (LCP)</span>
              <span className="text-emerald-500 font-mono">≤ 2.5s</span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Measures perceived loading speed. Marks point when main page content is downloaded.
            </p>
          </div>
          <div className="p-3 rounded border border-border bg-secondary/30">
            <div className="font-semibold text-foreground flex justify-between">
              <span>Interaction to Next Paint (INP)</span>
              <span className="text-emerald-500 font-mono">≤ 200ms</span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Measures real-user responsiveness to user clicks and taps (CrUX 75th percentile).
            </p>
          </div>
          <div className="p-3 rounded border border-border bg-secondary/30">
            <div className="font-semibold text-foreground flex justify-between">
              <span>Cumulative Layout Shift (CLS)</span>
              <span className="text-emerald-500 font-mono">≤ 0.1</span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Measures visual stability. Prevents annoying sudden layout jumps during rendering.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Audit Activity Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Audit Activity</h2>
          <Link href="/audits" className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
            View all audits <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          /* True Empty State */
          <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
            <div className="w-12 h-12 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm">No Audits Run Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              SpeedPilot is ready to audit your first website. Submit a single URL, batch paste URLs, upload a CSV, or discover an XML sitemap.
            </p>
            <Link
              href="/audits/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              Start Your First Audit
            </Link>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm divide-y divide-border">
            {recentJobs.map((job) => (
              <div key={job.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{job.project.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">({job.project.primaryDomain})</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {job.totalUrls} execution(s) • Mode: {job.deviceMode} • Source: {job.source.toLowerCase().replace("_", " ")}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {job.executions.map((ex) => (
                      <div key={ex.id} className="text-center" title={`${ex.device} Score`}>
                        <MetricBadge score={ex.lighthouse?.performanceScore} size="sm" />
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/audits/${job.id}`}
                    className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-secondary transition flex items-center gap-1"
                  >
                    View Results
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

