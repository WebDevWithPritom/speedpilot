import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import {
  hashPassword,
  signAuthToken,
  getOrCreateUserWorkspace,
  AUTH_COOKIE_NAME,
} from "@/lib/auth";

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: (name || "").trim() || cleanEmail.split("@")[0],
        passwordHash,
      },
    });

    const wsInfo = await getOrCreateUserWorkspace(user);

    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name || user.email.split("@")[0],
      role: wsInfo.role,
      workspaceId: wsInfo.workspaceId,
      workspaceName: wsInfo.workspaceName,
      tier: wsInfo.tier,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: wsInfo.role,
        workspaceId: wsInfo.workspaceId,
        workspaceName: wsInfo.workspaceName,
        tier: wsInfo.tier,
      },
    });

    // Set secure, HTTP-only stateless JWT cookie (14 days)
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[Auth Signup Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
