"use client";

import { useEffect, useRef } from "react";

/**
 * The dashboard, tipped back in perspective, settling flat as the section scrolls into view.
 * The screenshot is the real app on the sample company, captured from a running build.
 *
 * Progress is written to a CSS variable rather than React state, so scrolling never
 * re-renders the tree; the transform is computed in CSS from --p.
 */
export default function ProductReveal() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--p", "1");
      return;
    }
    // The landing page scrolls inside .lp, not the window.
    const scroller: Element | Window = el.closest(".lp") ?? window;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const h = window.innerHeight;
      // 0 when the section's top enters the bottom of the screen, 1 once it reaches 15% from the top
      const p = Math.min(1, Math.max(0, (h - r.top) / (h * 0.85)));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section className="lp-reveal" ref={ref} aria-labelledby="reveal-title">
      <div className="lp-wrap lp-reveal-head">
        <p className="lp-pill-eyebrow"><span>Office view</span> The whole company on one screen</p>
        <h2 id="reveal-title" className="lp-reveal-h2">
          Every crew, every job,
          <br />
          <span className="lp-grad-text">live from the site.</span>
        </h2>
      </div>

      <div className="lp-reveal-stage">
        <div className="lp-reveal-glow" aria-hidden />
        <div className="lp-reveal-frame">
          <div className="lp-reveal-bar" aria-hidden>
            <i /><i /><i />
            <span>getconstra.com/dashboard</span>
          </div>
          <img
            src="/site/app-desktop.webp"
            width={2880}
            height={1800}
            alt="The Constra dashboard: four workers on site, 129 hours logged this week, three active projects, $28K collected and one overdue invoice flagged, with live crew cards below."
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
