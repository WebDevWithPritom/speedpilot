import { redirect } from "next/navigation";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getAdminUsersOverview } from "@/lib/admin-users";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export const revalidate = 0;

interface AdminUsersPageProps {
  searchParams: Promise<{ key?: string; error?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams;

  // Exchange ?key=... via route handler so the httpOnly admin cookie is set and the key is stripped from the URL
  if (params.key) {
    redirect(`/api/v1/admin/auth?key=${encodeURIComponent(params.key)}`);
  }

  const authorized = await isAdminAuthorized();

  if (!authorized) {
    return (
      <AdminUsersClient
        authorized={false}
        initialError={params.error === "invalid_key"}
        users={[]}
        totalWorkspaces={0}
        totalAuditJobs={0}
        recentAuthLogs={[]}
      />
    );
  }

  const overview = await getAdminUsersOverview();

  return (
    <AdminUsersClient
      authorized={true}
      users={overview.users}
      totalWorkspaces={overview.totalWorkspaces}
      totalAuditJobs={overview.totalAuditJobs}
      recentAuthLogs={overview.recentAuthLogs}
    />
  );
}
