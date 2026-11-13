import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getAdminUsersOverview } from "@/lib/admin-users";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authorized = await isAdminAuthorized(req);
  if (!authorized) {
    return NextResponse.json(
      { error: "Admin authorization required", code: "ADMIN_AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const overview = await getAdminUsersOverview();
  return NextResponse.json(overview);
}
