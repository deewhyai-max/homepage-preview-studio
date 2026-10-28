import { promises as fs } from "node:fs";
import path from "node:path";

import { chromium, type Browser, type CDPSession, type Page } from "playwright";

import {
  MAX_SCROLL_PX,
  VIEWPORT_SIZE,
  planDurationSeconds,
  planScroll,
  progressFor,
  type OutputFormat,
  type PhaseKey,
  type ScrollSpeed,
  type Viewport,
} from "../../src/lib/recording.ts";
import { config } from "./config.ts";
import { encodeMp4, writeConcatList, type TimedFrame } from "./encode.ts";
import { JobError } from "./errors.ts";
import { log } from "./log.ts";
import { PAGE_HELPERS } from "./page-scripts.ts";
import { assertPublicHost, isBlockedRequestHost } from "./safety.ts";

export interface RecordOptions {
  url: string;
  scrollSpeed: ScrollSpeed;
  pauseSeconds: number;
  viewport: Viewport;
  format: OutputFormat;
  outPath: string;
  /** Overall progress 0–1 for the current phase. */
  onProgress: (phase: PhaseKey, overall: number) => void;
  signal: AbortSignal;
}

export interface RecordResult {
  durationSeconds: number;
  fileSizeBytes: number;
}

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function launchArgs(): string[] {
  const args = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--mute-audio",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
  ];
  if (config.gpu) args.push("--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=default");
  else args.push("--use-gl=angle", "--use-angle=swiftshader");
  return args;
}

/** Records the homepage as a scroll-through MP4. Homepage only — every other navigation is blocked. */
export async function recordHomepage(opts: RecordOptions): Promise<RecordResult> {
  const homepage = new URL(opts.url);
  await assertPublicHost(homepage.hostname);

  const workDir = await fs.mkdtemp(path.join(config.workDir, "dw-rec-"));
  const framesDir = path.join(workDir, "frames");
  await fs.mkdir(framesDir);
  let browser: Browser | undefined;
  const report = (phase: PhaseKey, local: number) => opts.onProgress(phase, progressFor(phase, local));
  const check = () => {
    if (opts.signal.aborted) throw opts.signal.reason ?? new Error("aborted");
  };

  try {
    report("launch", 0);
    browser = await chromium.launch({ headless: true, args: launchArgs(), executablePath: config.chromiumPath });
    const vp = VIEWPORT_SIZE[opts.viewport];
    const mobile = opts.viewport === "mobile";
    const scale = mobile ? 2 : 1;
    const context = await browser.newContext({
      viewport: vp,
      deviceScaleFactor: scale,
      isMobile: mobile,
      hasTouch: mobile,
      userAgent: mobile ? MOBILE_UA : DESKTOP_UA,
      locale: "en-US",
      colorScheme: "light",
      reducedMotion: "no-preference",
      serviceWorkers: "block",
      acceptDownloads: false,
      // Many big sites (Stripe, GitHub…) forbid inline scripts; our scroll helpers must still run.
      bypassCSP: true,
    });
    // SSRF guard + homepage-only: block private hosts, and any top-level navigation away from the homepage.
    await context.route("**/*", (route) => {
      const req = route.request();
      let u: URL;
      try {
        u = new URL(req.url());
      } catch {
        return route.abort();
      }
      if (u.protocol === "data:" || u.protocol === "blob:") return route.continue();
      if (isBlockedRequestHost(u.hostname)) return route.abort("blockedbyclient");
      if (req.isNavigationRequest() && req.frame().parentFrame() === null) {
        const sameSite = u.hostname.replace(/^www\./, "") === homepage.hostname.replace(/^www\./, "");
        const isHome = u.pathname === "/" || u.pathname === "";
        if (!(sameSite && isHome) && !req.redirectedFrom()) return route.abort("blockedbyclient");
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("dialog", (d) => void d.dismiss().catch(() => {}));
    page.on("popup", (p) => void p.close().catch(() => {}));
    let prescanLocal = 0;
    await page.exposeFunction("__dwReport", (v: number) => {
      prescanLocal = v;
    });
    report("launch", 1);
    check();

    // Load
    report("load", 0);
    const resp = await page.goto(homepage.toString(), { waitUntil: "domcontentloaded", timeout: config.navTimeoutMs });
    if (resp && resp.status() >= 400) {
      throw new JobError(`The homepage answered with an error (HTTP ${resp.status()}).`, resp.status() >= 500);
    }
    await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});
    report("load", 0.6);
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    report("load", 1);
    check();

    // Settle
    report("settle", 0);
    await page.addScriptTag({ content: PAGE_HELPERS });
    await page.evaluate(() => (window as any).__dw.prepare());
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await sleep(1200);
    report("settle", 1);
    check();

    // Progressive pre-scroll for lazy content
    report("prescan", 0);
    const ticker = setInterval(() => report("prescan", prescanLocal * 0.9), 500);
    try {
      await page.evaluate(
        (o) => (window as any).__dw.prescan(o),
        { maxScroll: MAX_SCROLL_PX, stepPx: Math.round(vp.height * 0.6), delayMs: 220, maxMs: 45_000 },
      );
      await page.evaluate((ms) => (window as any).__dw.eagerMedia(ms), 6000);
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    } finally {
      clearInterval(ticker);
    }
    await page.evaluate(() => (window as any).__dw.toTop());
    await sleep(900);
    const m = (await page.evaluate(() => (window as any).__dw.measure())) as {
      pageHeight: number;
      viewportHeight: number;
      sectionTops: number[];
    };
    const steps = planScroll({
      pageHeightPx: m.pageHeight,
      viewportHeightPx: m.viewportHeight,
      sectionTops: m.sectionTops,
      settings: { scrollSpeed: opts.scrollSpeed, pauseSeconds: opts.pauseSeconds },
    });
    const planned = planDurationSeconds(steps);
    log.info("scroll plan", { pageHeight: m.pageHeight, sections: m.sectionTops.length, steps: steps.length, planned });
    report("prescan", 1);
    check();

    // Record
    const frames = await captureWhile(page, vp, scale, framesDir, async () => {
      const heroSec = steps[0]?.seconds ?? 0;
      const t0 = Date.now();
      const tick = setInterval(() => {
        const el = (Date.now() - t0) / 1000;
        if (el < heroSec) report("hero", el / heroSec);
        else report("scroll", (el - heroSec) / Math.max(0.1, planned - heroSec));
      }, 500);
      try {
        await page.evaluate((s) => (window as any).__dw.runPlan(s), steps);
      } finally {
        clearInterval(tick);
      }
    });
    if (frames.length < 1) throw new JobError("The page didn't produce any frames to record.", true);
    report("scroll", 1);
    await browser.close().catch(() => {});
    browser = undefined;
    check();

    // Encode
    report("encode", 0);
    const listPath = path.join(workDir, "frames.ffconcat");
    await writeConcatList(listPath, frames);
    const durationSeconds = frames.reduce((s, f) => s + f.duration, 0);
    await encodeMp4({
      listPath,
      outPath: opts.outPath,
      format: opts.format,
      durationSeconds,
      onProgress: (l) => report("encode", l),
      signal: opts.signal,
    });
    const stat = await fs.stat(opts.outPath);
    report("encode", 1);
    return { durationSeconds, fileSizeBytes: stat.size };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * CDP screencast: Chromium pushes a frame each time the page repaints, with a
 * timestamp. Each frame's on-screen time is the gap to the next one, so holds
 * cost nothing and scrolling stays in real time.
 */
async function captureWhile(
  page: Page,
  vp: { width: number; height: number },
  scale: number,
  dir: string,
  run: () => Promise<void>,
): Promise<TimedFrame[]> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const raw: { file: string; ts: number }[] = [];
  const writes: Promise<void>[] = [];
  let n = 0;
  cdp.on("Page.screencastFrame", (ev) => {
    const file = path.join(dir, `f${String(n++).padStart(6, "0")}.jpg`);
    const ts = ev.metadata.timestamp ?? Date.now() / 1000;
    raw.push({ file, ts });
    writes.push(fs.writeFile(file, Buffer.from(ev.data, "base64")));
    void cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: vp.width * scale,
    maxHeight: vp.height * scale,
    everyNthFrame: 1,
  });
  await sleep(400);
  // Screencast only fires on repaint, so seed the video with a real still of the hero.
  const seed = path.join(dir, "seed.jpg");
  await page.screenshot({ path: seed, type: "jpeg", quality: 92 });
  const start = Date.now() / 1000;
  await run();
  const end = Date.now() / 1000;
  await sleep(150);
  await cdp.send("Page.stopScreencast").catch(() => {});
  await Promise.all(writes);
  await cdp.detach().catch(() => {});

  // Timeline from start→end; the last frame before start opens the video.
  const before = raw.filter((f) => f.ts <= start);
  const during = raw.filter((f) => f.ts > start && f.ts <= end);
  const seq = [{ file: before.length ? before[before.length - 1]!.file : seed, ts: start }, ...during];
  const out: TimedFrame[] = [];
  for (let i = 0; i < seq.length; i++) {
    const cur = seq[i]!;
    const next = seq[i + 1]?.ts ?? end;
    const d = Math.max(0, next - cur.ts);
    if (d > 0) out.push({ file: cur.file, duration: d });
  }
  return out;
}
