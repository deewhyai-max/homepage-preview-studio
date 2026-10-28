ALTER TABLE public.render_jobs
  ADD COLUMN IF NOT EXISTS host text,
  ADD COLUMN IF NOT EXISTS phase text,
  ADD COLUMN IF NOT EXISTS estimated_seconds numeric,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS worker_id text,
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

CREATE INDEX IF NOT EXISTS render_jobs_queue_idx ON public.render_jobs (created_at) WHERE status = 'queued';

-- New jobs from the app: homepage-only URL, clean worker fields, max 3 active per user.
CREATE OR REPLACE FUNCTION public.prepare_new_render_job() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.url !~ '^https?://[^/\s?#]+/$' THEN
    RAISE EXCEPTION 'homepage_only' USING HINT = 'Only a website homepage can be recorded.';
  END IF;
  IF (SELECT count(*) FROM public.render_jobs
       WHERE user_id = NEW.user_id AND status IN ('queued','rendering')) >= 3 THEN
    RAISE EXCEPTION 'active_job_limit' USING HINT = 'Wait for one of your recordings to finish first.';
  END IF;
  NEW.status := 'queued';
  NEW.progress := 0;
  NEW.phase := NULL;
  NEW.video_path := NULL;
  NEW.error := NULL;
  NEW.attempts := 0;
  NEW.worker_id := NULL;
  NEW.heartbeat_at := NULL;
  NEW.started_at := NULL;
  NEW.finished_at := NULL;
  NEW.duration_seconds := NULL;
  NEW.file_size_bytes := NULL;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS render_jobs_prepare_new ON public.render_jobs;
CREATE TRIGGER render_jobs_prepare_new BEFORE INSERT ON public.render_jobs
  FOR EACH ROW EXECUTE FUNCTION public.prepare_new_render_job();

-- Recorder picks the oldest queued job atomically; silent workers' jobs are recovered.
CREATE OR REPLACE FUNCTION public.claim_render_job(p_worker_id text)
RETURNS SETOF public.render_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.render_jobs
     SET status = 'failed', error = 'The recorder stopped responding. Please try again.',
         finished_at = now(), worker_id = NULL, phase = NULL
   WHERE status = 'rendering' AND coalesce(heartbeat_at, started_at, updated_at) < now() - interval '3 minutes'
     AND attempts >= 3;
  UPDATE public.render_jobs
     SET status = 'queued', progress = 0, phase = NULL, worker_id = NULL
   WHERE status = 'rendering' AND coalesce(heartbeat_at, started_at, updated_at) < now() - interval '3 minutes'
     AND attempts < 3;

  RETURN QUERY
  UPDATE public.render_jobs j
     SET status = 'rendering', worker_id = p_worker_id, attempts = j.attempts + 1,
         started_at = now(), heartbeat_at = now(), progress = 0, phase = 'launch', error = NULL
   WHERE j.id = (
     SELECT q.id FROM public.render_jobs q
      WHERE q.status = 'queued'
      ORDER BY q.created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1)
  RETURNING j.*;
END $$;

REVOKE ALL ON FUNCTION public.claim_render_job(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_render_job(text) TO service_role;
REVOKE ALL ON FUNCTION public.prepare_new_render_job() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Users delete own recordings" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);