import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Scroll-scrub progress for a tall wrapper element: 0 while its top is at the
 * viewport top, 1 when its bottom reaches the viewport bottom. Drives pinned
 * scenes; updates on rAF so scroll handlers stay cheap.
 */
export function useScrollProgress(): { ref: RefObject<HTMLDivElement | null>; progress: number } {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      setProgress(p);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { ref, progress };
}

/** Ease-out cubic, for counters and scrubbed motion that should decelerate. */
export function easeOut(p: number): number {
  const x = Math.min(1, Math.max(0, p));
  return 1 - Math.pow(1 - x, 3);
}

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
