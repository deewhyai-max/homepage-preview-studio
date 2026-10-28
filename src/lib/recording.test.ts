import { describe, expect, it } from "vitest";

import {
  MAX_ACTIVE_JOBS,
  OUTPUT_SIZE,
  clampPause,
  estimateDurationSeconds,
  normalizeStops,
  planDurationSeconds,
  planScroll,
  progressFor,
  toHomepageUrl,
} from "./recording";

describe("section pauses", () => {
  it("never goes below 2 seconds", () => {
    expect(clampPause(1)).toBe(2);
  });
  it("never goes above 3 seconds", () => {
    expect(clampPause(5)).toBe(3);
  });
  it("keeps values inside the 2–3 second range", () => {
    expect(clampPause(2.5)).toBe(2.5);
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

describe("video length estimate", () => {
  it("adds hero hold, scroll travel and one pause per section", () => {
    // 2.5s hero + (2900-900)/500 = 4s scroll + 4 × 2s pauses = 14.5s
    expect(
      estimateDurationSeconds({
        pageHeightPx: 2900,
        viewportHeightPx: 900,
        sections: 4,
        settings: { scrollSpeed: "normal", pauseSeconds: 2 },
      }),
    ).toBe(14.5);
  });
});

describe("scroll choreography", () => {
  const settings = { scrollSpeed: "normal" as const, pauseSeconds: 2 };

  it("holds the hero first, then pauses at each section and ends at the bottom", () => {
    const steps = planScroll({ pageHeightPx: 3900, viewportHeightPx: 900, sectionTops: [0, 1000, 2000], settings });
    expect(steps).toEqual([
      { kind: "hold", at: 0, seconds: 2.5 },
      { kind: "scroll", from: 0, to: 1000, seconds: 2 },
      { kind: "hold", at: 1000, seconds: 2 },
      { kind: "scroll", from: 1000, to: 2000, seconds: 2 },
      { kind: "hold", at: 2000, seconds: 2 },
      { kind: "scroll", from: 2000, to: 3000, seconds: 2 },
      { kind: "hold", at: 3000, seconds: 2 },
    ]);
    expect(planDurationSeconds(steps)).toBe(14.5);
  });

  it("uses the chosen pause, kept inside 2–3 seconds", () => {
    const steps = planScroll({
      pageHeightPx: 2000,
      viewportHeightPx: 900,
      sectionTops: [],
      settings: { scrollSpeed: "fast", pauseSeconds: 9 },
    });
    expect(steps.filter((s) => s.kind === "hold").slice(1).every((s) => s.seconds === 3)).toBe(true);
  });

  it("merges sections that are closer than 60% of a screen", () => {
    expect(normalizeStops({ sectionTops: [1000, 1200, 2500], maxScroll: 4000, viewportHeightPx: 1000 })).toEqual([
      1000, 2500, 4000,
    ]);
  });

  it("never pauses more than 8 times on long pages", () => {
    const tops = Array.from({ length: 30 }, (_, i) => (i + 1) * 1000);
    expect(normalizeStops({ sectionTops: tops, maxScroll: 30_000, viewportHeightPx: 900 }).length).toBe(8);
  });

  it("stops recording after 20,000px of scrolling", () => {
    const steps = planScroll({ pageHeightPx: 90_000, viewportHeightPx: 900, sectionTops: [], settings });
    const last = steps[steps.length - 1];
    expect(last).toEqual({ kind: "hold", at: 20_000, seconds: 2 });
  });

  it("a page that fits on one screen only holds the hero", () => {
    expect(planScroll({ pageHeightPx: 800, viewportHeightPx: 900, sectionTops: [], settings })).toEqual([
      { kind: "hold", at: 0, seconds: 2.5 },
    ]);
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
