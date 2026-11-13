import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@speedpilot/database";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.SESSION_SECRET || "speedpilot-dev-secret-change-in-production"
);

export const AUTH_COOKIE_NAME = "sp_auth_token";
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export interface AuthSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string;
  workspaceName: string;
  tier: "FREE" | "PRO" | "AGENCY";
}

/**
 * Signs a stateless, tamper-proof JWT token.
 * This can be verified in 0.2ms in memory on any request without querying MySQL.
 */
export async function signAuthToken(payload: AuthSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(JWT_SECRET);
}

/**
 * Verifies the JWT signature in-memory.
 * Zero database queries required.
 */
export async function verifyAuthToken(token: string): Promise<AuthSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current authenticated session from cookies in Next.js Server Components or Routes.
 */
export async function getCurrentUser(): Promise<AuthSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyAuthToken(token);
}

/**
 * Hash password with bcryptjs
 */
export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 10);
}

/**
 * Compare plain password against hash
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plain, hash);
}

/**
 * Ensures user has an active workspace and returns full session info.
 */
export async function getOrCreateUserWorkspace(user: { id: string; email: string; name?: string | null }) {
  // Check if user already has an owned or member workspace with minimal field projection
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          subscription: {
            select: {
              plan: {
                select: { code: true },
              },
            },
          },
        },
      },
    },
  });

  if (membership) {
    const planCode = membership.workspace.subscription?.plan?.code || "FREE";
    return {
      workspaceId: membership.workspace.id,
      workspaceName: membership.workspace.name,
      role: membership.role,
      tier: (planCode === "PRO" || planCode === "AGENCY" ? planCode : "FREE") as "FREE" | "PRO" | "AGENCY",
    };
  }

  // Create default workspace for new user
  const baseName = user.name || user.email.split("@")[0];
  const slug = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`;

  const workspace = await prisma.workspace.create({
    data: {
      name: `${baseName}'s Workspace`,
      slug,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    role: "OWNER",
    tier: "FREE" as const,
  };
}
