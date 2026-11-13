import Link from "next/link";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { Sparkles, Code2, Users, Briefcase, Layers, ExternalLink } from "lucide-react";
import { DeepSearchExplorer } from "@/components/ai/DeepSearchExplorer";
import { CodeDiffViewer } from "@/components/remediation/CodeDiffViewer";

export const revalidate = 0;

export default async function AIAssistantExplorerPage() {
  const workspace = await getOrCreateDefaultWorkspace();

  const recommendations = await prisma.aIRecommendation.findMany({
    where: {
      auditIssue: {
        auditExecution: {
          auditJob: { workspaceId: workspace.id },
        },
      },
    },
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      auditIssue: {
        include: {
          auditExecution: {
            select: { id: true, url: true, device: true },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      {/* Interactive Multi-Persona Deep Search Simulator */}
      <DeepSearchExplorer />

      {/* Historical Stored Audit Recommendations */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Audit Issue Remediation Feed
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Historical recommendations synthesized during background crawl and bulk audit executions.
          </p>
        </div>

        {recommendations.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card/40">
            <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-semibold text-xs">No Stored Background Recommendations Yet</h3>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto mt-1">
              Trigger a bulk URL audit to populate background recommendations, or test the Deep Search Explorer above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => {
              const issue = rec.auditIssue;
              const execution = issue?.auditExecution;

              return (
                <div
                  key={rec.id}
                  className="p-5 rounded-lg border border-border bg-card shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{issue?.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary text-foreground">
                          {rec.detectedStack}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                            issue?.severity === "CRITICAL" || issue?.severity === "HIGH"
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}
                        >
                          {issue?.severity}
                        </span>
                      </div>
                      {execution && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-1">
                          <span>URL: {execution.url} ({execution.device})</span>
                          <Link
                            href={`/audits/executions/${execution.id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-sans text-[11px]"
                          >
                            Deep Dive <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-mono text-muted-foreground">
                      Impact: {rec.estimatedImpact} • Difficulty: {rec.estimatedDifficulty}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded bg-blue-500/5 border border-blue-500/20 space-y-1">
                      <div className="font-semibold text-[11px] text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5" /> Developer Solution
                      </div>
                      <p className="text-foreground/85 leading-relaxed">{rec.explanationDeveloper}</p>
                    </div>

                    <div className="p-3.5 rounded bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                      <div className="font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Marketer Solution
                      </div>
                      <p className="text-foreground/85 leading-relaxed">{rec.explanationMarketer}</p>
                    </div>

                    <div className="p-3.5 rounded bg-purple-500/5 border border-purple-500/20 space-y-1">
                      <div className="font-semibold text-[11px] text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" /> Agency Deliverable
                      </div>
                      <p className="text-foreground/85 leading-relaxed">{rec.explanationAgency}</p>
                    </div>

                    <div className="p-3.5 rounded bg-amber-500/5 border border-amber-500/20 space-y-1">
                      <div className="font-semibold text-[11px] text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> SaaS Team Operations
                      </div>
                      <p className="text-foreground/85 leading-relaxed">{rec.explanationSaaSTeam}</p>
                    </div>
                  </div>

                  {rec.remediationCodeSnippet && (
                    <CodeDiffViewer
                      issueTitle={issue?.title || "Performance Remediation"}
                      issueKey={rec.id}
                      detectedStack={rec.detectedStack || "CUSTOM"}
                      rawSnippet={rec.remediationCodeSnippet}
                      url={execution?.url || "https://example.com"}
                      evidenceUrl={Array.isArray(issue?.evidenceDetails) ? (issue.evidenceDetails as any[])[0]?.url : undefined}
                      potentialSavings={issue?.displayValue || undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
