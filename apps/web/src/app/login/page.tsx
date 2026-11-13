"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, Sparkles, AlertCircle, Loader2, ShieldCheck, Flame } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid credentials.");
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGuestDemo: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Demo login failed.");
      }
      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto shadow-sm">
          <Flame className="w-5 h-5 fill-current" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Sign in to SpeedPilot</h1>
        <p className="text-xs text-muted-foreground">
          Next-gen Core Web Vitals & Google PageSpeed Auditor
        </p>
      </div>

      {redirectPath !== "/" && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Sign in required to access {redirectPath}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1-Click Guest Pro Demo Button for Streamers & Devs */}
      <button
        type="button"
        onClick={handleGuestLogin}
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-semibold flex items-center justify-center gap-2 transition"
      >
        <Sparkles className="w-4 h-4 text-primary" />
        <span>1-Click Demo Login (Instant Pro Access)</span>
      </button>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-border w-full" />
        <span className="bg-card px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider absolute">
          Or with email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <input
              type="email"
              required
              placeholder="developer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Password</label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
        </button>
      </form>

      <div className="text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href={`/signup${redirectPath !== "/" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`} className="text-primary hover:underline font-semibold">
          Create one for free
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading authentication...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
