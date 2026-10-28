# Roadmap

- [x] Real render jobs saved in the database (studio queue reads/writes them live)
- [x] Worker API endpoints the recorder calls (claim, progress, upload, complete, fail)
- [x] Self-hosted recorder worker (Playwright + FFmpeg, Docker) in `worker/`
- [x] Download + in-app playback of finished MP4s
- [x] Shared worker token secret
- [ ] Deploy worker to Railway/Render (user's hosting account)
- [ ] Ads (later — user will decide network)
