import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";

import { AppApi, type ClaimedJob } from "./api.ts";
import { assertServiceConfig, config } from "./config.ts";
import { CancelledError, JobError, ShutdownError, toJobError } from "./errors.ts";
import { errInfo, log } from "./log.ts";
import { recordHomepage } from "./recorder.ts";

assertServiceConfig();
const api = new AppApi(config.appUrl, config.token, config.workerId);
const shutdown = new AbortController();
const running = new Map<string, AbortController>();
let lastPollOk = Date.now();

const sleep = (ms: number) =>
  new Promise<void>((r) => {
    const t = setTimeout(r, ms);
    shutdown.signal.addEventListener("abort", () => (clearTimeout(t), r()), { once: true });
  });

async function process_(job: ClaimedJob): Promise<void> {
  const ctl = new AbortController();
  running.set(job.id, ctl);
  const timer = setTimeout(() => ctl.abort(new JobError("The recording took too long and was stopped.", false)), config.jobTimeoutMs);
  const onShutdown = () => ctl.abort(new ShutdownError());
  shutdown.signal.addEventListener("abort", onShutdown, { once: true });
  const outPath = path.join(config.workDir, `${job.id}.mp4`);
  let lastSent = 0;
  log.info("job start", { jobId: job.id, url: job.url, attempt: job.attempt });
  try {
    const result = await recordHomepage({
      url: job.url,
      scrollSpeed: job.scrollSpeed,
      pauseSeconds: job.pauseSeconds,
      viewport: job.viewport,
      format: job.format,
      outPath,
      signal: ctl.signal,
      onProgress: (phase, overall) => {
        if (Date.now() - lastSent < 1500) return;
        lastSent = Date.now();
        api
          .progress(job.id, phase, overall)
          .then((r) => r.cancelled && ctl.abort(new CancelledError()))
          .catch((e) => log.warn("progress failed", errInfo(e)));
      },
    });
    const up = await api.uploadUrl(job.id);
    if (up.cancelled || !up.signedUrl) throw new CancelledError();
    await api.upload(up.signedUrl, outPath);
    await api.complete(job.id, result.durationSeconds, result.fileSizeBytes);
    log.info("job done", { jobId: job.id, ...result });
  } catch (err) {
    const reason = ctl.signal.aborted ? ctl.signal.reason : err;
    if (reason instanceof CancelledError) log.info("job cancelled", { jobId: job.id });
    else if (reason instanceof ShutdownError) await api.fail(job.id, "Recorder restarted", true);
    else {
      const je = toJobError(reason);
      log.error("job failed", { jobId: job.id, msg: je.userMessage, ...errInfo(je.cause ?? reason) });
      await api.fail(job.id, je.userMessage, je.retryable);
    }
  } finally {
    clearTimeout(timer);
    shutdown.signal.removeEventListener("abort", onShutdown);
    running.delete(job.id);
    await fs.rm(outPath, { force: true }).catch(() => {});
  }
}

async function loop(): Promise<void> {
  log.info("worker started", { workerId: config.workerId, concurrency: config.concurrency, app: config.appUrl, gpu: config.gpu });
  while (!shutdown.signal.aborted) {
    if (running.size >= config.concurrency) {
      await sleep(500);
      continue;
    }
    try {
      const job = await api.claim();
      lastPollOk = Date.now();
      if (job) {
        void process_(job);
        continue;
      }
    } catch (err) {
      log.error("claim failed", errInfo(err));
    }
    await sleep(config.pollMs);
  }
}

// Health check for Railway / Render / Fly.
http
  .createServer((_req, res) => {
    const healthy = Date.now() - lastPollOk < 120_000;
    res.writeHead(healthy ? 200 : 503, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: healthy, running: running.size }));
  })
  .listen(config.port, () => log.info("health server", { port: config.port }));

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    if (shutdown.signal.aborted) process.exit(1);
    log.info("shutting down", { running: running.size });
    shutdown.abort();
    const deadline = Date.now() + 15_000;
    while (running.size && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
    process.exit(0);
  });
}

void loop();
