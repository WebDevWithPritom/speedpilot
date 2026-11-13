import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  signAdminSession,
  verifyAdminKey,
} from "@/lib/admin-auth";

export const revalidate = 0;

function attachAdminCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
  });
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!verifyAdminKey(key)) {
    return NextResponse.redirect(new URL("/admin/users?error=invalid_key", req.url));
  }

  const token = await signAdminSession();
  const res = NextResponse.redirect(new URL("/admin/users", req.url));
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Cache-Control", "no-store, private, max-age=0");
  attachAdminCookie(res, token);
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = typeof body?.key === "string" ? body.key.trim() : "";

    if (!verifyAdminKey(key)) {
      return NextResponse.json(
        { success: false, error: "Invalid admin access key." },
        { status: 401 }
      );
    }

    const token = await signAdminSession();
    const res = NextResponse.json({ success: true });
    attachAdminCookie(res, token);
    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request payload." },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}
