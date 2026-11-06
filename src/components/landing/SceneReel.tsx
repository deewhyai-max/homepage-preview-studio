import { useEffect, useRef, useState, type ReactNode } from "react";
import { Clapperboard, Cloud, Link2, PauseCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Link2, tag: "01 · Paste a link", headline: "Point at any homepage.", body: "Drop in a public website address. We only ever film the homepage." },
  { icon: Cloud, tag: "02 · Cloud browser", headline: "No laptop power needed.", body: "A powerful cloud browser loads the site, so even an old machine works." },
  { icon: PauseCircle, tag: "03 · Continuous scroll", headline: "One steady sweep.", body: "A brief hero hold, continuous scrolling, and a clean finish at the footer." },
  { icon: Clapperboard, tag: "04 · Export the MP4", headline: "Full HD, ready for your laptop.", body: "Native 1920×1080 desktop video and a clean laptop-frame image." },
] as const;

/** Glass card that snaps in when on screen and dissolves when it leaves — both directions. */
function GlassCard({ children, index }: { children: ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"below" | "in" | "above">("below");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) setState("in");
        else setState(e.boundingClientRect.top < 0 ? "above" : "below");
      },
      { threshold: 0.25, rootMargin: "-8% 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const fromLeft = index % 2 === 0;
  return (
    <div
      ref={ref}
      className={cn(
        "glass-card group relative rounded-3xl border border-border/60 bg-card/40 p-6 backdrop-blur-xl transition-[opacity,transform,filter] duration-500 ease-out will-change-transform motion-reduce:transition-none sm:p-8",
        "hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow active:scale-[0.98]",
        state === "in" && "translate-x-0 translate-y-0 scale-100 opacity-100 blur-0",
        state === "below" && cn("translate-y-16 scale-95 opacity-0 blur-md", fromLeft ? "-translate-x-8" : "translate-x-8"),
        state === "above" && "-translate-y-12 scale-95 opacity-0 blur-md",
      )}
    >
      {children}
    </div>
  );
}

/** Scene 1 — kinetic glass cards that appear and disappear as you scroll. */
export function SceneReel() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:pt-36" aria-label="How a homepage becomes a video">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[60vh] w-[90vw] -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />
        <div className="absolute bottom-0 right-[-10%] h-[40vh] w-[50vw] rounded-full bg-success/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        <GlassCard index={-1}>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Deewhy HQ Preview Studio</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.02] tracking-tight text-balance sm:text-6xl">
            Turn any homepage into a scroll-through video.
          </h1>
        </GlassCard>

        <div className="mt-10 flex flex-col gap-6 sm:gap-8">
          {STEPS.map((s, i) => (
            <GlassCard key={s.tag} index={i}>
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                  <s.icon className="size-6" />
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{s.tag}</p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{s.headline}</h2>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">{s.body}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
