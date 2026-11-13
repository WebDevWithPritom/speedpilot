import { prisma } from "@speedpilot/database";

export async function getWorkspaceTier(workspaceId: string): Promise<"FREE" | "PRO" | "AGENCY"> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    if (subscription && subscription.status === "ACTIVE") {
      const planCode = subscription.plan.code.toUpperCase();
      if (planCode === "PRO" || planCode === "AGENCY") {
        return planCode as "PRO" | "AGENCY";
      }
    }
  } catch (error) {
    console.error("[Subscription] Failed to fetch tier:", error);
  }

  return "FREE";
}
