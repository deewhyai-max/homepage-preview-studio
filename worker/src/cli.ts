// Local test: npm run record -- https://example.org out.mp4 [--mobile] [--vertical] [--speed fast] [--pause 2]
import path from "node:path";

import { DEFAULT_SETTINGS, toHomepageUrl, type ScrollSpeed } from "../../src/lib/recording.ts";
import { toJobError } from "./errors.ts";
import { recordHomepage } from "./recorder.ts";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.match(/^--(speed|pause)$/));
const check = toHomepageUrl(positional[0] ?? "");
if (!check.ok) {
  console.error(check.reason);
  process.exit(1);
}
const out = path.resolve(positional[1] ?? "recording.mp4");
const t0 = Date.now();
try {
  const r = await recordHomepage({
    url: check.homepage,
    scrollSpeed: (opt("speed") as ScrollSpeed) ?? "normal",
    pauseSeconds: DEFAULT_SETTINGS.pauseSeconds,
    viewport: flag("mobile") ? "mobile" : "desktop",
    format: flag("vertical") ? "9:16" : "16:9",
    outPath: out,
    signal: new AbortController().signal,
    onProgress: (phase, p) => process.stdout.write(`\r${phase.padEnd(8)} ${(p * 100).toFixed(0).padStart(3)}%`),
  });
  console.log(`\nSaved ${out} — ${r.durationSeconds.toFixed(1)}s, ${(r.fileSizeBytes / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
} catch (err) {
  const e = toJobError(err);
  console.error("\nFailed:", e.userMessage, "\n", e.cause ?? err);
  process.exit(1);
}
