// Helpers injected into the recorded page (runs inside Chromium, plain JS).
// Installed once after load as window.__dw; Node calls them via page.evaluate.

const COOKIE_SELECTORS = [
  "#onetrust-banner-sdk",
  "#onetrust-consent-sdk",
  "#CybotCookiebotDialog",
  "#CybotCookiebotDialogBodyUnderlay",
  "#usercentrics-root",
  "#cookie-banner",
  "#cookie-notice",
  "#cookieConsent",
  "#cookie-law-info-bar",
  ".cookie-banner",
  ".cookie-notice",
  ".cookie-consent",
  ".cc-window",
  ".cc-banner",
  ".qc-cmp2-container",
  ".osano-cm-window",
  ".truste_box_overlay",
  ".fc-consent-root",
  "[aria-label*='cookie' i][role='dialog']",
  "[class*='CookieBanner']",
  "[id*='cookie-consent' i]",
].join(",");

export const PAGE_HELPERS = String.raw`
(() => {
  if (window.__dw) return;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
  const isDoc = (el) => el === document.scrollingElement || el === document.documentElement || el === document.body;

  function findScroller() {
    const se = document.scrollingElement || document.documentElement;
    if (se.scrollHeight > innerHeight + 4) return se;
    let best = null;
    let bestH = 0;
    for (const el of document.querySelectorAll("body *")) {
      if (el.clientHeight < innerHeight * 0.6) continue;
      const oy = getComputedStyle(el).overflowY;
      if (oy !== "auto" && oy !== "scroll") continue;
      const h = el.scrollHeight - el.clientHeight;
      if (h > bestH) { best = el; bestH = h; }
    }
    return best || se;
  }

  function fixedHeaderHeight() {
    let h = 0;
    for (const el of document.elementsFromPoint(innerWidth / 2, 4)) {
      let node = el;
      while (node && node !== document.body) {
        const cs = getComputedStyle(node);
        if (cs.position === "fixed" || cs.position === "sticky") {
          const r = node.getBoundingClientRect();
          if (r.top <= 8 && r.height < innerHeight * 0.3) h = Math.max(h, r.bottom);
          break;
        }
        node = node.parentElement;
      }
    }
    return Math.round(h);
  }

  // Catch-all for consent banners the known selectors miss: any fixed/sticky
  // box whose text talks about cookies or consent (works in most languages).
  const CONSENT_RE = /cookie|consent|gdpr|rgpd|dsgvo|datenschutz/i;
  function hideConsent() {
    let hidden = 0;
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const text = (el.innerText || "").slice(0, 2000);
      if (!text || text.length > 1500 || !CONSENT_RE.test(text)) continue;
      el.style.setProperty("display", "none", "important");
      hidden++;
    }
    return hidden;
  }

  const api = {
    hideConsent,
    el: null,
    scroller() { return this.el || (this.el = findScroller()); },
    pos() { const s = this.scroller(); return isDoc(s) ? scrollY : s.scrollTop; },
    max() {
      const s = this.scroller();
      if (isDoc(s)) {
        const h = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
        return Math.max(0, h - innerHeight);
      }
      return Math.max(0, s.scrollHeight - s.clientHeight);
    },
    to(y) {
      const s = this.scroller();
      if (isDoc(s)) window.scrollTo(0, y); else s.scrollTop = y;
    },
    prepare() {
      const st = document.createElement("style");
      st.setAttribute("data-dw", "");
      st.textContent =
        "html,body,*{scroll-behavior:auto!important}" +
        "html{scrollbar-width:none!important}" +
        "::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}" +
        ${JSON.stringify(COOKIE_SELECTORS)} + "{display:none!important;visibility:hidden!important}";
      (document.head || document.documentElement).appendChild(st);
      // Consent popups often lock scrolling; undo it once they're hidden.
      for (const el of [document.documentElement, document.body]) {
        if (el && getComputedStyle(el).overflowY === "hidden") el.style.setProperty("overflow-y", "visible", "important");
      }
      for (const v of document.querySelectorAll("video")) {
        v.muted = true;
        try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch {}
      }
      hideConsent();
      this.el = findScroller();
    },
    async prescan(o) {
      const t0 = performance.now();
      let y = 0;
      for (;;) {
        const max = Math.min(o.maxScroll, this.max());
        if (y >= max || performance.now() - t0 > o.maxMs) break;
        y = Math.min(max, y + o.stepPx);
        this.to(y);
        if (window.__dwReport) window.__dwReport(max ? y / max : 1);
        await sleep(o.delayMs);
      }
      await sleep(400);
      return y;
    },
    async eagerMedia(ms) {
      for (const el of document.querySelectorAll("img[loading='lazy'],iframe[loading='lazy']")) el.loading = "eager";
      const pending = [...document.images].filter((i) => !i.complete);
      await Promise.race([
        Promise.allSettled(pending.map((i) => (i.decode ? i.decode() : Promise.resolve()))),
        sleep(ms),
      ]);
    },
    async toTop() { this.to(0); await raf(); this.to(0); await sleep(50); },
    measure() {
      this.el = findScroller();
      const s = this.el;
      const doc = isDoc(s);
      const cur = this.pos();
      const offset = doc ? 0 : s.getBoundingClientRect().top;
      const header = fixedHeaderHeight();
      const root = doc ? document.body : s;
      const sel = "section, header, footer, article, main > *, [class*='section' i], [id*='section' i], body > div > div, body > div > main > *";
      const tops = [];
      for (const el of root.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.height < innerHeight * 0.3 || r.width < innerWidth * 0.5) continue;
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.position === "sticky" || cs.display === "none" || cs.visibility === "hidden") continue;
        tops.push(Math.round(r.top - offset + cur - header));
        if (tops.length >= 400) break;
      }
      return { pageHeight: this.max() + innerHeight, viewportHeight: innerHeight, sectionTops: tops };
    },
    async runPlan(steps) {
      const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
      hideConsent(); // banners that only appeared during the pre-scroll
      this.to(0);
      for (const s of steps) {
        const start = performance.now();
        const dur = Math.max(1, s.seconds * 1000);
        if (s.kind === "hold") {
          this.to(s.at);
          while (performance.now() - start < dur) await raf();
          continue;
        }
        for (;;) {
          const t = Math.min(1, (performance.now() - start) / dur);
          this.to(s.from + (s.to - s.from) * ease(t));
          if (t >= 1) break;
          await raf();
        }
      }
    },
  };
  window.__dw = api;
})();
`;
