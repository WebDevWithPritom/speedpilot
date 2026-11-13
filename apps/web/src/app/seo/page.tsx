import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SEOClient } from "./SEOClient";

export const revalidate = 0;

export default async function TechnicalSEOPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.workspaceId || (await getOrCreateDefaultWorkspace()).id;

  const rawResults = await prisma.sEOResult.findMany({
    where: {
      auditExecution: {
        auditJob: { workspaceId },
      },
    },
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      auditExecution: {
        select: { url: true, device: true },
      },
    },
  });

  const initialResults = rawResults.map((s) => ({
    id: s.id,
    url: s.auditExecution.url,
    device: s.auditExecution.device,
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
    missingAltImagesCount: s.missingAltImagesCount,
    hasOpenGraph: s.hasOpenGraph,
    hasStructuredData: s.hasStructuredData,
    createdAt: s.createdAt.toISOString(),
  }));

  return <SEOClient initialResults={initialResults} />;
}
