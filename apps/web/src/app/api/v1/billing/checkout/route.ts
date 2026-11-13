import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getOrCreateDefaultWorkspace } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const plan = body.planCode === "AGENCY" ? "AGENCY" : body.planCode === "STARTER" ? "STARTER" : "PRO";
    
    // Amount in paise (INR 499 for Starter, INR 2,900 for Pro, INR 7,900 for Agency)
    const amount = plan === "AGENCY" ? 790000 : plan === "STARTER" ? 49900 : 290000;

    const workspace = await getOrCreateDefaultWorkspace();

    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_${workspace.id}_${Date.now()}`.slice(0, 40),
      notes: {
        workspaceId: workspace.id,
        planCode: plan,
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
    });
  } catch (error: any) {
    console.error("[Razorpay Checkout] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
