"use client";

import React, { useState } from "react";
import {
  X,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
  initialMode?: "LOGIN" | "SIGNUP";
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = "LOGIN" }: AuthModalProps) {
  const [mode, setMode] = useState<"LOGIN" | "SIGNUP">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === "LOGIN" ? "/api/v1/auth/login" : "/api/v1/auth/signup";
      const payload = mode === "LOGIN" ? { email, password } : { email, password, name };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed. Please try again.");
      }

      if (onSuccess) onSuccess(data.user);
      onClose();
      window.location.reload();
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
        throw new Error(data.error || "Guest login failed.");
      }
      if (onSuccess) onSuccess(data.user);
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 bg-card border border-border rounded-xl shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 text-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {mode === "LOGIN" ? "Welcome Back to SpeedPilot" : "Create Your SpeedPilot Account"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {mode === "LOGIN"
              ? "Sign in to access your audit jobs, bulk crawlers, and AI fixes."
              : "Get started with free audits, WebMCP agentic checks, and BYOK settings."}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-secondary p-1 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("LOGIN");
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition ${
              mode === "LOGIN" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("SIGNUP");
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition ${
              mode === "SIGNUP" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Quick 1-Click Guest / Creator Login */}
        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={loading}
          className="w-full py-2 px-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-semibold text-primary transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>1-Click Instant Creator Login (Stream-Safe Pro)</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full"></div>
          <span className="bg-card px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Or with email
          </span>
          <div className="border-t border-border w-full"></div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "SIGNUP" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Full Name</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Pritom"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <User className="w-4 h-4 absolute left-3 text-muted-foreground" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Email Address</label>
            <div className="relative flex items-center">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Mail className="w-4 h-4 absolute left-3 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Password</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              <Lock className="w-4 h-4 absolute left-3 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "LOGIN" ? (
              <span>Sign In</span>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Stateless JWT Auth • High-Concurrency Architecture</span>
        </div>
      </div>
    </div>
  );
}
