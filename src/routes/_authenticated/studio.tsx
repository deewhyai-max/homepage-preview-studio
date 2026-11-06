import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Info, Link2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { AccountMenu } from "@/components/auth/AccountMenu";
import { LegalFooter } from "@/components/legal/LegalFooter";
import { JobQueue } from "@/components/studio/JobQueue";
import { PreviewMonitor } from "@/components/studio/PreviewMonitor";
import { Segmented } from "@/components/studio/Segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  friendlyJobError,
  signedVideoUrl,
  useRenderJobs,
  type RenderJob,
} from "@/hooks/use-render-jobs";
import { laptopFrameFileName, renderLaptopFramePng } from "@/lib/laptop-frame";
import {
  DEFAULT_SETTINGS,
  estimateTypicalDuration,
  toHomepageUrl,
  type RecordingSettings,
  type ScrollSpeed,
} from "@/lib/recording";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "The Studio — Deewhy HQ Preview Studio" },
      {
        name: "description",
        content:
          "Record a homepage with continuous desktop scrolling and export a native 1920×1080 MP4 or laptop mockup.",
      },
      { property: "og:title", content: "The Studio — Deewhy HQ Preview Studio" },
      {
        property: "og:description",
        content:
          "Record a homepage with continuous desktop scrolling and export a native 1920×1080 MP4 or laptop mockup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <header className="mb-4 flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full border border-primary/60 font-mono text-xs text-primary">
          {String(n).padStart(2, "0")}
        </span>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function FieldLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
      <span>{children}</span>
      {aside}
    </div>
  );
}

function Studio() {
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [settings, setSettings] = useState<RecordingSettings>(DEFAULT_SETTINGS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { jobs, loading, creating, enqueue, retry, remove } = useRenderJobs();

  const check = useMemo(() => toHomepageUrl(url), [url]);
  const estimate = estimateTypicalDuration(settings);

  const renderingJob = jobs.find((j) => j.status === "rendering") ?? null;
  const selectedJob = jobs.find((j) => j.id === selectedId) ?? null;
  const monitorJob = selectedJob ?? renderingJob;

  const playable = monitorJob?.status === "completed" && monitorJob.videoPath ? monitorJob : null;
  const { data: videoUrl } = useQuery({
    queryKey: ["recording-url", playable?.videoPath],
    enabled: !!playable,
    staleTime: 50 * 60 * 1000,
    queryFn: () => signedVideoUrl(playable as RenderJob, false),
  });

  const update = <K extends keyof RecordingSettings>(key: K, value: RecordingSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSelectedId(null);
  };

  const start = async () => {
    setTouched(true);
    if (!check.ok || creating) return;
    try {
      const id = await enqueue(check.homepage, check.host, settings);
      setSelectedId(id);
      toast.success("Recording queued", { description: `We'll record ${check.host} and let you download the MP4.` });
    } catch (err) {
      toast.error(friendlyJobError(err));
    }
  };

  const download = async (job: RenderJob) => {
    try {
      const href = await signedVideoUrl(job, true);
      const a = document.createElement("a");
      a.href = href;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error("Couldn't get the download link. Please try again.");
    }
  };

  const downloadFrame = async (job: RenderJob) => {
    try {
      const url = await signedVideoUrl(job, false);
      const blob = await renderLaptopFramePng(url);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = laptopFrameFileName(job);
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't build the laptop frame. Please try again.");
    }
  };

  const counts = {
    active: jobs.filter((j) => j.status === "queued" || j.status === "rendering").length,
    done: jobs.filter((j) => j.status === "completed").length,
  };

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex size-9 items-center justify-center rounded-lg bg-foreground">
              <span className="size-3 rounded-full bg-primary" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-bold tracking-tight">Deewhy HQ</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Preview Studio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
            <span className="hidden rounded-full border px-3 py-1 text-muted-foreground sm:inline">
              {counts.active} in progress · {counts.done} done
            </span>
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8 max-w-3xl">
          <h1 className="font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
            Turn any homepage into a <span className="text-primary">scroll-through</span> video.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Clean desktop recordings. Full HD, from the first screen to the footer.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div className="grid content-start gap-4">
            <Step n={1} title="Enter a website URL">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void start();
                }}
              >
                <label htmlFor="site-url" className="sr-only">
                  Website URL
                </label>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="site-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={() => url && setTouched(true)}
                    placeholder="deewhyhq.com"
                    autoComplete="url"
                    inputMode="url"
                    className="h-12 bg-background pl-9 font-mono text-sm"
                    aria-invalid={touched && !check.ok}
                  />
                </div>
              </form>
              <div className="mt-2 min-h-5 text-xs">
                {check.ok ? (
                  <p className="font-mono text-success">
                    ✓ Will record {check.homepage}
                    {check.trimmedPath && (
                      <span className="block text-muted-foreground">
                        Homepage only — the rest of the link is ignored.
                      </span>
                    )}
                  </p>
                ) : touched ? (
                  <p className="text-destructive">{check.reason}</p>
                ) : (
                  <p className="text-muted-foreground">
                    Public sites only. We load the homepage and wait for the hero to settle.
                  </p>
                )}
              </div>
            </Step>

            <Step n={2} title="Record the homepage">
              <div className="grid gap-5">
                <div>
                  <FieldLabel>Scroll speed</FieldLabel>
                  <Segmented<ScrollSpeed>
                    label="Scroll speed"
                    value={settings.scrollSpeed}
                    onChange={(v) => update("scrollSpeed", v)}
                    options={[
                      { value: "slow", label: "Slow" },
                      { value: "normal", label: "Normal" },
                      { value: "fast", label: "Fast" },
                    ]}
                  />
                </div>
                <p className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Before recording, the browser does a quick pass down the page so lazy-loaded
                  images and animations are ready on camera.
                </p>
              </div>
            </Step>

            <Step n={3} title="Export the video">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-primary/60 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-primary">
                  Widescreen 16:9
                </span>
                <span className="rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  1920×1080
                </span>
                <span className="rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Desktop 1920×1080
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                One clean format — full-frame widescreen that drops straight into laptop mockups.
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="rounded-lg border p-2">
                  <dt className="text-muted-foreground">Length</dt>
                  <dd className="mt-0.5 text-sm text-foreground">~{estimate}s</dd>
                </div>
                <div className="rounded-lg border p-2">
                  <dt className="text-muted-foreground">Size</dt>
                  <dd className="mt-0.5 text-sm text-foreground">1920×1080</dd>
                </div>
                <div className="rounded-lg border p-2">
                  <dt className="text-muted-foreground">File</dt>
                  <dd className="mt-0.5 text-sm text-foreground">MP4</dd>
                </div>
              </dl>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Length is estimated for a typical six-section homepage.
              </p>
              <Button
                size="lg"
                className="mt-4 h-12 w-full text-base font-semibold shadow-glow"
                onClick={() => void start()}
                disabled={creating}
              >
                {creating ? "Queuing…" : "Start recording"} <ArrowRight />
              </Button>
            </Step>
          </div>

          <div className="grid content-start gap-6">
            <PreviewMonitor
              settings={settings}
              job={monitorJob}
              host={check.ok ? check.host : null}
              videoUrl={playable ? (videoUrl ?? null) : null}
            />

            <section>
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-display text-xl font-semibold tracking-tight">Render queue</h2>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {loading ? "Loading your recordings…" : "Finished videos are kept for you here"}
                </p>
              </div>
              <JobQueue
                jobs={jobs}
                selectedId={monitorJob?.id ?? null}
                onSelect={setSelectedId}
                onDownload={download}
                onFrameDownload={downloadFrame}
                onRetry={async (job) => {
                  try {
                    setSelectedId(await retry(job));
                  } catch (err) {
                    toast.error(friendlyJobError(err));
                  }
                }}
                onRemove={async (job) => {
                  if (selectedId === job.id) setSelectedId(null);
                  try {
                    await remove(job);
                  } catch {
                    toast.error("Couldn't remove that recording. Please try again.");
                  }
                }}
              />
            </section>
          </div>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
