// Laptop lockup: places a still from a finished recording inside a clean
// MacBook-style frame on a plain white background, ready for mockups.
// Client-side only — reads the finished MP4 from its signed storage link.

export function laptopFrameFileName(job: { host: string }): string {
  const slug = job.host.replace(/[^a-z0-9.-]+/gi, "-");
  return `deewhy-${slug}-laptop-frame.png`;
}

/** Pull one clean frame out of the video as a JPEG data URL. */
async function grabStill(videoUrl: string, atSeconds: number): Promise<string> {
  const fail = () => new Error("Couldn't read the video to build the laptop frame. Try the MP4 download instead.");
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(fail());
    video.src = videoUrl;
  });
  const max = Math.max(0.1, (video.duration || 1) - 0.1);
  await new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = reject;
    video.currentTime = Math.min(Math.max(0.1, atSeconds), max);
  });
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw fail();
  ctx.drawImage(video, 0, 0, 1920, 1080);
  video.removeAttribute("src");
  video.load();
  let data: string;
  try {
    data = canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    throw fail();
  }
  if (data.length < 100) throw fail();
  return data;
}

/** Composites the still into a laptop lockup PNG on a white background. */
export async function renderLaptopFramePng(videoUrl: string, atSeconds = 2.6): Promise<Blob> {
  const still = await grabStill(videoUrl, atSeconds);

  const W = 2320;
  const H = 1560;
  const screenW = 1920;
  const screenH = 1080;
  const bezel = 26;
  const lapW = screenW + bezel * 2;
  const lapH = screenH + bezel * 2;
  const x = (W - lapW) / 2;
  const y = 100;
  const ix = x + bezel;
  const iy = y + bezel;
  const baseH = 54;
  const baseW = lapW + 280;
  const baseX = (W - baseW) / 2;
  const baseY = y + lapH;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>` +
    `<clipPath id="scr"><rect x="${ix}" y="${iy}" width="${screenW}" height="${screenH}" rx="12"/></clipPath>` +
    `<linearGradient id="base" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#eceef2"/><stop offset="0.45" stop-color="#d4d7dc"/><stop offset="1" stop-color="#b3b8c0"/>` +
    `</linearGradient>` +
    `<filter id="sh" x="-10%" y="-8%" width="120%" height="126%">` +
    `<feDropShadow dx="0" dy="22" stdDeviation="28" flood-color="#0b1220" flood-opacity="0.16"/>` +
    `</filter>` +
    `</defs>` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    `<g filter="url(#sh)">` +
    `<rect x="${x}" y="${y}" width="${lapW}" height="${lapH}" rx="36" fill="#15181d"/>` +
    `<g clip-path="url(#scr)">` +
    `<image href="${still}" x="${ix}" y="${iy}" width="${screenW}" height="${screenH}" preserveAspectRatio="xMidYMid slice"/>` +
    `</g>` +
    `<rect x="${baseX}" y="${baseY}" width="${baseW}" height="${baseH}" rx="16" fill="url(#base)"/>` +
    `<rect x="${baseX + 10}" y="${baseY + 3}" width="${baseW - 20}" height="4" rx="2" fill="#9ba0a8"/>` +
    `<rect x="${W / 2 - 170}" y="${baseY}" width="340" height="15" rx="7" fill="#a9aeb6"/>` +
    `</g>` +
    `</svg>`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () =>
      reject(new Error("Couldn't draw the laptop frame. Try the MP4 download instead."));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't draw the laptop frame. Try the MP4 download instead.");
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't save the laptop frame. Try the MP4 download instead.");
  return blob;
}
