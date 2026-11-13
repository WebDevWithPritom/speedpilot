import { FileText, Download, Plus, CheckCircle2 } from "lucide-react";

export const revalidate = 0;

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-500" />
            Executive Reports & Client Exports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate presentation-ready PDF audit reports, structured CSV spreadsheets, and client deliverables.
          </p>
        </div>

        <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm">
          <Plus className="w-4 h-4" />
          Export New Report
        </button>
      </div>

      <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-sm">No Custom Reports Generated</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
          Export full PDF executive summaries or bulk CSV files from any completed audit job.
        </p>
      </div>
    </div>
  );
}

