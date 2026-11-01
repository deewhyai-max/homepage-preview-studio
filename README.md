# Homepage Preview Studio

Yeah the interactive design Brooo 😂🔥 now we have a clear MVP for Deewhy HQ Preview Studio.
The homepage-only recording workflow
1. Enter a website URL
Paste a public website link. The cloud browser loads its homepage and waits for the hero animations to settle.
2. Record the homepage
Hold the hero briefly, scroll smoothly through each section, and pause 2–3 seconds to capture animations and 3D effects.
3. Export the video
Render the recording as MP4 in vertical 9:16 or widescreen 16:9, then let the customer download it.
MVP settings
Page scope: Homepage only; no navigating to other pages.
Scroll speed: Slow, normal, or fast.
Section pauses: 2–3 seconds, configurable.
Viewport: Desktop or mobile.
Output: Downloadable MP4.
Rendering: Real browser capture, with graphics acceleration where supported.
Status: Queued → Rendering → Completed or Failed.
One technical detail worth getting right: some websites load sections only as you scroll. The recorder should progressively scroll through the page before finalizing the capture, so lazy-loaded images and animations have a chance to appear.
My recommendation: build the interactive UI prototype first, then implement the browser-rendering backend separately. That keeps the design work manageable while making sure the final product generates actual videos, not simulated previews.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3e957ec4-053a-475a-a9d7-efe1899e6dbd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
