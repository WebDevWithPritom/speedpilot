"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Zap,
  History,
  Search,
  Sparkles,
  Activity,
  Layers,
  FileText,
  Settings,
  Flame,
} from "lucide-react";

const navigationItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Bulk Auditor", href: "/audits/new", icon: Zap },
  { name: "Audits & History", href: "/audits", icon: History },
  { name: "SEO Intelligence", href: "/seo", icon: Search },
  { name: "AI Fix Assistant", href: "/ai-assistant", icon: Sparkles },
  { name: "Monitoring", href: "/monitoring", icon: Activity },
  { name: "Comparisons", href: "/comparisons", icon: Layers },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Developer API & Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card/60 backdrop-blur-md flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
          <Flame className="w-4 h-4 fill-current" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight block">SpeedPilot</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block">
            Intelligence v1.0
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Workspace Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Workspace</span>
          <span className="px-1.5 py-0.5 rounded bg-secondary font-mono font-medium text-foreground">
            Default
          </span>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground/80">
          Engine: PSI + CrUX + AI
        </div>
      </div>
    </aside>
  );
}
