import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.SESSION_SECRET || "speedpilot-dev-secret-change-in-production"
);

export const ADMIN_COOKIE_NAME = "sp_admin_session";

export function verifyAdminKey(candidate: string | null | undefined): boolean {
  const configured = process.env.ADMIN_ACCESS_KEY;
  if (!configured || !candidate) return false;
  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(configured, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function signAdminSession(): Promise<string> {
  return await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(JWT_SECRET);
}

export async function verifyAdminSession(token: string | undefined): Promise<boolean> {
  if (!token || !process.env.ADMIN_ACCESS_KEY) return false;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.admin === true;
  } catch {
    return false;
  }
}

export async function isAdminAuthorized(req?: NextRequest): Promise<boolean> {
  if (!process.env.ADMIN_ACCESS_KEY) return false;

  if (req) {
    const headerKey = req.headers.get("x-admin-key");
    if (verifyAdminKey(headerKey)) return true;
    const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    return await verifyAdminSession(cookieToken);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return await verifyAdminSession(token);
}
