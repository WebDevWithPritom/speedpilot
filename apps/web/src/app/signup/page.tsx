"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, User, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Flame } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [name, setName] = useState("");
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
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create account.");
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
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-xs text-muted-foreground">
          Get started with SpeedPilot for automated PageSpeed auditing & AI fixes.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <input
              type="text"
              required
              placeholder="Alex Rivers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Work Email</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <input
              type="email"
              required
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
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
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Free Account"}
        </button>
      </form>

      <div className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login${redirectPath !== "/" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`} className="text-primary hover:underline font-semibold">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
