import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clapperboard, Monitor, Smartphone, Sparkles } from "lucide-react";

import { AccountMenu } from "@/components/auth/AccountMenu";
import { MotionLink } from "@/components/landing/MotionLink";
import { useSessionUser } from "@/lib/session";

import { MotionLink } from "@/components/landing/MotionLink";
import { Reveal } from "@/components/landing/Reveal";
import { SceneControl } from "@/components/landing/SceneControl";
import { SceneReel } from "@/components/landing/SceneReel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Deewhy HQ Preview Studio — Turn any homepage into a scroll-through video" },
      {
        name: "description",
        content:
          "Paste a link and Preview Studio records a public homepage as a polished scroll-through MP4 — vertical 9:16 or widescreen 16:9. It all runs in the cloud, no laptop power needed.",
      },
      {
        property: "og:title",
        content: "Deewhy HQ Preview Studio — Turn any homepage into a scroll-through video",
      },
      {
        property: "og:description",
        content:
          "Paste a link and Preview Studio records a public homepage as a polished scroll-through MP4 — vertical 9:16 or widescreen 16:9.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const BENEFITS = [
  {
    icon: Monitor,
    title: "Pick your frame",
    body: "Record the desktop view or the phone view — one site, both feeds covered.",
  },
  {
    icon: Sparkles,
    title: "Motion gets time to play",
    body: "The hero holds and every section pauses, so 3D scenes and animations finish on camera.",
  },
  {
    icon: Clapperboard,
    title: "Download & post",
    body: "A clean MP4 lands in your queue — straight to TikTok, Reels or YouTube from any device.",
  },
] as const;

function Landing() {
  return (
    <div className="relative">
      {/* top bar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-foreground">
              <span className="size-2.5 rounded-full bg-primary" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold tracking-tight">Deewhy HQ</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Preview Studio
              </p>
            </div>
          </div>
          {useSessionUser() ? (
            <div className="flex items-center gap-3">
              <Link
                to="/studio"
                className="hidden font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:text-foreground sm:inline"
              >
                Open the studio
              </Link>
              <AccountMenu />
            </div>
          ) : (
            <MotionLink to="/auth" className="px-4 py-2 text-sm">
              Sign in <ArrowRight className="size-4" />
            </MotionLink>
          )}
        </div>
      </header>

      <main className="pt-12">
        {/* pinned scene 1 — camera-follow, parallax, changing headlines */}
        <SceneReel />

        {/* pinned scene 2 — horizontal scrub, counters, timecode */}
        <SceneControl />

        {/* scroll-triggered reveals */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal>
            <h2 className="max-w-2xl font-display text-3xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
              Made for old laptops. <span className="text-primary">Made for new feeds.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              The recording happens in a cloud browser, so a ten-year-old machine only needs a tab
              open — the finished video comes out clean at 1080p.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 120}>
                <div className="group h-full rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                    <b.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{b.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{b.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* final CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 sm:pb-32">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border bg-card p-8 text-center sm:p-14">
              <div className="pointer-events-none absolute left-1/2 top-[-40%] h-[70%] w-[70%] -translate-x-1/2 rounded-full bg-primary/20 blur-[90px]" />
              <p className="relative font-mono text-[10px] uppercase tracking-[0.3em] text-primary sm:text-[11px]">
                Free while in beta
              </p>
              <h2 className="relative mt-3 font-display text-3xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
                Give every homepage a film crew.
              </h2>
              <p className="relative mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
                Paste a link, pick your settings, and watch the reel take shape in the monitor.
              </p>
              <div className="relative mt-7 flex justify-center">
                <MotionLink to="/studio">
                  Open the studio <ArrowRight className="size-4" />
                </MotionLink>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t py-6">
        <p className="mx-auto max-w-6xl px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:px-6">
          Deewhy HQ · Preview Studio · homepage recordings only
        </p>
      </footer>
    </div>
  );
}
