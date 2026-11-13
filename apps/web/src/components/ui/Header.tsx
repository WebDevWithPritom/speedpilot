"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Sun, Moon, ShieldCheck, Zap, User, LogOut, Lock, Code2, TrendingUp, Briefcase, Users, ChevronDown, Check } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { usePersona, Persona, PERSONA_CONFIGS } from "@/lib/persona";

export function Header({ initialUser }: { initialUser?: any }) {
  const [isDark, setIsDark] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"LOGIN" | "SIGNUP">("LOGIN");
  const [currentUser, setCurrentUser] = useState<any>(initialUser || null);
  const [loadingUser, setLoadingUser] = useState(initialUser === undefined);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const personaRef = useRef<HTMLDivElement>(null);

  const { persona, setPersona, personaConfig } = usePersona();

  const renderPersonaIcon = (p: Persona, className = "w-3.5 h-3.5") => {
    switch (p) {
      case "DEVELOPER":
        return <Code2 className={className} />;
      case "MARKETER":
        return <TrendingUp className={className} />;
      case "AGENCY":
        return <Briefcase className={className} />;
      case "SAAS_TEAM":
        return <Users className={className} />;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) {
        setPersonaDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      const savedTheme = localStorage.getItem("sp_theme");
      if (savedTheme === "dark") {
        setIsDark(true);
        document.documentElement.classList.add("dark");
      } else {
        setIsDark(false);
        document.documentElement.classList.remove("dark");
      }
    }
    if (!initialUser) {
      fetchSession();
    }
  }, [initialUser]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sp_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("sp_theme", "light");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      setCurrentUser(null);
      window.location.assign("/login");
    } catch {
      // ignore
    }
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>SSRF Guard Active</span>
          </span>

          {currentUser && (
            <span
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap max-w-[240px] truncate"
              title={`${currentUser.workspaceName} (${currentUser.tier} Tier)`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="truncate">{currentUser.workspaceName}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* User Profile / Login Button */}
          {!loadingUser && (
            <>
              {currentUser ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-secondary border border-border text-xs whitespace-nowrap">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                      {(currentUser.name || currentUser.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-foreground max-w-[110px] truncate hidden sm:inline">
                      {currentUser.name || currentUser.email}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-primary/15 text-primary shrink-0">
                      {currentUser.tier}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Log out"
                    className="p-1.5 rounded-md border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setAuthMode("LOGIN");
                      setAuthModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold hover:bg-secondary transition flex items-center gap-1.5 text-foreground whitespace-nowrap"
                  >
                    <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Sign In</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Global Audience / Persona Lens Switcher */}
          <div className="relative shrink-0" ref={personaRef}>
            <button
              type="button"
              onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition whitespace-nowrap ${
                personaConfig.badgeColor
              } hover:opacity-95 shadow-sm`}
              title="Switch presentation lens for different audiences"
            >
              {renderPersonaIcon(persona, "w-3.5 h-3.5 shrink-0")}
              <span className="hidden lg:inline font-medium opacity-80">Lens:</span>
              <span className="font-semibold">{personaConfig.shortLabel}</span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${personaDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {personaDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Audience Persona</span>
                  <span className="text-[9px] lowercase font-normal opacity-70">user choice</span>
                </div>
                <div className="p-1 space-y-0.5">
                  {(Object.keys(PERSONA_CONFIGS) as Persona[]).map((pKey) => {
                    const cfg = PERSONA_CONFIGS[pKey];
                    const isSelected = persona === pKey;
                    return (
                      <button
                        key={pKey}
                        onClick={() => {
                          setPersona(pKey);
                          setPersonaDropdownOpen(false);
                        }}
                        className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition ${
                          isSelected
                            ? "bg-secondary text-foreground font-medium"
                            : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${cfg.badgeColor}`}>
                          {renderPersonaIcon(pKey, "w-3.5 h-3.5")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground text-xs">{cfg.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                            {cfg.tagline}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Quick Audit CTA */}
          <Link
            href="/audits/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm whitespace-nowrap shrink-0"
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Run Bulk Audit</span>
            <span className="sm:hidden">Audit</span>
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
