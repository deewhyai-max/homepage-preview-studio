import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  MAX_ACTIVE_JOBS,
  OUTPUT_SIZE,
  VIEWPORT_SIZE,
  clampPause,
  estimateDurationSeconds,
  planDurationSeconds,
  planScroll,
  progressFor,
  toHomepageUrl,
} from "./recording";

describe("export lock", () => {
  it("records desktop widescreen 16:9 only — 1920×1080 for laptop mockups", () => {
    expect(DEFAULT_SETTINGS.viewport).toBe("desktop");
    expect(DEFAULT_SETTINGS.format).toBe("16:9");
    expect(OUTPUT_SIZE["16:9"]).toEqual({ width: 1920, height: 1080 });
    expect(VIEWPORT_SIZE.desktop).toEqual({ width: 1920, height: 1080 });
  });
});

describe("continuous defaults", () => {
  it("defaults to zero section pauses", () => {
    expect(DEFAULT_SETTINGS.pauseSeconds).toBe(0);
    expect(clampPause(-1)).toBe(0);
  });
});

describe("homepage-only scope", () => {
  it("reduces a deep link to the site's homepage", () => {
    const r = toHomepageUrl("deewhy.com/about?ref=x");
    expect(r).toEqual({
      ok: true,
      homepage: "https://deewhy.com/",
      host: "deewhy.com",
      trimmedPath: true,
    });
  });
  it("rejects non-public addresses", () => {
    expect(toHomepageUrl("http://localhost:3000").ok).toBe(false);
    expect(toHomepageUrl("192.168.1.4").ok).toBe(false);
  });
  it("rejects non-web links", () => {
    expect(toHomepageUrl("ftp://files.example.com").ok).toBe(false);
  });
});

describe("export formats", () => {
  it("vertical is 1080×1920 and widescreen is 1920×1080", () => {
    expect(OUTPUT_SIZE["9:16"]).toEqual({ width: 1080, height: 1920 });
    expect(OUTPUT_SIZE["16:9"]).toEqual({ width: 1920, height: 1080 });
  });
});

describe("standard scroll", () => {
  const settings = { scrollSpeed: "normal" as const, pauseSeconds: 0 };
  it("holds the hero for 1.5 seconds", () => {
    expect(planScroll({ pageHeightPx: 6200, viewportHeightPx: 1080, sectionTops: [], settings })[0]).toEqual({ kind: "hold", at: 0, seconds: 1.5 });
  });
  it("uses a single uninterrupted sweep regardless of section boundaries or legacy pauses", () => {
    const steps = planScroll({ pageHeightPx: 6200, viewportHeightPx: 1080, sectionTops: [1500, 3000, 4500], settings: { ...settings, pauseSeconds: 2.5 } });
    expect(steps.filter((s) => s.kind === "scroll")).toEqual([{ kind: "scroll", from: 0, to: 5120, seconds: 10.24 }]);
    expect(steps).toHaveLength(3);
  });
  it("holds at the footer for 1 second", () => {
    expect(planScroll({ pageHeightPx: 6200, viewportHeightPx: 1080, sectionTops: [], settings }).at(-1)).toEqual({ kind: "hold", at: 5120, seconds: 1 });
  });
  it("estimates the typical normal recording including both holds", () => {
    expect(estimateDurationSeconds({ pageHeightPx: 6200, viewportHeightPx: 1080, sections: 6, settings })).toBe(12.7);
  });
  it("keeps selected scroll speeds", () => {
    const plan = (scrollSpeed: "slow" | "normal" | "fast") => planScroll({ pageHeightPx: 6080, viewportHeightPx: 1080, sectionTops: [], settings: { ...settings, scrollSpeed } })[1];
    expect(plan("slow")).toEqual({ kind: "scroll", from: 0, to: 5000, seconds: 20 });
    expect(plan("normal")).toEqual({ kind: "scroll", from: 0, to: 5000, seconds: 10 });
    expect(plan("fast")).toEqual({ kind: "scroll", from: 0, to: 5000, seconds: 5.556 });
  });
  it("retains the 20,000px infinite-feed safety cap", () => {
    expect(planScroll({ pageHeightPx: 90000, viewportHeightPx: 1080, sectionTops: [], settings }).at(-1)).toEqual({ kind: "hold", at: 20000, seconds: 1 });
  });
  it("holds a one-screen page without scrolling", () => {
    const steps = planScroll({ pageHeightPx: 800, viewportHeightPx: 1080, sectionTops: [], settings });
    expect(steps).toEqual([{ kind: "hold", at: 0, seconds: 1.5 }, { kind: "hold", at: 0, seconds: 1 }]);
    expect(planDurationSeconds(steps)).toBe(2.5);
  });
});

describe("render progress", () => {
  it("maps each phase onto the overall progress bar", () => {
    expect(progressFor("launch", 0)).toBe(0);
    expect(progressFor("encode", 1)).toBeCloseTo(1, 5);
    expect(progressFor("scroll", 0)).toBeCloseTo(0.48, 5);
  });
});

describe("active recordings", () => {
  it("allows 3 recordings waiting or rendering per person", () => {
    expect(MAX_ACTIVE_JOBS).toBe(3);
  });
});
