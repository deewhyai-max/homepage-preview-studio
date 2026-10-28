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

export const PAUSE_MIN = 2;
export const PAUSE_MAX = 3;
export const PAUSE_STEP = 0.5;
export const HERO_HOLD_SECONDS = 2.5;

export const SCROLL_SPEED_PX_PER_SEC: Record<ScrollSpeed, number> = {
  slow: 250,
  normal: 500,
  fast: 900,
};

export const VIEWPORT_SIZE: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
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

export const DEFAULT_SETTINGS: RecordingSettings = {
  scrollSpeed: "normal",
  pauseSeconds: 2.5,
  viewport: "desktop",
  format: "16:9",
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

/** Video length: hero hold + scroll travel at the chosen speed + a pause per section. */
export function estimateDurationSeconds(opts: {
  pageHeightPx: number;
  viewportHeightPx: number;
  sections: number;
  settings: Pick<RecordingSettings, "scrollSpeed" | "pauseSeconds">;
}): number {
  const travel = Math.max(0, opts.pageHeightPx - opts.viewportHeightPx);
  const scroll = travel / SCROLL_SPEED_PX_PER_SEC[opts.settings.scrollSpeed];
  const pauses = Math.max(0, opts.sections) * clampPause(opts.settings.pauseSeconds);
  return Math.round((HERO_HOLD_SECONDS + scroll + pauses) * 10) / 10;
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
  { key: "scroll", label: "Recording · scrolling sections", weight: 0.42 },
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
