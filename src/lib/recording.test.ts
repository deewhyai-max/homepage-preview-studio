import { describe, expect, it } from "vitest";

import {
  OUTPUT_SIZE,
  clampPause,
  estimateDurationSeconds,
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
