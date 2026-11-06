// Homepage recording rules for Preview Studio. Pure functions only, so the UI
// prototype and the future rendering backend share the same settings logic.

export type ScrollSpeed = "slow" | "normal" | "fast";
export type Viewport = "desktop" | "mobile";
export type OutputFormat = "9:16" | "16:9";
export type JobStatus = "queued" | "rendering" | "completed" | "failed";

export interface RecordingSettings {
  scrollSpeed: ScrollSpeed;
  pauseSeconds: number;
  viewport: Viewport;
  format: OutputFormat;
}

export const PAUSE_MIN = 0;
export const PAUSE_MAX = 3;
export const PAUSE_STEP = 0.5;
export const HERO_HOLD_SECONDS = 1.5;
export const BOTTOM_HOLD_SECONDS = 1;

export const SCROLL_SPEED_PX_PER_SEC: Record<ScrollSpeed, number> = {
  slow: 250,
  normal: 500,
  fast: 900,
};

export const VIEWPORT_SIZE: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 390, height: 844 },
};

export const OUTPUT_SIZE: Record<OutputFormat, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
};

// Used for the length estimate before the real page height is known.
export const TYPICAL_HOMEPAGE = {
  sections: 6,
  heightPx: { desktop: 6200, mobile: 9800 } as Record<Viewport, number>,
};

/** The studio exports one format only — desktop widescreen, made for laptop mockups. */
export const ONLY_VIEWPORT: Viewport = "desktop";
export const ONLY_FORMAT: OutputFormat = "16:9";

export const DEFAULT_SETTINGS: RecordingSettings = {
  scrollSpeed: "normal",
  pauseSeconds: 0,
  viewport: ONLY_VIEWPORT,
  format: ONLY_FORMAT,
};

export function clampPause(seconds: number): number {
  if (!Number.isFinite(seconds)) return PAUSE_MIN;
  const stepped = Math.round(seconds / PAUSE_STEP) * PAUSE_STEP;
  return Math.min(PAUSE_MAX, Math.max(PAUSE_MIN, stepped));
}

export type HomepageCheck =
  | { ok: true; homepage: string; host: string; trimmedPath: boolean }
  | { ok: false; reason: string };

export function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "0.0.0.0") return true;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** Reduce any pasted link to its public homepage (homepage-only scope). */
export function toHomepageUrl(input: string): HomepageCheck {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "Paste a website link to start." };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, reason: "That doesn't look like a website link." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https websites can be recorded." };
  }
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || isPrivateHost(host)) {
    return {
      ok: false,
      reason: "Use a public website — local or private addresses can't be reached.",
    };
  }
  const trimmedPath = (url.pathname !== "/" && url.pathname !== "") || !!url.search || !!url.hash;
  return { ok: true, homepage: `${url.protocol}//${url.host}/`, host: url.host, trimmedPath };
}

/** Video length follows the exact capture plan, including the travel safety cap. */
export function estimateDurationSeconds(opts: {
  pageHeightPx: number;
  viewportHeightPx: number;
  sections: number;
  settings: Pick<RecordingSettings, "scrollSpeed" | "pauseSeconds">;
}): number {
  return Math.round(planDurationSeconds(planScroll({
    pageHeightPx: opts.pageHeightPx,
    viewportHeightPx: opts.viewportHeightPx,
    sectionTops: [],
    settings: opts.settings,
  })) * 10) / 10;
}

export function estimateTypicalDuration(settings: RecordingSettings): number {
  return estimateDurationSeconds({
    pageHeightPx: TYPICAL_HOMEPAGE.heightPx[settings.viewport],
    viewportHeightPx: VIEWPORT_SIZE[settings.viewport].height,
    sections: TYPICAL_HOMEPAGE.sections,
    settings,
  });
}

export const RENDER_PHASES = [
  { key: "launch", label: "Launching cloud browser", weight: 0.06 },
  { key: "load", label: "Loading homepage", weight: 0.1 },
  { key: "settle", label: "Waiting for hero animations to settle", weight: 0.08 },
  { key: "prescan", label: "Pre-scroll pass — loading lazy content", weight: 0.16 },
  { key: "hero", label: "Recording · holding the hero", weight: 0.08 },
  { key: "scroll", label: "Recording · scrolling homepage", weight: 0.42 },
  { key: "encode", label: "Encoding MP4", weight: 0.1 },
] as const;

export type PhaseKey = (typeof RENDER_PHASES)[number]["key"];

export function phaseStart(key: PhaseKey): number {
  let acc = 0;
  for (const p of RENDER_PHASES) {
    if (p.key === key) return acc;
    acc += p.weight;
  }
  return acc;
}

export function phaseAt(progress: number): { index: number; local: number } {
  const p = Math.min(1, Math.max(0, progress));
  let acc = 0;
  for (let i = 0; i < RENDER_PHASES.length; i++) {
    const w = RENDER_PHASES[i]?.weight ?? 0;
    if (p < acc + w || i === RENDER_PHASES.length - 1) {
      return { index: i, local: Math.min(1, (p - acc) / w) };
    }
    acc += w;
  }
  return { index: RENDER_PHASES.length - 1, local: 1 };
}

export function formatTimecode(seconds: number): string {
  const s = Math.max(0, seconds);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const ff = Math.floor((s % 1) * 30);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
}

/** Weighted overall progress (0–1) for a phase and how far through it we are. */
export function progressFor(key: PhaseKey, local: number): number {
  const phase = RENDER_PHASES.find((p) => p.key === key);
  const w = phase?.weight ?? 0;
  const l = Math.min(1, Math.max(0, local));
  return Math.min(1, phaseStart(key) + w * l);
}

// ---------------------------------------------------------------------------
// Scroll choreography — the recorder executes exactly this plan.

/** Most section pauses a single video gets (long pages are thinned evenly). */
export const MAX_SECTION_STOPS = 8;
/** Never record more than this much scroll travel (guards infinite feeds). */
export const MAX_SCROLL_PX = 20_000;
/** Section tops closer than this share of a viewport are treated as one stop. */
export const MIN_STOP_GAP_VIEWPORTS = 0.6;
/** A signed-in person can have this many recordings waiting or rendering. */
export const MAX_ACTIVE_JOBS = 3;
/** Frames per second of the exported MP4. */
export const OUTPUT_FPS = 30;

export type ScrollStep =
  | { kind: "hold"; at: number; seconds: number }
  | { kind: "scroll"; from: number; to: number; seconds: number };

/** Turn measured section tops into the ordered scroll stops the video pauses at. */
export function normalizeStops(opts: {
  sectionTops: number[];
  maxScroll: number;
  viewportHeightPx: number;
}): number[] {
  const { maxScroll, viewportHeightPx } = opts;
  if (maxScroll <= 0) return [];
  const gap = viewportHeightPx * MIN_STOP_GAP_VIEWPORTS;
  const raw = opts.sectionTops
    .filter((t) => Number.isFinite(t))
    .map((t) => Math.round(Math.min(maxScroll, Math.max(0, t))))
    .filter((t) => t >= gap)
    .sort((a, b) => a - b);

  let stops: number[] = [];
  for (const t of raw) {
    const last = stops[stops.length - 1];
    if (last === undefined || t - last >= gap) stops.push(t);
  }
  // No usable sections found: pause roughly once per screen.
  if (stops.length === 0) {
    const n = Math.max(1, Math.min(MAX_SECTION_STOPS, Math.round(maxScroll / viewportHeightPx)));
    stops = Array.from({ length: n }, (_, i) => Math.round(((i + 1) / n) * maxScroll));
  }
  // The video always ends resting on the bottom of the page.
  const last = stops[stops.length - 1] ?? 0;
  if (maxScroll - last < gap) stops[stops.length - 1] = maxScroll;
  else stops.push(maxScroll);

  if (stops.length > MAX_SECTION_STOPS) {
    const keep: number[] = [];
    for (let i = 1; i <= MAX_SECTION_STOPS; i++) {
      const idx = Math.round((i / MAX_SECTION_STOPS) * (stops.length - 1));
      const v = stops[idx];
      if (v !== undefined && keep[keep.length - 1] !== v) keep.push(v);
    }
    stops = keep;
  }
  return stops;
}

/** Standard continuous sweep; section pauses are retired, including for legacy jobs. */
export function planScroll(opts: {
  pageHeightPx: number;
  viewportHeightPx: number;
  sectionTops: number[];
  settings: Pick<RecordingSettings, "scrollSpeed" | "pauseSeconds">;
}): ScrollStep[] {
  const maxScroll = Math.min(MAX_SCROLL_PX, Math.max(0, opts.pageHeightPx - opts.viewportHeightPx));
  const speed = SCROLL_SPEED_PX_PER_SEC[opts.settings.scrollSpeed];
  const steps: ScrollStep[] = [{ kind: "hold", at: 0, seconds: HERO_HOLD_SECONDS }];
  if (maxScroll > 0) {
    steps.push({ kind: "scroll", from: 0, to: maxScroll, seconds: Math.round((maxScroll / speed) * 1000) / 1000 });
  }
  steps.push({ kind: "hold", at: maxScroll, seconds: BOTTOM_HOLD_SECONDS });
  return steps;
}

export function planDurationSeconds(steps: ScrollStep[]): number {
  return Math.round(steps.reduce((sum, s) => sum + s.seconds, 0) * 1000) / 1000;
}
