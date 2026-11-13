import { NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";

export const revalidate = 0;

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    return NextResponse.json(
      { status: "degraded", database: "error", error: (err as Error).message },
      { status: 503 }
    );
  }
}

