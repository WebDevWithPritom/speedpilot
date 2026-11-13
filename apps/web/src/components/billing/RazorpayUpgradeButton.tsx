"use client";

import React, { useState } from "react";
import { Zap, Loader2 } from "lucide-react";

interface UpgradeButtonProps {
  planCode: "PRO" | "AGENCY";
  label?: string;
  className?: string;
}

export function RazorpayUpgradeButton({
  planCode,
  label = "Upgrade with Razorpay",
  className = "w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition text-center flex items-center justify-center gap-1.5",
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert("Unable to load Razorpay checkout script. Please check your internet connection.");
        return;
      }

      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "SpeedPilot Performance Intelligence",
        description: `${planCode} Pass Subscription`,
        order_id: data.orderId,
        handler: function () {
          alert("Payment completed successfully! Your Pro features are now activated.");
          window.location.href = "/settings";
        },
        theme: {
          color: "#2563eb",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      alert(err.message || "Something went wrong initiating checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleUpgrade}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Opening Checkout...</span>
        </>
      ) : (
        <>
          <Zap className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
