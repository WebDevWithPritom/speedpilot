import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { Search, CheckCircle2, AlertTriangle, XCircle, Globe, ExternalLink } from "lucide-react";

export const revalidate = 0;

export default async function TechnicalSEOPage() {
  const workspace = await getOrCreateDefaultWorkspace();

  const seoResults = await prisma.sEOResult.findMany({
    where: {
      auditExecution: {
        auditJob: { workspaceId: workspace.id },
      },
    },
    take: 40,
    orderBy: { createdAt: "desc" },
    include: {
      auditExecution: {
        select: { url: true, device: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-purple-500" />
          Technical SEO Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Independent static HTML crawler results: titles, meta descriptions, canonical declarations, robots directives, and heading hierarchy.
        </p>
      </div>

      {seoResults.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
          <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">No Technical SEO Crawls Available</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            Run an audit on any website to perform static HTML analysis and extract SEO hygiene signals.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-medium">
                <tr>
                  <th className="py-3 px-4">Audited URL</th>
                  <th className="py-3 px-3">Title Length</th>
                  <th className="py-3 px-3">Meta Description</th>
                  <th className="py-3 px-3">Canonical</th>
                  <th className="py-3 px-3">Robots</th>
                  <th className="py-3 px-3">H1 Count</th>
                  <th className="py-3 px-3">Alt Missing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {seoResults.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 font-mono max-w-xs truncate" title={s.auditExecution.url}>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{s.auditExecution.url}</span>
                        <a
                          href={s.auditExecution.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {s.pageTitle ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {s.titleLength} chars
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Missing
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {s.metaDescription ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {s.descriptionLength} chars
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Missing
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {s.isCanonicalMatch ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      {s.robotsDirectives || "index, follow"}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {s.h1Count === 1 ? (
                        <span className="text-emerald-500 font-semibold">1 (Good)</span>
                      ) : (
                        <span className="text-amber-500 font-semibold">{s.h1Count} H1(s)</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {s.missingAltImagesCount === 0 ? (
                        <span className="text-emerald-500">0</span>
                      ) : (
                        <span className="text-rose-500 font-bold">{s.missingAltImagesCount} missing</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

