"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Flame, Github, Star } from "lucide-react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Header } from "@/components/ui/Header";

interface AppShellProps {
  isAuthenticated: boolean;
  initialUser?: any;
  children: React.ReactNode;
}

export function AppShell({ isAuthenticated, initialUser, children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPublicMarketing = pathname === "/features" || pathname === "/pricing";
  const isAdminPage = pathname.startsWith("/admin");
  const isPublicLanding = pathname === "/" && !isAuthenticated;

  if (isAuthPage || isPublicMarketing || isAdminPage) {
    return (
      <div className="flex-1 flex flex-col min-h-screen w-full bg-background">
        <div className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-sm tracking-tight">SpeedPilot</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/features" className="text-muted-foreground hover:text-foreground transition hidden sm:inline">
              Features
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition hidden sm:inline">
              Pricing
            </Link>
            <a
              href="https://github.com/WebDevWithPritom/speedpilot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card hover:bg-secondary transition text-muted-foreground hover:text-foreground"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GitHub</span>
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
        <main className={isAuthPage ? "flex-1 flex items-center justify-center p-4 md:p-8" : "flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full"}>
          {children}
        </main>
      </div>
    );
  }

  if (isPublicLanding) {
    return <div className="flex-1 flex flex-col min-h-screen w-full">{children}</div>;
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header initialUser={initialUser} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </>
  );
}
