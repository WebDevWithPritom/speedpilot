import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { CreateProjectSchema, validateAndNormalizeUrl } from "@speedpilot/shared";
import { getOrCreateDefaultWorkspace } from "@/lib/db";

export async function GET() {
  try {
    const workspace = await getOrCreateDefaultWorkspace();
    const projects = await prisma.project.findMany({
      where: { workspaceId: workspace.id },
      include: {
        _count: {
          select: { urls: true, auditJobs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: projects });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspace = await getOrCreateDefaultWorkspace();
    const body = await req.json();
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, description, primaryDomain, techStack } = parsed.data;

    // Normalize domain
    const norm = validateAndNormalizeUrl(primaryDomain);
    const domainHost = norm.isValid && norm.normalizedUrl
      ? new URL(norm.normalizedUrl).hostname
      : primaryDomain.toLowerCase().replace(/^https?:\/\//, "");

    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name,
        description,
        primaryDomain: domainHost,
        techStack,
      },
    });

    // Also create initial domain record
    await prisma.domain.create({
      data: {
        projectId: project.id,
        hostname: domainHost,
        isPrimary: true,
      },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create project" },
      { status: 500 }
    );
  }
}

