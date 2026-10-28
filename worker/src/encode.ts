import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";

import { OUTPUT_FPS, OUTPUT_SIZE, type OutputFormat } from "../../src/lib/recording.ts";
import { config } from "./config.ts";

export interface TimedFrame {
  file: string;
  /** Seconds this frame stays on screen. */
  duration: number;
}

/** Write an ffconcat list: each captured frame with how long it was on screen. */
export async function writeConcatList(listPath: string, frames: TimedFrame[]): Promise<void> {
  const quote = (p: string) => `'${p.replace(/'/g, "'\\''")}'`;
  const lines = ["ffconcat version 1.0"];
  for (const f of frames) {
    lines.push(`file ${quote(f.file)}`);
    lines.push(`duration ${f.duration.toFixed(6)}`);
  }
  const last = frames[frames.length - 1];
  if (last) lines.push(`file ${quote(last.file)}`); // concat demuxer needs the last file repeated
  await fs.writeFile(listPath, lines.join("\n") + "\n");
}

/**
 * The page is fitted into the output frame; any leftover space is filled with
 * a soft, darkened blur of the same footage (looks native on Reels/TikTok).
 */
export function filterGraph(format: OutputFormat): string {
  const { width: W, height: H } = OUTPUT_SIZE[format];
  const w4 = Math.round(W / 4);
  const h4 = Math.round(H / 4);
  return [
    `[0:v]fps=${OUTPUT_FPS},setsar=1,split=2[a][b]`,
    `[a]scale=${w4}:${h4}:force_original_aspect_ratio=increase,crop=${w4}:${h4},boxblur=18:2,scale=${W}:${H},eq=brightness=-0.12:saturation=1.1[bg]`,
    `[b]scale=${W}:${H}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,setsar=1[fg]`,
    `[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]`,
  ].join(";");
}

/** Encode to an H.264/AAC MP4 that TikTok, Instagram and YouTube accept. */
export function encodeMp4(opts: {
  listPath: string;
  outPath: string;
  format: OutputFormat;
  durationSeconds: number;
  onProgress: (local: number) => void;
  signal: AbortSignal;
}): Promise<void> {
  const args = [
    "-y", "-hide_banner", "-loglevel", "error", "-nostats", "-progress", "pipe:1",
    "-f", "concat", "-safe", "0", "-i", opts.listPath,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-filter_complex", filterGraph(opts.format),
    "-map", "[v]", "-map", "1:a",
    "-t", opts.durationSeconds.toFixed(3),
    "-c:v", "libx264", "-preset", config.x264Preset, "-crf", String(config.crf),
    "-profile:v", "high", "-level:v", "4.2", "-pix_fmt", "yuv420p",
    "-r", String(OUTPUT_FPS), "-g", String(OUTPUT_FPS * 2),
    "-maxrate", "16M", "-bufsize", "32M",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    opts.outPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    const onAbort = () => proc.kill("SIGKILL");
    opts.signal.addEventListener("abort", onAbort, { once: true });

    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk: string) => {
      const m = /out_time_us=(\d+)/.exec(chunk);
      if (m?.[1]) opts.onProgress(Math.min(1, Number(m[1]) / 1e6 / opts.durationSeconds));
    });
    proc.stderr.setEncoding("utf8");
    proc.stderr.on("data", (c: string) => {
      stderr = (stderr + c).slice(-4000);
    });
    proc.on("error", (err) => {
      opts.signal.removeEventListener("abort", onAbort);
      reject(new Error(`ffmpeg could not start: ${err.message}`));
    });
    proc.on("close", (code) => {
      opts.signal.removeEventListener("abort", onAbort);
      if (opts.signal.aborted) return reject(opts.signal.reason);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with ${code}: ${stderr.trim()}`));
    });
  });
}
