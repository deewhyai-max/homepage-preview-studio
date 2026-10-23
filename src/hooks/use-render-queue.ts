import { useCallback, useEffect, useState } from "react";

import {
  estimateTypicalDuration,
  phaseStart,
  type JobStatus,
  type RecordingSettings,
} from "@/lib/recording";

// PROTOTYPE: jobs are simulated in the browser. The real rendering backend will
// replace this hook with server-side job creation + status polling.

export interface RenderJob {
  id: string;
  homepage: string;
  host: string;
  settings: RecordingSettings;
  status: JobStatus;
  progress: number;
  createdAt: number;
  queuedUntil: number;
  finishedAt?: number | undefined;
  error?: string | undefined;
  estimatedSeconds: number;
}

const TICK_MS = 200;
const SIM_TOTAL_MS = 12_000;
const QUEUE_HOLD_MS = 1_500;

function shouldFail(job: RenderJob) {
  return job.host.endsWith(".invalid");
}

export function advanceJobs(jobs: RenderJob[], now: number): RenderJob[] {
  const next = jobs.map((j) => ({ ...j }));
  const rendering = next.find((j) => j.status === "rendering");

  if (rendering) {
    rendering.progress = Math.min(1, rendering.progress + TICK_MS / SIM_TOTAL_MS);
    if (shouldFail(rendering) && rendering.progress >= phaseStart("load") + 0.08) {
      rendering.status = "failed";
      rendering.error = "The homepage didn't respond within 30 seconds.";
      rendering.finishedAt = now;
    } else if (rendering.progress >= 1) {
      rendering.status = "completed";
      rendering.finishedAt = now;
    }
  } else {
    const nextUp = [...next]
      .filter((j) => j.status === "queued" && j.queuedUntil <= now)
      .sort((a, b) => a.createdAt - b.createdAt)[0];
    if (nextUp) nextUp.status = "rendering";
  }
  return next;
}

export function useRenderQueue() {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const busy = jobs.some((j) => j.status === "queued" || j.status === "rendering");

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => setJobs((prev) => advanceJobs(prev, Date.now())), TICK_MS);
    return () => window.clearInterval(id);
  }, [busy]);

  const enqueue = useCallback(
    (homepage: string, host: string, settings: RecordingSettings) => {
      const now = Date.now();
      const job: RenderJob = {
        id: crypto.randomUUID(),
        homepage,
        host,
        settings: { ...settings },
        status: "queued",
        progress: 0,
        createdAt: now,
        queuedUntil: now + QUEUE_HOLD_MS,
        estimatedSeconds: estimateTypicalDuration(settings),
      };
      setJobs((prev) => [job, ...prev]);
      return job.id;
    },
    [],
  );

  const retry = useCallback((id: string) => {
    const now = Date.now();
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? {
              ...j,
              status: "queued",
              progress: 0,
              error: undefined,
              finishedAt: undefined,
              createdAt: now,
              queuedUntil: now + QUEUE_HOLD_MS,
            }
          : j,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  return { jobs, enqueue, retry, remove };
}
