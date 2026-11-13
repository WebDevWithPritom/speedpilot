import { prisma } from "@speedpilot/database";

/**
 * Ensures a default workspace exists for the user session and returns it.
 */
export async function getOrCreateDefaultWorkspace() {
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

