"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Sun, Moon, ShieldCheck, Zap, User, LogOut, Lock } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"LOGIN" | "SIGNUP">("LOGIN");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const fetchSession = () => {
    fetch("/api/v1/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setLoadingUser(false));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
    fetchSession();
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      setCurrentUser(null);
      window.location.reload();
    } catch {
      // ignore
    }
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            SSRF Guard Active
          </span>

          {currentUser && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {currentUser.workspaceName} ({currentUser.tier} Tier)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* User Profile / Login Button */}
          {!loadingUser && (
            <>
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-secondary border border-border text-xs">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                      {(currentUser.name || currentUser.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-foreground max-w-[120px] truncate">
                      {currentUser.name || currentUser.email}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-primary/15 text-primary">
                      {currentUser.tier}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Log out"
                    className="p-1.5 rounded-md border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAuthMode("LOGIN");
                      setAuthModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold hover:bg-secondary transition flex items-center gap-1.5 text-foreground"
                  >
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    <span>Sign In</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Quick Audit CTA */}
          <Link
            href="/audits/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            Run Bulk Audit
          </Link>
        </div>
      </header>

      {/* Auth Modal Dialog */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </>
  );
}
