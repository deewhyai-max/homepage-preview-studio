CREATE TYPE public.render_status AS ENUM ('queued','rendering','completed','failed');

CREATE TABLE public.render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  url text NOT NULL,
  scroll_speed text NOT NULL DEFAULT 'normal' CHECK (scroll_speed IN ('slow','normal','fast')),
  pause_seconds numeric NOT NULL DEFAULT 2.5 CHECK (pause_seconds BETWEEN 2 AND 3),
  viewport text NOT NULL DEFAULT 'desktop' CHECK (viewport IN ('desktop','mobile')),
  aspect text NOT NULL DEFAULT '16:9' CHECK (aspect IN ('9:16','16:9')),
  status public.render_status NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  video_path text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.render_jobs TO authenticated;
GRANT ALL ON public.render_jobs TO service_role;

ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own jobs" ON public.render_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own jobs" ON public.render_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'queued');
CREATE POLICY "Users delete own jobs" ON public.render_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX render_jobs_user_created_idx ON public.render_jobs (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER render_jobs_touch BEFORE UPDATE ON public.render_jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.render_jobs;

CREATE POLICY "Users read own recordings" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);