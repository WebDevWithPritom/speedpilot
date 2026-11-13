import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const execution = await prisma.auditExecution.findUnique({
      where: { id },
      include: {
        auditJob: {
          select: {
            id: true,
            project: { select: { id: true, name: true, primaryDomain: true } },
          },
        },
        lighthouse: true,
        crux: true,
        seo: true,
        issues: {
          include: {
            recommendations: true,
          },
          orderBy: { severity: "desc" },
        },
      },
    });

    if (!execution) {
      return NextResponse.json({ error: "Audit execution not found" }, { status: 404 });
    }

    return NextResponse.json({ data: execution });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

