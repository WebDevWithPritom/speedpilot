import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@speedpilot/database";
import { getOrCreateDefaultWorkspace } from "@/lib/db";
import { validateAndNormalizeUrl } from "@speedpilot/shared";
import crypto from "crypto";

export const revalidate = 0;

function computeNextRunAt(frequency: string, fromDate = new Date()): Date {
  const next = new Date(fromDate);
  if (frequency === "DAILY") next.setDate(next.getDate() + 1);
  else if (frequency === "MONTHLY") next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  return next;
}

async function resolveWorkspaceId(req: NextRequest): Promise<string> {
  const headerWs = req.headers.get("x-workspace-id");
  if (headerWs) return headerWs;
  const ws = await getOrCreateDefaultWorkspace();
  return ws.id;
}

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(req);

    const [schedules, projects, webhooks] = await Promise.all([
      prisma.schedule.findMany({
        where: { project: { workspaceId } },
        orderBy: { createdAt: "desc" },
        include: { project: { select: { id: true, name: true, primaryDomain: true } } },
      }),
      prisma.project.findMany({
        where: { workspaceId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, primaryDomain: true },
      }),
      prisma.webhook.findMany({
        where: { workspaceId, isActive: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, url: true, events: true, isActive: true },
      }),
    ]);

    return NextResponse.json({ schedules, projects, webhooks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load monitoring schedules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const body = await req.json();
    const { projectId, frequency = "WEEKLY", deviceMode = "BOTH", webhookUrl } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const validFreq = ["DAILY", "WEEKLY", "MONTHLY"].includes(frequency) ? frequency : "WEEKLY";
    const validDevice = ["MOBILE", "DESKTOP", "BOTH"].includes(deviceMode) ? deviceMode : "BOTH";

    const schedule = await prisma.schedule.create({
      data: {
        projectId: project.id,
        frequency: validFreq,
        deviceMode: validDevice,
        isActive: true,
        nextRunAt: computeNextRunAt(validFreq),
      },
      include: { project: { select: { id: true, name: true, primaryDomain: true } } },
    });

    if (webhookUrl && typeof webhookUrl === "string" && webhookUrl.trim()) {
      const urlCheck = validateAndNormalizeUrl(webhookUrl.trim());
      if (!urlCheck.isValid || !urlCheck.normalizedUrl) {
        return NextResponse.json({ error: `Invalid webhook URL: ${urlCheck.error || "blocked"}` }, { status: 400 });
      }
      await prisma.webhook.create({
        data: {
          workspaceId,
          url: urlCheck.normalizedUrl,
          secret: crypto.randomBytes(16).toString("hex"),
          events: ["AUDIT_COMPLETED", "CWV_REGRESSION"],
          isActive: true,
        },
      });
    }

    return NextResponse.json({ success: true, schedule }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create schedule" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const body = await req.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: "Schedule id is required" }, { status: 400 });
    }

    const existing = await prisma.schedule.findFirst({
      where: { id, project: { workspaceId } },
      include: { project: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (action === "RUN_NOW") {
      const now = new Date();
      await prisma.schedule.update({
        where: { id: existing.id },
        data: {
          lastRunAt: now,
          nextRunAt: computeNextRunAt(existing.frequency, now),
        },
      });

      const targetUrl = existing.project.primaryDomain.startsWith("http")
        ? existing.project.primaryDomain
        : `https://${existing.project.primaryDomain}`;

      const forwardHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
        authorization: req.headers.get("authorization") || "",
      };
      for (const h of ["x-custom-google-key", "x-custom-ai-key", "x-custom-ai-provider", "x-custom-ai-model", "x-custom-ai-base-url"]) {
        const val = req.headers.get(h);
        if (val) forwardHeaders[h] = val;
      }

      const origin = req.nextUrl.origin;
      const auditRes = await fetch(`${origin}/api/v1/audits`, {
        method: "POST",
        headers: forwardHeaders,
        body: JSON.stringify({
          projectId: existing.projectId,
          deviceMode: existing.deviceMode,
          urls: [targetUrl],
        }),
      });
      const auditJson = await auditRes.json();
      if (!auditRes.ok) {
        return NextResponse.json({ error: auditJson.error || "Failed to trigger scheduled audit" }, { status: auditRes.status });
      }

      // Fire active webhooks asynchronously (best-effort notification)
      const activeHooks = await prisma.webhook.findMany({
        where: { workspaceId, isActive: true },
      });
      if (activeHooks.length > 0) {
        Promise.allSettled(
          activeHooks.map((hook) =>
            fetch(hook.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "SCHEDULED_AUDIT_STARTED",
                project: existing.project.name,
                domain: existing.project.primaryDomain,
                jobId: auditJson.jobId,
                timestamp: now.toISOString(),
              }),
            })
          )
        ).catch(() => {});
      }

      return NextResponse.json({ success: true, jobId: auditJson.jobId });
    }

    const updated = await prisma.schedule.update({
      where: { id: existing.id },
      data: { isActive: !existing.isActive },
      include: { project: { select: { id: true, name: true, primaryDomain: true } } },
    });
    return NextResponse.json({ success: true, schedule: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update schedule" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.schedule.findFirst({
      where: { id, project: { workspaceId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    await prisma.schedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete schedule" }, { status: 500 });
  }
}
