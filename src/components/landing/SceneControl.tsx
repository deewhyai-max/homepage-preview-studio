import { useEffect, useRef, useState } from "react";
import { FileVideo, Gauge, Pause, ScanLine, Sparkles } from "lucide-react";

import { clamp01, easeOut, useScrollProgress } from "@/hooks/use-scroll-progress";
import { formatTimecode } from "@/lib/recording";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    icon: Sparkles,
    title: "Hero hold",
    body: "The first screen holds for a beat, so your intro animation plays out fully on camera.",
  },
  {
    icon: Pause,
    title: "Section pauses",
    body: "2–3 seconds per section — 3D scenes and lazy images finish before the camera moves on.",
  },
  {
    icon: Gauge,
    title: "Speed control",
    body: "Slow, normal or fast — the scroll pace of the whole reel is yours to set.",
  },
  {
    icon: ScanLine,
    title: "Pre-scroll pass",
    body: "A quiet pass down the page first, so nothing is still loading when the recording starts.",
  },
  {
    icon: FileVideo,
    title: "Clean MP4",
    body: "1080p export — vertical for Reels and TikTok, widescreen for YouTube and the web.",
  },
] as const;

function ScrubStat({ value, label, decimals = 0 }: { value: number; label: string; decimals?: number }) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <p className="font-display text-2xl font-bold tabular-nums text-primary sm:text-4xl">
        {value.toFixed(decimals)}
      </p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}

/**
 * Pinned scene 2 — a different motion language: the control cards scrub
 * horizontally with the scroll while counters count up beneath them.
 */
export function SceneControl() {
  const { ref, progress } = useScrollProgress();
  const eased = easeOut(progress);

  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const measure = () => {
      const strip = stripRef.current;
      const wrap = wrapRef.current;
      if (strip && wrap) setOverflow(Math.max(0, strip.scrollWidth - wrap.clientWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const shift = eased * overflow;

  return (
    <section ref={ref} className="relative h-[320vh]" aria-label="What you control">
      <div className="sticky top-0 flex h-[100dvh] flex-col justify-center gap-5 overflow-hidden px-4 py-8 sm:gap-8 sm:px-6">
        {/* headline slides in horizontally — opposite motion to scene 1 */}
        <div
          className="mx-auto w-full max-w-6xl"
          style={{
            transform: `translateX(${(1 - clamp01(progress * 2.2)) * 48}px)`,
            opacity: clamp01(progress * 4),
          }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary sm:text-[11px]">
            05 · Direct the recording
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            You're the director.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Every setting on this reel is a real control in the studio — scrub through them.
          </p>
        </div>

        {/* horizontal scrub strip */}
        <div ref={wrapRef} className="mx-auto w-full max-w-6xl overflow-hidden">
          <div
            ref={stripRef}
            className="flex w-max gap-3 will-change-transform sm:gap-4"
            style={{ transform: `translateX(-${shift}px)` }}
          >
            {CARDS.map((card, i) => (
              <div
                key={card.title}
                className={cn(
                  "group flex w-[76vw] max-w-xs shrink-0 flex-col rounded-2xl border bg-card p-5 transition-all duration-300",
                  "hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow sm:w-[24rem]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                    <card.icon className="size-5" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{card.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{card.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* scrubbed counters + timecode */}
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ScrubStat value={Math.round(6 * eased)} label="Sections on camera" />
            <ScrubStat value={2.5 * eased} decimals={1} label="Seconds paused per section" />
            <ScrubStat value={Math.round(2 * eased)} label="Output formats" />
            <ScrubStat value={Math.round(1080 * eased)} label="Pixels tall, vertical export" />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border bg-monitor px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Your reel, scrubbed
            </p>
            <p className="font-mono text-sm tabular-nums text-foreground sm:text-base">
              {formatTimecode(eased * 24)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
