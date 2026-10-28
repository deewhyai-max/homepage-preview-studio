import { promises as fs } from "node:fs";

import type { OutputFormat, PhaseKey, ScrollSpeed, Viewport } from "../../src/lib/recording.ts";
import { log } from "./log.ts";

export interface ClaimedJob {
  id: string;
  userId: string;
  url: string;
  scrollSpeed: ScrollSpeed;
  pauseSeconds: number;
  viewport: Viewport;
  format: OutputFormat;
  attempt: number;
}

class HttpError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`HTTP ${status}: ${body.slice(0, 300)}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Talks to the app's /api/public/worker/* endpoints with the shared token. */
export class AppApi {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly workerId: string,
  ) {}

  private async post<T>(action: string, body: Record<string, unknown>, tries = 4): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < tries; i++) {
      try {
        const res = await fetch(`${this.baseUrl}/api/public/worker/${action}`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` },
          body: JSON.stringify({ workerId: this.workerId, ...body }),
          signal: AbortSignal.timeout(20_000),
        });
        const text = await res.text();
        if (res.status === 409) return JSON.parse(text) as T; // job gone / reassigned
        if (res.status === 401) throw new HttpError(401, "WORKER_TOKEN does not match the app");
        if (!res.ok) throw new HttpError(res.status, text);
        return JSON.parse(text) as T;
      } catch (err) {
        lastErr = err;
        if (err instanceof HttpError && err.status < 500) throw err;
        await sleep(500 * 2 ** i);
      }
    }
    throw lastErr;
  }

  async claim(): Promise<ClaimedJob | null> {
    const r = await this.post<{ job: ClaimedJob | null }>("claim", {}, 2);
    return r.job;
  }

  async progress(jobId: string, phase: PhaseKey, progress: number): Promise<{ cancelled: boolean }> {
    return this.post("progress", { jobId, phase, progress }, 2);
  }

  async uploadUrl(jobId: string): Promise<{ signedUrl?: string; path?: string; cancelled?: boolean }> {
    return this.post("upload-url", { jobId });
  }

  async complete(jobId: string, durationSeconds: number, fileSizeBytes: number): Promise<void> {
    await this.post("complete", { jobId, durationSeconds, fileSizeBytes });
  }

  async fail(jobId: string, error: string, retryable: boolean): Promise<void> {
    try {
      await this.post("fail", { jobId, error: error.slice(0, 480), retryable });
    } catch (err) {
      log.error("could not report failure", { jobId, error: String(err) });
    }
  }

  /** Upload straight to storage with the one-time signed URL. */
  async upload(signedUrl: string, filePath: string): Promise<void> {
    const body = await fs.readFile(filePath);
    for (let i = 0; i < 3; i++) {
      const res = await fetch(signedUrl, {
        method: "PUT",
        headers: { "content-type": "video/mp4", "x-upsert": "true", "cache-control": "max-age=3600" },
        body,
        signal: AbortSignal.timeout(5 * 60_000),
      }).catch((e: unknown) => e as Error);
      if (!(res instanceof Error) && res.ok) return;
      const detail = res instanceof Error ? res.message : `${res.status} ${await res.text()}`;
      log.warn("upload attempt failed", { attempt: i + 1, detail: detail.slice(0, 300) });
      await sleep(1000 * 2 ** i);
    }
    throw new Error("Upload to storage failed after 3 attempts");
  }
}
