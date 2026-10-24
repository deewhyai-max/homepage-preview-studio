import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Info, Link2, Monitor, Smartphone } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { AccountMenu } from "@/components/auth/AccountMenu";
import { JobQueue } from "@/components/studio/JobQueue";
import { PreviewMonitor } from "@/components/studio/PreviewMonitor";
import { Segmented } from "@/components/studio/Segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useRenderQueue } from "@/hooks/use-render-queue";
import {
  DEFAULT_SETTINGS,
  OUTPUT_SIZE,
  PAUSE_MAX,
  PAUSE_MIN,
  PAUSE_STEP,
  clampPause,
  estimateTypicalDuration,
  toHomepageUrl,
  type OutputFormat,
  type RecordingSettings,
  type ScrollSpeed,
  type Viewport,
} from "@/lib/recording";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "The Studio — Deewhy HQ Preview Studio" },
      {
        name: "description",
        content:
          "Paste a website link, set the scroll speed and section pauses, and queue your homepage recording as a scroll-through MP4.",
      },
      { property: "og:title", content: "The Studio — Deewhy HQ Preview Studio" },
      {
        property: "og:description",
        content:
          "Paste a website link, set the scroll speed and section pauses, and queue your homepage recording as a scroll-through MP4.",
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
  const { jobs, enqueue, retry, remove } = useRenderQueue();

  const check = useMemo(() => toHomepageUrl(url), [url]);
  const estimate = estimateTypicalDuration(settings);
  const out = OUTPUT_SIZE[settings.format];

  const renderingJob = jobs.find((j) => j.status === "rendering") ?? null;
  const selectedJob = jobs.find((j) => j.id === selectedId) ?? null;
  const monitorJob = selectedJob ?? renderingJob;

  const update = <K extends keyof RecordingSettings>(key: K, value: RecordingSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSelectedId(null);
  };

  const start = () => {
    setTouched(true);
    if (!check.ok) return;
    const id = enqueue(check.homepage, check.host, settings);
    setSelectedId(id);
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
            <span className="hidden rounded-full border border-warning/50 px-3 py-1 text-warning md:inline">
              Prototype · simulated renders
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
            Paste a link, pick how it moves, and export an MP4 — the hero holds, each section
            pauses, and animations get time to play.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div className="grid content-start gap-4">
            <Step n={1} title="Enter a website URL">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  start();
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
                  <FieldLabel>Viewport</FieldLabel>
                  <Segmented<Viewport>
                    label="Viewport"
                    value={settings.viewport}
                    onChange={(v) => update("viewport", v)}
                    options={[
                      { value: "desktop", label: <><Monitor className="size-4" /> Desktop</>, hint: "1440×900" },
                      { value: "mobile", label: <><Smartphone className="size-4" /> Mobile</>, hint: "390×844" },
                    ]}
                  />
                </div>
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
                <div>
                  <FieldLabel aside={<span className="text-foreground">{settings.pauseSeconds.toFixed(1)}s</span>}>
                    Pause per section
                  </FieldLabel>
                  <Slider
                    aria-label="Pause per section in seconds"
                    min={PAUSE_MIN}
                    max={PAUSE_MAX}
                    step={PAUSE_STEP}
                    value={[settings.pauseSeconds]}
                    onValueChange={(vals) => update("pauseSeconds", clampPause(vals[0] ?? PAUSE_MIN))}
                  />
                  <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>{PAUSE_MIN}s</span>
                    <span>{PAUSE_MAX}s</span>
                  </div>
                </div>
                <p className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Before recording, the browser does a quick pass down the page so lazy-loaded
                  images and animations are ready on camera.
                </p>
              </div>
            </Step>

            <Step n={3} title="Export the video">
              <FieldLabel>Format</FieldLabel>
              <Segmented<OutputFormat>
                label="Output format"
                value={settings.format}
                onChange={(v) => update("format", v)}
                options={[
                  { value: "9:16", label: "Vertical 9:16", hint: "Reels · TikTok" },
                  { value: "16:9", label: "Widescreen 16:9", hint: "YouTube · web" },
                ]}
              />
              <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="rounded-lg border p-2">
                  <dt className="text-muted-foreground">Length</dt>
                  <dd className="mt-0.5 text-sm text-foreground">~{estimate}s</dd>
                </div>
                <div className="rounded-lg border p-2">
                  <dt className="text-muted-foreground">Size</dt>
                  <dd className="mt-0.5 text-sm text-foreground">
                    {out.width}×{out.height}
                  </dd>
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
                onClick={start}
              >
                Start recording <ArrowRight />
              </Button>
            </Step>
          </div>

          <div className="grid content-start gap-6">
            <PreviewMonitor
              settings={settings}
              job={monitorJob}
              host={check.ok ? check.host : null}
            />

            <section>
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-display text-xl font-semibold tracking-tight">Render queue</h2>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Tip: a site ending in .invalid shows the Failed state
                </p>
              </div>
              <JobQueue
                jobs={jobs}
                selectedId={monitorJob?.id ?? null}
                onSelect={setSelectedId}
                onRetry={(id) => {
                  retry(id);
                  setSelectedId(id);
                }}
                onRemove={(id) => {
                  remove(id);
                  if (selectedId === id) setSelectedId(null);
                }}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
