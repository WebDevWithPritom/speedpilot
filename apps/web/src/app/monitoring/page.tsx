"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Plus,
  Clock,
  Play,
  Trash2,
  Pause,
  Bell,
  CheckCircle2,
  RefreshCw,
  X,
  Globe,
} from "lucide-react";
import { getClientAIConfig } from "@/lib/ai-config";

export default function MonitoringPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Create form state
  const [modalOpen, setModalOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [deviceMode, setDeviceMode] = useState<"BOTH" | "MOBILE" | "DESKTOP">("BOTH");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMonitoring = async () => {
    try {
      const res = await fetch("/api/v1/schedules");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load monitoring");
      setSchedules(data.schedules || []);
      setProjects(data.projects || []);
      setWebhooks(data.webhooks || []);
      if (data.projects?.length > 0 && !projectId) {
        setProjectId(data.projects[0].id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
  }, []);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          frequency,
          deviceMode,
          webhookUrl: webhookUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create schedule");
      setModalOpen(false);
      setWebhookUrl("");
      await fetchMonitoring();
      showToast("Monitoring schedule created!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSchedule = async (id: string) => {
    try {
      const res = await fetch("/api/v1/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "TOGGLE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle schedule");
      setSchedules((prev) => prev.map((s) => (s.id === id ? data.schedule : s)));
      showToast(data.schedule.isActive ? "Schedule resumed" : "Schedule paused");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    setError(null);
    try {
      const customGoogleKey = typeof window !== "undefined" ? localStorage.getItem("sp_google_key") || "" : "";
      const aiConfig = getClientAIConfig();
      const res = await fetch("/api/v1/schedules", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(customGoogleKey ? { "x-custom-google-key": customGoogleKey } : {}),
          ...(aiConfig.apiKey ? { "x-custom-ai-key": aiConfig.apiKey } : {}),
          ...(aiConfig.provider ? { "x-custom-ai-provider": aiConfig.provider } : {}),
          ...(aiConfig.model ? { "x-custom-ai-model": aiConfig.model } : {}),
          ...(aiConfig.baseUrl ? { "x-custom-ai-base-url": aiConfig.baseUrl } : {}),
        },
        body: JSON.stringify({ id, action: "RUN_NOW" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run audit");
      showToast("Scheduled audit started! Opening live tracker...");
      router.push(`/audits/${data.jobId}`);
    } catch (e: any) {
      setError(e.message);
      setRunningId(null);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/schedules?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      showToast("Monitoring schedule removed");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-xs shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            Continuous Website Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated recurring audit schedules, performance regression tracking, and webhook notifications.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={projects.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Create Audit Schedule
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
          {error}
        </div>
      )}

      {/* Quick Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-muted-foreground">Active Monitors</div>
            <div className="text-2xl font-bold font-mono mt-0.5">
              {schedules.filter((s) => s.isActive).length}
            </div>
          </div>
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-muted-foreground">Monitored Projects</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{projects.length}</div>
          </div>
          <Globe className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-muted-foreground">Active Alert Webhooks</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{webhooks.length}</div>
          </div>
          <Bell className="w-5 h-5 text-amber-500" />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center border border-border rounded-lg bg-card">
          <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading monitoring schedules...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
          <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">Create a Project First</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Run an initial audit or create a project before setting up recurring monitoring schedules.
          </p>
          <Link
            href="/audits/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
          >
            Run First Audit
          </Link>
        </div>
      ) : schedules.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">No Active Monitoring Schedules</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Configure daily, weekly, or monthly automated scans on critical conversion pages and connect webhook alerts.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Monitoring Schedule
          </button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-medium">
                <tr>
                  <th className="py-3 px-4">Project &amp; Domain</th>
                  <th className="py-3 px-3">Frequency</th>
                  <th className="py-3 px-3">Devices</th>
                  <th className="py-3 px-3">Last Run</th>
                  <th className="py-3 px-3">Next Run</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedules.map((sch) => (
                  <tr key={sch.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{sch.project?.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{sch.project?.primaryDomain}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-secondary font-mono text-[11px] font-semibold">
                        {sch.frequency}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                      {sch.deviceMode}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {sch.lastRunAt ? new Date(sch.lastRunAt).toLocaleString() : "Never"}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {sch.nextRunAt ? new Date(sch.nextRunAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          sch.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : "bg-secondary text-muted-foreground border-border"
                        }`}
                      >
                        {sch.isActive ? "ACTIVE" : "PAUSED"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRunNow(sch.id)}
                          disabled={runningId === sch.id}
                          className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-semibold inline-flex items-center gap-1 transition disabled:opacity-50"
                          title="Trigger audit immediately"
                        >
                          {runningId === sch.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          Run Now
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSchedule(sch.id)}
                          className="p-1.5 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                          title={sch.isActive ? "Pause schedule" : "Resume schedule"}
                        >
                          {sch.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(sch.id)}
                          className="p-1.5 rounded border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition"
                          title="Delete schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSchedule}
            className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Create Automated Audit Schedule
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Target Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.primaryDomain})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Devices</label>
                  <select
                    value={deviceMode}
                    onChange={(e) => setDeviceMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background"
                  >
                    <option value="BOTH">Mobile + Desktop</option>
                    <option value="MOBILE">Mobile Only</option>
                    <option value="DESKTOP">Desktop Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Alert Webhook URL (Optional)</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 rounded-md border border-border bg-background font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Notifies Slack, Discord, or custom endpoints when a scheduled run finishes.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
