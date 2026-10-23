import { Lock } from "lucide-react";

import { clamp01, useScrollProgress } from "@/hooks/use-scroll-progress";
import { cn } from "@/lib/utils";

const STEPS = [
  { tag: "01 · Paste a link", headline: "Point at any homepage." },
  { tag: "02 · We load it in the cloud", headline: "No laptop power needed." },
  { tag: "03 · Hero holds, sections pause", headline: "Every section gets its moment." },
  { tag: "04 · Export the MP4", headline: "Vertical 9:16 or widescreen 16:9." },
] as const;

const CHIPS = [
  { label: "9:16 · Reels & TikTok", side: "left", top: "28%", speed: -70, center: 0.35 },
  { label: "16:9 · YouTube", side: "right", top: "40%", speed: -110, center: 0.6 },
  { label: "MP4 · 1080p", side: "left", top: "62%", speed: -50, center: 0.85 },
] as const;

/** Mock homepage sections shown inside the captured screen. */
function PageStrip({ progress }: { progress: number }) {
  return (
    <div
      className="absolute inset-x-0 top-0 grid grid-rows-6 gap-[2.5%] p-[3%] will-change-transform"
      style={{ height: "260%", transform: `translateY(-${progress * 61.5}%)` }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[4%] bg-screen-ink/[0.05]">
          {i === 0 ? (
            <div className="relative flex h-full flex-col justify-center gap-[5%] p-[9%]">
              <div className="absolute -right-[12%] -top-[18%] aspect-square w-[55%] rounded-full bg-screen-accent/60 blur-[1px]" />
              <div className="relative h-[10%] w-[64%] rounded-full bg-screen-ink" />
              <div className="relative h-[10%] w-[42%] rounded-full bg-screen-ink" />
              <div className="relative h-[3.5%] w-[48%] rounded-full bg-screen-ink/30" />
              <div className="relative mt-[2%] flex gap-[3%]">
                <div className="h-[12%] w-[20%] min-h-2 rounded-full bg-screen-accent" />
                <div className="h-[12%] w-[16%] min-h-2 rounded-full border border-screen-ink/40" />
              </div>
            </div>
          ) : i % 2 === 1 ? (
            <div className="grid h-full grid-cols-3 gap-[4%] p-[7%]">
              {Array.from({ length: 3 }).map((_, k) => (
                <div key={k} className="flex flex-col gap-[8%] rounded-[6%] bg-screen-ink/[0.07] p-[9%]">
                  <div className="aspect-[4/3] w-full rounded-[8%] bg-screen-ink/15" />
                  <div className="h-[7%] w-[70%] rounded-full bg-screen-ink/60" />
                  <div className="h-[5%] w-[90%] rounded-full bg-screen-ink/25" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid h-full grid-cols-2 items-center gap-[6%] p-[8%]">
              <div className="aspect-square w-full rounded-[8%] bg-screen-ink/80" />
              <div className="flex flex-col gap-[8%]">
                <div className="h-[8%] w-[80%] rounded-full bg-screen-ink" />
                <div className="h-[5%] w-full rounded-full bg-screen-ink/25" />
                <div className="h-[5%] w-[70%] rounded-full bg-screen-ink/25" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Pinned scene 1 — scroll-scrubbed. The camera follows a homepage as it
 * scrolls through layered parallax, while the headline changes at each step.
 */
export function SceneReel() {
  const { ref, progress } = useScrollProgress();
  const steps = STEPS.length;
  const p = progress * steps;
  const step = Math.min(steps - 1, Math.floor(p));
  const recording = step >= 2;

  return (
    <section ref={ref} className="relative h-[340vh]" aria-label="How a homepage becomes a video">
      <div className="sticky top-0 flex h-[100dvh] flex-col items-center justify-center overflow-hidden px-4">
        {/* parallax layer — slow glow, moves against the scroll */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ transform: `translateY(${progress * 16}%)` }}
        >
          <div className="absolute left-1/2 top-[-25%] h-[70vh] w-[90vw] -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />
          <div className="absolute bottom-[-30%] right-[-10%] h-[50vh] w-[50vw] rounded-full bg-success/10 blur-[100px]" />
        </div>

        {/* stacked headlines — one per step, crossfading with scroll */}
        <div className="relative z-10 mb-6 grid max-w-4xl text-center sm:mb-10">
          {STEPS.map((s, i) => {
            const d = p - i;
            const opacity = clamp01(1 - Math.abs(d) * 1.6);
            return (
              <div
                key={s.tag}
                aria-hidden={i !== step}
                className="col-start-1 row-start-1"
                style={{
                  opacity,
                  transform: `translateY(${d * -30}px)`,
                  transition: "opacity 80ms linear",
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary sm:text-[11px]">
                  {s.tag}
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  {s.headline}
                </h2>
              </div>
            );
          })}
        </div>

        {/* camera-follow screen: the frame drifts while the page travels through it */}
        <div
          className="relative z-10 w-full max-w-xl sm:max-w-2xl"
          style={{
            transform: `translateY(${progress * -3.5}%) scale(${1 + progress * 0.05})`,
          }}
        >
          <div className="relative overflow-hidden rounded-xl border bg-monitor p-2 shadow-monitor">
            <div className="mb-2 flex items-center gap-2 px-1 py-0.5">
              <span className="size-2 rounded-full bg-screen-ink/25" />
              <span className="size-2 rounded-full bg-screen-ink/25" />
              <span className="size-2 rounded-full bg-screen-ink/25" />
              <div className="flex flex-1 items-center gap-1 truncate rounded bg-screen px-2 py-1 font-mono text-[9px] text-screen-ink/70">
                <Lock className="size-2.5 shrink-0" />
                <span className="truncate">your-website.com</span>
              </div>
              <span
                className={cn(
                  "flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-primary transition-opacity duration-500",
                  recording ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="inline-block size-2 animate-rec rounded-full bg-primary" />
                REC
              </span>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-screen">
              <PageStrip progress={progress} />
              {/* camera frame edge */}
              <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-screen-ink/10" />
            </div>
          </div>
        </div>

        {/* parallax chips — each floats at its own speed */}
        <div className="pointer-events-none absolute inset-0 z-10 hidden sm:block">
          {CHIPS.map((chip) => (
            <div
              key={chip.label}
              className={cn(
                "absolute rounded-full border bg-card px-3 py-1.5 font-mono text-xs shadow-glow",
                chip.side === "left" ? "left-[5%]" : "right-[5%]",
              )}
              style={{
                top: chip.top,
                transform: `translateY(${progress * chip.speed}px)`,
                opacity: clamp01(1 - Math.abs(progress - chip.center) * 5),
              }}
            >
              {chip.label}
            </div>
          ))}
        </div>

        {/* scroll cue */}
        <div
          className="absolute bottom-5 z-10 flex flex-col items-center gap-1 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          style={{ opacity: clamp01(1 - progress * 10) }}
        >
          Scroll
          <span className="block h-4 w-px bg-gradient-to-b from-muted-foreground to-transparent" />
        </div>
      </div>
    </section>
  );
}
