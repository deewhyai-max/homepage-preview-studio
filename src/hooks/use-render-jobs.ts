import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  estimateTypicalDuration,
  type JobStatus,
  type OutputFormat,
  type RecordingSettings,
  type ScrollSpeed,
  type Viewport,
} from "@/lib/recording";
import { useSessionUser } from "@/lib/session";

// Render jobs live in the database. The person creates and removes their own
// jobs; the self-hosted recorder (worker/) claims them and reports progress,
// which streams back here through realtime updates.

export interface RenderJob {
  id: string;
  homepage: string;
  host: string;
  settings: RecordingSettings;
  status: JobStatus;
  progress: number;
  phase: string | null;
  createdAt: number;
  finishedAt?: number | undefined;
  error?: string | undefined;
  estimatedSeconds: number;
  durationSeconds?: number | undefined;
  fileSizeBytes?: number | undefined;
  videoPath?: string | undefined;
}

type Row = Tables<"render_jobs">;

function toJob(row: Row): RenderJob {
  const settings: RecordingSettings = {
    scrollSpeed: row.scroll_speed as ScrollSpeed,
    pauseSeconds: Number(row.pause_seconds),
    viewport: row.viewport as Viewport,
    format: row.aspect as OutputFormat,
  };
  const host = row.host ?? new URL(row.url).host;
  return {
    id: row.id,
    homepage: row.url,
    host,
    settings,
    status: row.status,
    progress: Math.min(1, Math.max(0, row.progress / 100)),
    phase: row.phase,
    createdAt: Date.parse(row.created_at),
    finishedAt: row.finished_at ? Date.parse(row.finished_at) : undefined,
    error: row.error ?? undefined,
    estimatedSeconds:
      row.estimated_seconds != null ? Number(row.estimated_seconds) : estimateTypicalDuration(settings),
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : undefined,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    videoPath: row.video_path ?? undefined,
  };
}

const FRIENDLY: Record<string, string> = {
  active_job_limit: "You already have 3 recordings in progress. Wait for one to finish first.",
  homepage_only: "Only a website's homepage can be recorded.",
};

export function friendlyJobError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  for (const [code, text] of Object.entries(FRIENDLY)) if (msg.includes(code)) return text;
  return "Something went wrong saving your recording. Please try again.";
}

export function videoFileName(job: RenderJob): string {
  const slug = job.host.replace(/[^a-z0-9.-]+/gi, "-");
  const fmt = job.settings.format === "9:16" ? "vertical" : "widescreen";
  return `deewhy-${slug}-${fmt}.mp4`;
}

export async function signedVideoUrl(job: RenderJob, download: boolean): Promise<string> {
  if (!job.videoPath) throw new Error("No video yet");
  const { data, error } = await supabase.storage
    .from("recordings")
    .createSignedUrl(job.videoPath, 60 * 60, download ? { download: videoFileName(job) } : undefined);
  if (error || !data) throw error ?? new Error("No link");
  return data.signedUrl;
}

export function useRenderJobs() {
  const user = useSessionUser();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["render_jobs", userId] as const, [userId]);

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("render_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    // Safety net if a realtime update is missed while something is in progress.
    refetchInterval: (q) =>
      q.state.data?.some((r) => r.status === "queued" || r.status === "rendering") ? 5000 : false,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`render_jobs:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "render_jobs", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const next = payload.new as Row;
            queryClient.setQueryData<Row[]>(queryKey, (prev) =>
              prev ? prev.map((r) => (r.id === next.id ? { ...r, ...next } : r)) : prev,
            );
          } else {
            void queryClient.invalidateQueries({ queryKey });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient, queryKey]);

  const createMutation = useMutation({
    mutationFn: async (input: { homepage: string; host: string; settings: RecordingSettings }) => {
      const { data, error } = await supabase
        .from("render_jobs")
        .insert({
          url: input.homepage,
          host: input.host,
          scroll_speed: input.settings.scrollSpeed,
          pause_seconds: input.settings.pauseSeconds,
          viewport: input.settings.viewport,
          aspect: input.settings.format,
          estimated_seconds: estimateTypicalDuration(input.settings),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      queryClient.setQueryData<Row[]>(queryKey, (prev) => [row, ...(prev ?? []).filter((r) => r.id !== row.id)]);
    },
  });

  const removeJob = useCallback(
    async (job: RenderJob) => {
      queryClient.setQueryData<Row[]>(queryKey, (prev) => prev?.filter((r) => r.id !== job.id));
      if (job.videoPath) await supabase.storage.from("recordings").remove([job.videoPath]);
      const { error } = await supabase.from("render_jobs").delete().eq("id", job.id);
      if (error) {
        void queryClient.invalidateQueries({ queryKey });
        throw error;
      }
    },
    [queryClient, queryKey],
  );

  const enqueue = useCallback(
    async (homepage: string, host: string, settings: RecordingSettings) => {
      const row = await createMutation.mutateAsync({ homepage, host, settings });
      return row.id;
    },
    [createMutation],
  );

  const retry = useCallback(
    async (job: RenderJob) => {
      const id = await enqueue(job.homepage, job.host, job.settings);
      await removeJob(job).catch(() => undefined);
      return id;
    },
    [enqueue, removeJob],
  );

  const jobs = useMemo(() => (query.data ?? []).map(toJob), [query.data]);

  return {
    jobs,
    loading: query.isLoading,
    loadError: query.error,
    creating: createMutation.isPending,
    enqueue,
    retry,
    remove: removeJob,
  };
}
