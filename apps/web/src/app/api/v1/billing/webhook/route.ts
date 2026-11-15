import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@speedpilot/database";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured on the server.");
      return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === "payment.captured" || event === "order.paid") {
      const payment = payload.payload?.payment?.entity;
      const notes = payment?.notes || payload.payload?.order?.entity?.notes;
      const workspaceId = notes?.workspaceId;
      const planCode = notes?.planCode || "PRO";

      if (workspaceId) {
        // Ensure plan exists
        let plan = await prisma.plan.findUnique({
          where: { code: planCode },
        });

        if (!plan) {
          plan = await prisma.plan.create({
            data: {
              name: planCode === "AGENCY" ? "Agency Pass" : "Pro Pass",
              code: planCode,
              maxAuditsPerMonth: planCode === "AGENCY" ? 10000 : 2500,
              maxConcurrentJobs: planCode === "AGENCY" ? 10 : 4,
              maxUrlsPerProject: planCode === "AGENCY" ? 1000 : 300,
              hasScheduledAudits: true,
            },
          });
        }

        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const existingSub = await prisma.subscription.findUnique({
          where: { workspaceId },
        });

        // Deduplicate: If subscription was already extended for this plan within the last 12 hours, ignore duplicate event
        const isRecentRenewal =
          existingSub &&
          existingSub.status === "ACTIVE" &&
          existingSub.planId === plan.id &&
          existingSub.currentPeriodStart &&
          now.getTime() - new Date(existingSub.currentPeriodStart).getTime() < 12 * 60 * 60 * 1000;

        if (!isRecentRenewal) {
          await prisma.subscription.upsert({
            where: { workspaceId },
            create: {
              workspaceId,
              planId: plan.id,
              status: "ACTIVE",
              currentPeriodStart: now,
              currentPeriodEnd: nextMonth,
            },
            update: {
              planId: plan.id,
              status: "ACTIVE",
              currentPeriodStart: now,
              currentPeriodEnd: nextMonth,
            },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Razorpay Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
