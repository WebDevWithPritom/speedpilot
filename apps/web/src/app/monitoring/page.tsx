import { Activity, Plus, Clock, ShieldAlert } from "lucide-react";

export const revalidate = 0;

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            Continuous Website Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated recurring audit schedules, performance regression detection, and alert rules.
          </p>
        </div>

        <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm">
          <Plus className="w-4 h-4" />
          Create Audit Schedule
        </button>
      </div>

      <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-sm">No Active Monitoring Schedules</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
          Configure daily or weekly automated scans on critical conversion pages. SpeedPilot will alert you if Core Web Vitals degrade.
        </p>
      </div>
    </div>
  );
}

