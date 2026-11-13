"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Lock,
  Search,
  RefreshCw,
  LogOut,
  ShieldCheck,
  FolderKanban,
  Zap,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  role: string;
  workspaceName: string;
  tier: string;
  projectsCount: number;
  auditJobsCount: number;
  lastAuthAction: string | null;
  lastAuthAt: string | null;
}

export interface AdminAuthLogRow {
  id: string;
  action: string;
  createdAt: string;
  email: string;
  name: string | null;
}

interface AdminUsersClientProps {
  authorized: boolean;
  initialError?: boolean;
  users: AdminUserRow[];
  totalWorkspaces: number;
  totalAuditJobs: number;
  recentAuthLogs: AdminAuthLogRow[];
}

export function AdminUsersClient({
  authorized,
  initialError = false,
  users,
  totalWorkspaces,
  totalAuditJobs,
  recentAuthLogs,
}: AdminUsersClientProps) {
  const router = useRouter();
  const [keyInput, setKeyInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(
    initialError ? "Invalid admin access key." : null
  );
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/v1/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid admin access key.");
      }
      window.location.assign("/admin/users");
    } catch (err: unknown) {
      setAuthError((err as Error).message);
      setAuthLoading(false);
    }
  };

  const handleLock = async () => {
    await fetch("/api/v1/admin/auth", { method: "DELETE" });
    window.location.assign("/admin/users");
  };

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 400);
  };

  if (!authorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Admin Access Required</h1>
            <p className="text-xs text-muted-foreground">
              Enter your SpeedPilot Admin Access Key to view registered users and sign-ins.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Admin Access Key</label>
              <input
                type="password"
                required
                placeholder="••••••••••••••••"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
            >
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock Admin View"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.workspaceName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Directory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Registered Users &amp; Sign-Ins</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live accounts, isolated workspaces, audit activity, and authentication events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-card text-xs font-semibold hover:bg-secondary transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleLock}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Lock Admin
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Signed Up Users</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-extrabold font-mono">{users.length}</div>
        </div>
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Workspaces</span>
            <FolderKanban className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3 text-3xl font-extrabold font-mono">{totalWorkspaces}</div>
        </div>
        <div className="p-5 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Audit Jobs</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3 text-3xl font-extrabold font-mono">{totalAuditJobs}</div>
        </div>
      </div>

      {/* Search & Users Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold">All Accounts ({filteredUsers.length})</h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, email, or workspace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Workspace</th>
                  <th className="px-4 py-3 font-semibold">Tier</th>
                  <th className="px-4 py-3 font-semibold text-right">Projects</th>
                  <th className="px-4 py-3 font-semibold text-right">Audits</th>
                  <th className="px-4 py-3 font-semibold">Last Sign-In / Event</th>
                  <th className="px-4 py-3 font-semibold">Signed Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        {u.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground whitespace-nowrap">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {u.workspaceName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/15 text-primary">
                          {u.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-right">{u.projectsCount}</td>
                      <td className="px-4 py-3 font-mono text-right">{u.auditJobsCount}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {u.lastAuthAt ? (
                          <span>
                            {u.lastAuthAction === "USER_LOGIN" ? "Sign-In" : "Sign-Up"} •{" "}
                            {new Date(u.lastAuthAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="italic">Signed up (pre-log)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Auth Events */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Recent Sign-In &amp; Sign-Up Log
        </h2>
        {recentAuthLogs.length === 0 ? (
          <div className="p-6 rounded-lg border border-dashed border-border bg-card/40 text-xs text-muted-foreground">
            New sign-ins and sign-ups from this deployment onward will appear here automatically.
          </div>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border bg-card">
            {recentAuthLogs.map((log) => (
              <div
                key={log.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      log.action === "USER_LOGIN"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {log.action === "USER_LOGIN" ? "SIGN IN" : "SIGN UP"}
                  </span>
                  <span className="font-semibold text-foreground">{log.name || log.email}</span>
                  <span className="font-mono text-muted-foreground">({log.email})</span>
                </div>
                <span className="text-muted-foreground font-mono">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
