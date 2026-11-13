"use client";

import React, { useState, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sp_sidebar_collapsed") === "1");
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sp_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // Ignore
      }
      return next;
    });
  };

  return (
    <aside
      className={`relative shrink-0 border-r border-border bg-card/60 backdrop-blur-md flex flex-col h-screen sticky top-0 select-none transition-all duration-200 ${
        collapsed ? "w-16" : "w-56 lg:w-64"
      }`}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-5 z-20 w-6 h-6 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center shadow-sm transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Brand Header */}
      <div
        className={`h-16 flex items-center border-b border-border ${
          collapsed ? "justify-center px-2" : "px-5 gap-2.5"
        }`}
      >
        <div className="w-8 h-8 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
          <Flame className="w-4 h-4 fill-current" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-bold text-sm tracking-tight block truncate">SpeedPilot</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block truncate">
              Intelligence v1.0
            </span>
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${collapsed ? "px-2" : "px-3"}`}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              aria-label={item.name}
              className={`flex items-center rounded-md text-sm font-medium transition-colors ${
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
              } ${
                isActive
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Workspace Footer */}
      {!collapsed && (
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
      )}
    </aside>
  );
}

