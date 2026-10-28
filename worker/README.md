# Deewhy HQ Preview Recorder

Self-hosted worker that turns queued Studio jobs into real MP4s (Playwright Chromium + FFmpeg).
It talks only to the app's `/api/public/worker/*` endpoints using `WORKER_TOKEN` — no database keys.

## Deploy (Railway / Render / Fly.io)
1. Build from the **project root**: `docker build -f worker/Dockerfile -t deewhy-recorder .`
2. Environment variables:
   - `APP_URL` — your published app address, e.g. `https://yourapp.lovable.app`
   - `WORKER_TOKEN` — same value as the app's `WORKER_TOKEN` secret
   - optional: `WORKER_CONCURRENCY` (1 per ~2 vCPU / 2 GB RAM), `RECORDER_GPU=1` on GPU machines
3. Health check: `GET /` on `PORT` (8080).
Recommended size: 2 vCPU, 2–4 GB RAM.

## Local test (no app needed)
```
cd worker && npm install
npm run record -- https://stripe.com out.mp4 --vertical --mobile --speed normal --pause 2.5
```
