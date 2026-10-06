"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SiteScene from "./site-scene";

/**
 * The landing shot: a full-bleed job site under a cinematic grade, with the headline over it.
 *
 * The scene is a real-time render, so it is stylised rather than photoreal — an offline
 * renderer spends minutes on a frame that this has 16ms for. What carries the look is the
 * grade, the slow camera and the scrims, not polygon count.
 */
export default function HeroScene({ startHref, startLabel }: { startHref: string; startLabel: string }) {
  const ref = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  // Only run while the shot is actually on screen, and never against a reduced-motion setting.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const io = new IntersectionObserver(
      (entries) => setPlaying(entries.some((e) => e.isIntersecting) && !reduced.matches),
      { threshold: 0.05 },
    );
    io.observe(el);
    const onChange = () => setPlaying(!reduced.matches);
    reduced.addEventListener("change", onChange);
    return () => { io.disconnect(); reduced.removeEventListener("change", onChange); };
  }, []);

  return (
    <section className="lp-cine" ref={ref} aria-labelledby="cine-title">
      <div className="lp-cine-scene" aria-hidden>
        <SiteScene
          playing={playing}
          initialProgress={0.42}
          reveal={1}
          cinematic
          onReady={(ok) => setReady(ok)}
        />
      </div>

      {/* Scrims: the type has to hold over a moving image at any frame. */}
      <div className="lp-cine-scrim" aria-hidden />

      <div className="lp-cine-copy">
        <p className="lp-cine-eyebrow">GPS-verified · Built for the field</p>
        <h1 id="cine-title" className="lp-cine-h1">Run the job.</h1>
        <p className="lp-cine-sub">
          Timesheets, daily reports and invoices
          <br />
          from the phones your crew already carries.
        </p>

        <div className="lp-cine-ctas">
          <Link href={startHref} className="lp-cine-pill">
            {startLabel}
            <span className="lp-cine-pill-go"><ArrowRight size={15} aria-hidden /></span>
          </Link>
          <a href="#day" className="lp-cine-ghost">
            See a day on site <ArrowRight size={14} aria-hidden />
          </a>
        </div>
      </div>

      <div className={`lp-cine-cue${ready ? " is-on" : ""}`} aria-hidden>
        <span />
      </div>
    </section>
  );
}
