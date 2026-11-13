import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "speedpilot-super-secure-production-jwt-token-secret-2026"
);

const AUTH_COOKIE_NAME = "sp_auth_token";

// Routes that do NOT require authentication
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/api/v1/auth",
  "/api/v1/health",
  "/_next",
  "/favicon.ico",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public routes without any check
  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Extract auth token from cookie or Authorization Bearer header
  let token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  // Verify JWT if token is present
  let authPayload: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      authPayload = payload;
    } catch {
      // Invalid or expired token
      authPayload = null;
    }
  }

  // 2. If user is authenticated and tries to visit /login or /signup, redirect to dashboard
  if (authPayload && (pathname === "/login" || pathname === "/signup")) {
    const redirectUrl = req.nextUrl.searchParams.get("redirect") || "/";
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // If public route, proceed
  if (isPublic) {
    return NextResponse.next();
  }

  // 3. Unauthenticated request to a protected route
  if (!authPayload) {
    // If it's an API route, return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
          message: "Please sign in or provide a valid Bearer token to access this endpoint.",
        },
        { status: 401 }
      );
    }

    // Otherwise, redirect to login page with return URL
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Authenticated request: forward user & tier metadata in request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", authPayload.userId || "");
  requestHeaders.set("x-user-email", authPayload.email || "");
  requestHeaders.set("x-user-name", authPayload.name || "");
  requestHeaders.set("x-user-role", authPayload.role || "OWNER");
  requestHeaders.set("x-user-tier", authPayload.tier || "FREE");
  requestHeaders.set("x-workspace-id", authPayload.workspaceId || "");
  requestHeaders.set("x-workspace-name", authPayload.workspaceName || "");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (e.g. .svg, .png, .jpg)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
