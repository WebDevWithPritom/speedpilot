import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { Sparkles, Code2, Users, Briefcase, Layers, AlertCircle } from "lucide-react";

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
            select: { url: true, device: true },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          AI Fix Assistant Explorer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Framework-tailored remediation advice, code diffs, and audience perspectives generated from real audit evidence.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
          <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">No AI Recommendations Generated Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            Run an audit on any web page. SpeedPilot will automatically distill failing diagnostic opportunities and synthesize actionable fix instructions.
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
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{issue?.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary text-foreground">
                        {rec.detectedStack}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {issue?.severity}
                      </span>
                    </div>
                    {execution && (
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        URL: {execution.url} ({execution.device})
                      </p>
                    )}
                  </div>

                  <div className="text-xs font-mono text-muted-foreground">
                    Impact: {rec.estimatedImpact} • Difficulty: {rec.estimatedDifficulty}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded bg-secondary/30 border border-border space-y-1">
                    <div className="font-semibold text-[11px] text-muted-foreground uppercase flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5 text-blue-500" /> Developer Mode
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{rec.explanationDeveloper}</p>
                  </div>

                  <div className="p-3.5 rounded bg-secondary/30 border border-border space-y-1">
                    <div className="font-semibold text-[11px] text-muted-foreground uppercase flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-500" /> Marketer Mode
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{rec.explanationMarketer}</p>
                  </div>
                </div>

                {rec.remediationCodeSnippet && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Code Remediation Diff
                    </div>
                    <pre className="p-3.5 rounded-md bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                      <code>{rec.remediationCodeSnippet}</code>
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
