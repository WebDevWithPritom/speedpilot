import { prisma } from "@speedpilot/database";
import type { AdminAuthLogRow, AdminUserRow } from "@/components/admin/AdminUsersClient";

export interface AdminUsersOverview {
  totalUsers: number;
  totalWorkspaces: number;
  totalAuditJobs: number;
  users: AdminUserRow[];
  recentAuthLogs: AdminAuthLogRow[];
}

/**
 * Fetches registered users, workspace counts, and recent sign-in/sign-up activity for the admin directory.
 */
export async function getAdminUsersOverview(): Promise<AdminUsersOverview> {
  const [users, totalWorkspaces, totalAuditJobs, recentAuthLogs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            role: true,
            workspace: {
              select: {
                name: true,
                subscription: {
                  select: {
                    plan: { select: { code: true } },
                  },
                },
                _count: {
                  select: {
                    projects: true,
                    auditJobs: true,
                  },
                },
              },
            },
          },
        },
        activityLogs: {
          where: { action: { in: ["USER_LOGIN", "USER_SIGNUP"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            action: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.workspace.count(),
    prisma.auditJob.count(),
    prisma.activityLog.findMany({
      where: { action: { in: ["USER_LOGIN", "USER_SIGNUP"] } },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        action: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const formattedUsers: AdminUserRow[] = users.map((u) => {
    const primaryMembership = u.memberships[0];
    const ws = primaryMembership?.workspace;
    return {
      id: u.id,
      email: u.email,
      name: u.name || u.email.split("@")[0],
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      role: primaryMembership?.role || "MEMBER",
      workspaceName: ws?.name || "—",
      tier: ws?.subscription?.plan?.code || "FREE",
      projectsCount: ws?._count.projects ?? 0,
      auditJobsCount: ws?._count.auditJobs ?? 0,
      lastAuthAction: u.activityLogs[0]?.action || null,
      lastAuthAt: u.activityLogs[0]?.createdAt.toISOString() || null,
    };
  });

  return {
    totalUsers: formattedUsers.length,
    totalWorkspaces,
    totalAuditJobs,
    users: formattedUsers,
    recentAuthLogs: recentAuthLogs.map((l) => ({
      id: l.id,
      action: l.action,
      createdAt: l.createdAt.toISOString(),
      email: l.user?.email || "Unknown",
      name: l.user?.name || null,
    })),
  };
}
