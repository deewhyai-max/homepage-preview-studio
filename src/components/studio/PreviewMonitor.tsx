import { CheckCircle2, Globe, Lock, TriangleAlert } from "lucide-react";

import type { RenderJob } from "@/hooks/use-render-jobs";
import {
  OUTPUT_SIZE,
  RENDER_PHASES,
  VIEWPORT_SIZE,
  formatTimecode,
  phaseAt,
  phaseStart,
  type RecordingSettings,
} from "@/lib/recording";
import { cn } from "@/lib/utils";

const SECTIONS = 6;

function monitorState(job: RenderJob | null) {
  if (!job) return { scroll: 0, loaded: SECTIONS, scanning: false, recording: false, phase: -1 };
  if (job.status === "queued") return { scroll: 0, loaded: 0, scanning: false, recording: false, phase: -1 };
  if (job.status === "completed")
    return { scroll: 1, loaded: SECTIONS, scanning: false, recording: false, phase: RENDER_PHASES.length };

  const { index, local } = phaseAt(job.progress);
  const key = RENDER_PHASES[index]?.key ?? "encode";
  let scroll = 0;
  let loaded = SECTIONS;
  if (key === "launch") loaded = 0;
  else if (key === "load" || key === "settle") loaded = 1;
  else if (key === "prescan") loaded = 1 + Math.floor(local * (SECTIONS - 1));

  if (key === "prescan") scroll = local; // quick pass down to trigger lazy content
  if (key === "scroll") {
    const moves = SECTIONS - 1;
    const seg = Math.min(moves - 1, Math.floor(local * moves));
    const within = local * moves - seg;
    const moveShare = 0.45; // remainder of each segment is the section pause
    scroll = (seg + Math.min(1, within / moveShare)) / moves;
  }
  if (key === "encode") scroll = 1;

  return {
    scroll,
    loaded,
    scanning: key === "prescan",
    recording: key === "hero" || key === "scroll",
    phase: index,
  };
}

function MockSection({ i, mobile, loaded }: { i: number; mobile: boolean; loaded: boolean }) {
  const cols = mobile ? "grid-cols-1" : "grid-cols-3";
  const base = "rounded-[3%] transition-all duration-700";
  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center p-[6%]">
        <div className="h-full w-full rounded-[3%] border-2 border-dashed border-screen-ink/15" />
      </div>
    );
  }
  if (i === 0) {
    return (
      <div className="relative flex h-full flex-col justify-center gap-[4%] overflow-hidden p-[8%]">
        <div className="absolute -right-[15%] -top-[20%] aspect-square w-[70%] rounded-full bg-screen-accent/80 blur-[2px]" />
        <div className="absolute right-[10%] top-[35%] aspect-square w-[22%] rotate-12 rounded-[18%] bg-screen-ink/85" />
        <div className="relative h-[9%] w-[70%] rounded-full bg-screen-ink" />
        <div className="relative h-[9%] w-[50%] rounded-full bg-screen-ink" />
        <div className="relative h-[3%] w-[45%] rounded-full bg-screen-ink/30" />
        <div className="relative mt-[3%] flex gap-[3%]">
          <div className="h-[0.9em] w-[22%] min-w-8 rounded-full bg-screen-accent p-[3%]" />
          <div className="h-[0.9em] w-[18%] min-w-6 rounded-full border-2 border-screen-ink/40 p-[3%]" />
        </div>
      </div>
    );
  }
  if (i % 2 === 1) {
    return (
      <div className={cn("grid h-full gap-[4%] p-[7%]", cols)}>
        {Array.from({ length: mobile ? 2 : 3 }).map((_, k) => (
          <div key={k} className={cn(base, "flex flex-col gap-[6%] bg-screen-ink/[0.07] p-[8%]")}>
            <div className="aspect-[4/3] w-full rounded-[6%] bg-screen-ink/15" />
            <div className="h-[6%] w-[70%] rounded-full bg-screen-ink/60" />
            <div className="h-[4%] w-[90%] rounded-full bg-screen-ink/20" />
            <div className="h-[4%] w-[60%] rounded-full bg-screen-ink/20" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid h-full items-center gap-[6%] p-[8%]", mobile ? "grid-cols-1" : "grid-cols-2")}>
      <div className={cn(base, "aspect-square w-full bg-screen-ink/85", i === 4 && "rounded-full bg-screen-accent/70")} />
      <div className="flex flex-col gap-[6%]">
        <div className="h-[0.8em] w-[80%] rounded-full bg-screen-ink" />
        <div className="h-[0.5em] w-full rounded-full bg-screen-ink/25" />
        <div className="h-[0.5em] w-[85%] rounded-full bg-screen-ink/25" />
        <div className="h-[0.5em] w-[60%] rounded-full bg-screen-ink/25" />
      </div>
    </div>
  );
}

/** Finished recording shown inside a clean laptop lockup on white. */
function LaptopLockup({ videoUrl, host }: { videoUrl: string; host: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white p-[3.5%]">
      <div className="w-[88%]">
        <div className="rounded-xl bg-[#15181d] p-[0.9%] shadow-[0_24px_50px_-22px_rgba(10,15,30,0.45)]">
          <video
            key={videoUrl}
            src={videoUrl}
            controls
            playsInline
            autoPlay
            muted
            loop
            aria-label={`Recording of ${host}`}
            className="block w-full rounded-[4px] bg-black"
          />
        </div>
        <div
          className="relative mx-auto w-[108%] -translate-x-px rounded-b-lg bg-gradient-to-b from-[#eceef2] via-[#d4d7dc] to-[#b3b8c0]"
          style={{ aspectRatio: "30 / 1" }}
        >
          <div className="absolute left-1/2 top-0 h-1/2 w-[14%] -translate-x-1/2 rounded-b-md bg-[#a9aeb6]" />
        </div>
      </div>
    </div>
  );
}

export function PreviewMonitor({
  settings,
  job,
  host,
  videoUrl,
}: {
  settings: RecordingSettings;
  job: RenderJob | null;
  host: string | null;
  videoUrl?: string | null;
}) {
  const s = job?.settings ?? settings;
  const out = OUTPUT_SIZE[s.format];
  const vp = VIEWPORT_SIZE[s.viewport];
  const frameRatio = out.width / out.height;
  const vpRatio = vp.width / vp.height;
  const mobile = s.viewport === "mobile";
  const state = monitorState(job);

  const recStart = phaseStart("hero");
  const recEnd = phaseStart("encode");
  const recProgress = job
    ? job.status === "completed"
      ? 1
      : Math.min(1, Math.max(0, (job.progress - recStart) / (recEnd - recStart)))
    : 0;
  const timecode = formatTimecode(recProgress * (job?.durationSeconds ?? job?.estimatedSeconds ?? 0));

  const shownHost = job?.host ?? host ?? "your-website.com";
  const phaseLabel =
    !job
      ? "Standby · live preview of your settings"
      : job.status === "queued"
        ? "Queued · waiting for a cloud browser"
        : job.status === "completed"
          ? "Render complete"
          : job.status === "failed"
            ? "Render failed"
            : RENDER_PHASES[state.phase]?.label;

  return (
    <div className="rounded-2xl border bg-monitor p-3 shadow-monitor sm:p-4">
      {/* top status bar */}
      <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block size-2.5 rounded-full",
              state.recording ? "animate-rec bg-primary" : job?.status === "rendering" ? "bg-warning" : "bg-muted-foreground/40",
            )}
          />
          <span className={cn(state.recording && "text-primary")}>
            {state.recording ? "REC" : job?.status === "rendering" ? "Prep" : "Idle"}
          </span>
          <span className="text-foreground/80">{timecode}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{s.viewport} {vp.width}×{vp.height}</span>
          <span className="hidden sm:inline">→</span>
          <span className="text-foreground/80">MP4 {out.width}×{out.height}</span>
        </div>
      </div>

      {/* output frame */}
      <div className="mx-auto flex max-h-[62vh] items-center justify-center" style={{ aspectRatio: `${frameRatio}`, maxWidth: s.format === "9:16" ? "calc(62vh * 9 / 16)" : "100%" }}>
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-background"
          style={{ aspectRatio: `${frameRatio}` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_60%)]" />

          {job?.status === "completed" && videoUrl ? (
            <LaptopLockup videoUrl={videoUrl} host={job.host} />
          ) : (
          <>
          {/* captured browser viewport */}
          <div
            className={cn(
              "relative flex flex-col overflow-hidden bg-screen shadow-2xl transition-all duration-500",
              mobile ? "rounded-[6%/3%] border-[6px] border-monitor" : "rounded-md",
              frameRatio > vpRatio ? "h-[92%]" : "w-[94%]",
            )}
            style={{ aspectRatio: `${vpRatio}` }}
          >
            {!mobile && (
              <div className="flex shrink-0 items-center gap-2 border-b border-screen-ink/10 bg-screen px-2 py-1.5">
                <div className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-screen-ink/25" />
                  <span className="size-1.5 rounded-full bg-screen-ink/25" />
                  <span className="size-1.5 rounded-full bg-screen-ink/25" />
                </div>
                <div className="flex flex-1 items-center gap-1 truncate rounded bg-screen-ink/[0.06] px-2 py-0.5 font-mono text-[9px] text-screen-ink/70">
                  <Lock className="size-2.5 shrink-0" />
                  <span className="truncate">{shownHost}</span>
                </div>
              </div>
            )}
            <div className="relative flex-1 overflow-hidden text-[clamp(6px,1.2vw,12px)]">
              <div
                className="absolute inset-x-0 top-0 transition-transform duration-300 ease-linear"
                style={{
                  height: `${SECTIONS * 100}%`,
                  transform: `translateY(-${state.scroll * ((SECTIONS - 1) / SECTIONS) * 100}%)`,
                }}
              >
                {Array.from({ length: SECTIONS }).map((_, i) => (
                  <div key={i} style={{ height: `${100 / SECTIONS}%` }}>
                    <MockSection i={i} mobile={mobile} loaded={i < state.loaded} />
                  </div>
                ))}
              </div>

              {state.scanning && (
                <div className="pointer-events-none absolute inset-0 bg-screen-accent/5">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-screen-accent shadow-[0_0_12px_2px_var(--screen-accent)]" />
                </div>
              )}

              {job?.status === "queued" && (
                <div className="absolute inset-0 flex items-center justify-center bg-screen">
                  <Globe className="size-8 animate-pulse text-screen-ink/30" />
                </div>
              )}
            </div>
          </div>

          {job?.status === "completed" && !videoUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm">
              <CheckCircle2 className="size-10 text-success" />
              <p className="font-display text-lg font-semibold">Ready to export</p>
              <p className="font-mono text-xs text-muted-foreground">
                {job.durationSeconds ?? `~${job.estimatedSeconds}`}s · {out.width}×{out.height}
              </p>
            </div>
          )}
          {job?.status === "failed" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 p-6 text-center backdrop-blur-sm">
              <TriangleAlert className="size-10 text-destructive" />
              <p className="font-display text-lg font-semibold">Couldn't record this homepage</p>
              <p className="max-w-xs text-sm text-muted-foreground">{job.error}</p>
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* phase timeline */}
      <div className="mt-4">
        <p className="mb-2 font-mono text-xs text-foreground/80">{phaseLabel}</p>
        <div className="flex gap-1">
          {RENDER_PHASES.map((p, i) => {
            const done = job && (job.status === "completed" || i < state.phase);
            const current = job?.status === "rendering" && i === state.phase;
            const failedHere = job?.status === "failed" && i === phaseAt(job.progress).index;
            return (
              <div
                key={p.key}
                title={p.label}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  done ? "bg-success" : current ? "animate-pulse bg-primary" : failedHere ? "bg-destructive" : "bg-muted",
                )}
                style={{ flexGrow: p.weight }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
