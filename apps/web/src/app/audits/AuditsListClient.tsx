"use client";

import React, { useState } from "react";
import Link from "next/link";
import { History, Zap, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricBadge } from "@/components/ui/MetricBadge";

interface JobItem {
  id: string;
  status: string;
  deviceMode: string;
  source: string;
  totalUrls: number;
  createdAt: string | Date;
  project: {
    name: string;
    primaryDomain: string;
  };
  executions: Array<{
    id: string;
    lighthouse: {
      performanceScore: number | null;
    } | null;
  }>;
}

interface AuditsListClientProps {
  initialJobs: JobItem[];
}

export function AuditsListClient({ initialJobs }: AuditsListClientProps) {
  const [jobs, setJobs] = useState<JobItem[]>(initialJobs);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDelete = async (jobId: string, projectName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this audit for "${projectName}"? This will delete all associated execution runs, Lighthouse scores, and issues.`
    );
    if (!confirmed) return;

    setDeletingId(jobId);
    try {
      const res = await fetch(`/api/v1/audits/${jobId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete audit");
      }

      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      showToast("Audit permanently deleted.");
    } catch (err: unknown) {
      alert((err as Error).message || "An error occurred while deleting the audit.");
    } finally {
      setDeletingId(null);
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
        <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-sm">No Audit History Recorded</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
          Completed audits and historical benchmark logs will appear here.
        </p>
        <Link
          href="/audits/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
        >
          <Zap className="w-3.5 h-3.5" />
          Launch Audit
        </Link>
      </div>
    );
  }

  return (
    <>
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm divide-y divide-border">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-sm text-foreground">{job.project.name}</span>
                <span className="text-xs text-muted-foreground font-mono">({job.project.primaryDomain})</span>
                <StatusBadge status={job.status} />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>{job.totalUrls} execution(s)</span>
                <span>•</span>
                <span>Device: {job.deviceMode}</span>
                <span>•</span>
                <span>Source: {job.source.toLowerCase().replace("_", " ")}</span>
                <span>•</span>
                <span>{new Date(job.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {job.executions.map((e) => (
                  <MetricBadge key={e.id} score={e.lighthouse?.performanceScore} size="sm" />
                ))}
              </div>

              <Link
                href={`/audits/${job.id}`}
                className="px-3.5 py-1.5 rounded-md border border-border text-xs font-semibold hover:bg-secondary transition flex items-center gap-1"
              >
                View Details <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => handleDelete(job.id, job.project.name)}
                disabled={deletingId === job.id}
                title="Delete Audit"
                className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-rose-600 hover:border-rose-500/50 hover:bg-rose-500/10 transition disabled:opacity-50"
              >
                {deletingId === job.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

