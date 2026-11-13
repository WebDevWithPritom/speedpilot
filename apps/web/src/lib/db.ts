import { headers } from "next/headers";
import { prisma } from "@speedpilot/database";
import { getCurrentUser } from "./auth";

/**
 * Resolves the authenticated user's isolated workspace (from middleware header or session cookie),
 * falling back to the local default workspace only when no user session exists.
 */
export async function getOrCreateDefaultWorkspace() {
  try {
    const hdrs = await headers();
    const headerWsId = hdrs.get("x-workspace-id");
    const sessionWsId = headerWsId || (await getCurrentUser())?.workspaceId;
    if (sessionWsId) {
      const active = await prisma.workspace.findUnique({ where: { id: sessionWsId } });
      if (active) return active;
    }
  } catch {
    // Outside request context (e.g. scripts/tests), fall back to default workspace
  }

  let workspace = await prisma.workspace.findFirst({
    where: { slug: "default-workspace" },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "My Workspace",
        slug: "default-workspace",
      },
    });
  }

  return workspace;
}

