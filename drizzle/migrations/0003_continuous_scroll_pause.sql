ALTER TABLE public.render_jobs DROP CONSTRAINT IF EXISTS render_jobs_pause_seconds_check;
ALTER TABLE public.render_jobs ADD CONSTRAINT render_jobs_pause_seconds_check CHECK (pause_seconds = 0 OR pause_seconds BETWEEN 2 AND 3);
ALTER TABLE public.render_jobs ALTER COLUMN pause_seconds SET DEFAULT 0;
COMMENT ON COLUMN public.render_jobs.pause_seconds IS 'Zero for continuous standard scrolling; legacy 2-3 second values retained for existing jobs.';