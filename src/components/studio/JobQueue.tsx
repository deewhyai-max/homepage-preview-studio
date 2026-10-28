import { Download, Monitor, RotateCcw, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RenderJob } from "@/hooks/use-render-jobs";
import { RENDER_PHASES, phaseAt, type JobStatus } from "@/lib/recording";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<JobStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  rendering: "bg-warning text-warning-foreground",
  completed: "bg-success text-success-foreground",
  failed: "bg-destructive text-destructive-foreground",
};

const STATUS_LABEL: Record<JobStatus, string> = {
  queued: "Queued",
  rendering: "Rendering",
  completed: "Completed",
  failed: "Failed",
};

export function JobQueue({
  jobs,
  selectedId,
  onSelect,
  onRetry,
  onRemove,
}: {
  jobs: RenderJob[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="font-display text-lg font-semibold">No renders yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Every recording you start shows up here: Queued → Rendering → Completed or Failed.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {jobs.map((job) => {
        const phase = phaseAt(job.progress);
        return (
          <li key={job.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(job.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(job.id)}
              className={cn(
                "grid cursor-pointer gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/30 sm:grid-cols-[1fr_auto] sm:items-center",
                selectedId === job.id && "border-primary/70 shadow-glow",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                      STATUS_STYLE[job.status],
                    )}
                  >
                    {STATUS_LABEL[job.status]}
                  </span>
                  <span className="truncate font-display text-base font-semibold">{job.host}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {job.settings.viewport === "mobile" ? <Smartphone className="size-3" /> : <Monitor className="size-3" />}
                    {job.settings.viewport}
                  </span>
                  <span>{job.settings.format}</span>
                  <span>{job.settings.scrollSpeed} scroll</span>
                  <span>{job.settings.pauseSeconds}s pauses</span>
                  <span>~{job.estimatedSeconds}s</span>
                </div>
                {job.status === "rendering" && (
                  <div className="mt-3">
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-[width] duration-200 ease-linear"
                        style={{ width: `${Math.round(job.progress * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                      {Math.round(job.progress * 100)}% · {RENDER_PHASES[phase.index]?.label}
                    </p>
                  </div>
                )}
                {job.status === "failed" && (
                  <p className="mt-2 text-sm text-destructive">{job.error}</p>
                )}
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {job.status === "completed" && (
                  <Button
                    size="sm"
                    disabled
                    title="Downloads switch on once the rendering backend is connected"
                  >
                    <Download /> Download MP4
                  </Button>
                )}
                {job.status === "failed" && (
                  <Button size="sm" variant="secondary" onClick={() => onRetry(job.id)}>
                    <RotateCcw /> Retry
                  </Button>
                )}
                {job.status !== "rendering" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${job.host}`}
                    onClick={() => onRemove(job.id)}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </div>
            {job.status === "completed" && (
              <p className="mt-1.5 px-1 font-mono text-[10px] text-muted-foreground">
                Prototype run — the MP4 file arrives with the real cloud recorder.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
