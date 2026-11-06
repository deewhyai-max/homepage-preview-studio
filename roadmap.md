# Roadmap

- [x] Real render jobs saved in the database (studio queue reads/writes them live)
- [x] Worker API endpoints the recorder calls (claim, progress, upload, complete, fail)
- [x] Self-hosted recorder worker (Playwright + FFmpeg, Docker) in `worker/`
- [x] Download + in-app playback of finished MP4s
- [x] Shared worker token secret
- [x] Deploy worker to Google Cloud Run (user completed deployment)
- [x] Native 1920×1080 desktop capture and continuous standard scroll
- [x] Public Terms of Service and Privacy Policy pages with navigation links
- [ ] Redeploy updated worker on Google Cloud Run (user's hosting account)
- [ ] Ads (later — user will decide network)
