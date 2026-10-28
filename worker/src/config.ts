import os from "node:os";

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a positive number`);
  return Math.floor(n);
}

export const config = {
  /** Published app address, e.g. https://project--<id>.lovable.app */
  appUrl: (process.env["APP_URL"] ?? "").replace(/\/+$/, ""),
  /** Shared secret — must equal WORKER_TOKEN saved in the app. */
  token: process.env["WORKER_TOKEN"] ?? "",
  workerId: process.env["WORKER_ID"] || `${os.hostname()}-${process.pid}`,
  /** Recordings run at the same time on this machine (1 per ~2 vCPU / 2 GB). */
  concurrency: Math.max(1, int("WORKER_CONCURRENCY", 1)),
  pollMs: int("POLL_INTERVAL_MS", 3000),
  jobTimeoutMs: int("JOB_TIMEOUT_MS", 8 * 60_000),
  navTimeoutMs: int("NAV_TIMEOUT_MS", 30_000),
  port: int("PORT", 8080),
  /** Set RECORDER_GPU=1 on machines with a GPU for hardware-accelerated rendering. */
  gpu: process.env["RECORDER_GPU"] === "1",
  /** Optional custom Chromium binary (local testing). */
  chromiumPath: process.env["CHROMIUM_PATH"] || undefined,
  x264Preset: process.env["X264_PRESET"] || "faster",
  crf: int("X264_CRF", 18),
  workDir: process.env["WORK_DIR"] || os.tmpdir(),
};

export function assertServiceConfig(): void {
  const missing = [!config.appUrl && "APP_URL", !config.token && "WORKER_TOKEN"].filter(Boolean);
  if (missing.length) throw new Error(`Missing environment variable(s): ${missing.join(", ")}`);
  if (!/^https?:\/\//.test(config.appUrl)) throw new Error("APP_URL must start with https://");
}
