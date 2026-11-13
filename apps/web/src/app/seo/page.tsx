import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SEOClient, type ProjectOption, type HistoricalSEOItem } from "./SEOClient";

export const revalidate = 0;

export default async function TechnicalSEOPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.workspaceId || (await getOrCreateDefaultWorkspace()).id;

  const [projectsRaw, rawResults] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        primaryDomain: true,
        techStack: true,
        _count: {
          select: {
            auditJobs: true,
            urls: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.sEOResult.findMany({
      where: {
        auditExecution: {
          auditJob: { workspaceId },
        },
      },
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        auditExecution: {
          select: {
            url: true,
            device: true,
            auditJob: {
              select: {
                id: true,
                projectId: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                    primaryDomain: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const projects: ProjectOption[] = projectsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    primaryDomain: p.primaryDomain,
    techStack: p.techStack,
    auditJobsCount: p._count.auditJobs,
    urlsCount: p._count.urls,
  }));

  const initialResults: HistoricalSEOItem[] = rawResults.map((s) => ({
    id: s.id,
    url: s.auditExecution.url,
    device: s.auditExecution.device,
    projectId: s.auditExecution.auditJob?.projectId || s.auditExecution.auditJob?.project?.id || null,
    projectName: s.auditExecution.auditJob?.project?.name || "General / Unassigned",
    primaryDomain: s.auditExecution.auditJob?.project?.primaryDomain || "",
    httpStatus: s.httpStatus,
    isHttps: s.isHttps,
    pageTitle: s.pageTitle,
    titleLength: s.titleLength,
    metaDescription: s.metaDescription,
    descriptionLength: s.descriptionLength,
    canonicalUrl: s.canonicalUrl,
    isCanonicalMatch: s.isCanonicalMatch,
    robotsDirectives: s.robotsDirectives,
    h1Count: s.h1Count,
    h1Text: s.h1Text,
    hasBrokenInternalLinks: s.hasBrokenInternalLinks,
    brokenLinksCount: s.brokenLinksCount,
    missingAltImagesCount: s.missingAltImagesCount,
    hasOpenGraph: s.hasOpenGraph,
    hasStructuredData: s.hasStructuredData,
    createdAt: s.createdAt.toISOString(),
  }));

  return <SEOClient projects={projects} initialResults={initialResults} />;
}
