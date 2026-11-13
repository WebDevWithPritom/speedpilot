import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import {
  comparePassword,
  signAuthToken,
  getOrCreateUserWorkspace,
  AUTH_COOKIE_NAME,
} from "@/lib/auth";

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const targetEmail = (email || "").trim().toLowerCase();

    if (!targetEmail || !targetEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Please enter your password." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password. Please try again." },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password. Please try again." },
        { status: 401 }
      );
    }

    const wsInfo = await getOrCreateUserWorkspace(user);

    // Asynchronously log activity without blocking the user response
    prisma.activityLog
      .create({
        data: {
          userId: user.id,
          action: "USER_LOGIN",
          entityType: "User",
          entityId: user.id,
          metadata: { workspaceId: wsInfo.workspaceId },
        },
      })
      .catch((err) => console.error("[ActivityLog]", err));

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
    console.error("[Auth Login Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to log in" },
      { status: 500 }
    );
  }
}
