import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { RENDER_PHASES } from "@/lib/recording";

// Endpoints the self-hosted recorder (worker/) calls. The worker never holds
// database keys — it proves itself with the shared WORKER_TOKEN and this route
// does the privileged work on its behalf.

const MAX_ATTEMPTS = 3;
const phaseKeys = RENDER_PHASES.map((p) => p.key) as [string, ...string[]];

const workerId = z.string().min(1).max(120);
const jobId = z.string().uuid();

const bodies = {
  claim: z.object({ workerId }),
  progress: z.object({
    workerId,
    jobId,
    phase: z.enum(phaseKeys),
    progress: z.number().min(0).max(1),
  }),
  "upload-url": z.object({ workerId, jobId }),
  complete: z.object({
    workerId,
    jobId,
    durationSeconds: z.number().min(0).max(3600),
    fileSizeBytes: z.number().int().min(1).max(5 * 1024 ** 3),
  }),
  fail: z.object({
    workerId,
    jobId,
    error: z.string().min(1).max(500),
    retryable: z.boolean(),
  }),
} as const;

type Action = keyof typeof bodies;

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function isAuthorized(request: Request, secret: string): Promise<boolean> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return false;
  const [a, b] = await Promise.all([sha256(token), sha256(secret)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

const json = (data: unknown, status = 200) => Response.json(data, { status });

export const Route = createFileRoute("/api/public/worker/$action")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const secret = process.env["WORKER_TOKEN"];
        if (!secret) return json({ error: "Recorder is not configured" }, 503);
        if (!(await isAuthorized(request, secret))) return json({ error: "Unauthorized" }, 401);

        const action = params.action as Action;
        if (!(action in bodies)) return json({ error: "Unknown action" }, 404);

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const parsed = bodies[action].safeParse(raw);
        if (!parsed.success) return json({ error: "Invalid body", issues: parsed.error.issues }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin;

        if (action === "claim") {
          const body = parsed.data as z.infer<(typeof bodies)["claim"]>;
          const { data, error } = await db.rpc("claim_render_job", { p_worker_id: body.workerId });
          if (error) return json({ error: error.message }, 500);
          const job = Array.isArray(data) ? data[0] : data;
          if (!job) return json({ job: null });
          return json({
            job: {
              id: job.id,
              userId: job.user_id,
              url: job.url,
              scrollSpeed: job.scroll_speed,
              pauseSeconds: Number(job.pause_seconds),
              viewport: job.viewport,
              format: job.aspect,
              attempt: job.attempts,
            },
          });
        }

        const { jobId: id, workerId: wid } = parsed.data as { jobId: string; workerId: string };
        if (action === "progress") {
          const body = parsed.data as z.infer<(typeof bodies)["progress"]>;
          const { data, error } = await db
            .from("render_jobs")
            .update({
              phase: body.phase,
              progress: Math.round(body.progress * 100),
              heartbeat_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("worker_id", wid)
            .eq("status", "rendering")
            .select("id");
          if (error) return json({ error: error.message }, 500);
          // Row gone or taken over: the person removed it or it was requeued.
          return json({ cancelled: !data || data.length === 0 });
        }

        const { data: job, error: jobErr } = await db
          .from("render_jobs")
          .select("id, user_id, attempts")
          .eq("id", id)
          .eq("worker_id", wid)
          .eq("status", "rendering")
          .maybeSingle();
        if (jobErr) return json({ error: jobErr.message }, 500);
        if (!job) return json({ cancelled: true }, 409);

        const path = `${job.user_id}/${job.id}.mp4`;

        if (action === "upload-url") {
          const { data, error } = await db.storage
            .from("recordings")
            .createSignedUploadUrl(path, { upsert: true });
          if (error || !data) return json({ error: error?.message ?? "No upload URL" }, 500);
          return json({ signedUrl: data.signedUrl, path });
        }

        if (action === "complete") {
          const body = parsed.data as z.infer<(typeof bodies)["complete"]>;
          const { error } = await db
            .from("render_jobs")
            .update({
              status: "completed",
              progress: 100,
              phase: null,
              video_path: path,
              duration_seconds: Math.round(body.durationSeconds * 10) / 10,
              file_size_bytes: body.fileSizeBytes,
              finished_at: new Date().toISOString(),
              error: null,
            })
            .eq("id", id)
            .eq("worker_id", wid);
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true });
        }

        // fail
        const body = parsed.data as z.infer<(typeof bodies)["fail"]>;
        const requeue = body.retryable && job.attempts < MAX_ATTEMPTS;
        const { error } = await db
          .from("render_jobs")
          .update(
            requeue
              ? { status: "queued", progress: 0, phase: null, worker_id: null, error: null }
              : {
                  status: "failed",
                  phase: null,
                  error: body.error,
                  finished_at: new Date().toISOString(),
                },
          )
          .eq("id", id)
          .eq("worker_id", wid);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, requeued: requeue });
      },
    },
  },
});
