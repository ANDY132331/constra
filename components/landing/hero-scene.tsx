"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SiteScene from "./site-scene";

/**
 * The landing shot: a full-bleed job site under a cinematic grade, with the headline over it.
 *
 * The shot is a pre-rendered loop rather than a live canvas. Rendering it offline meant each
 * frame could be drawn deliberately and then graded, which looks better than the same scene
 * racing a 16ms budget — and the visitor's phone plays a 2MB video instead of running WebGL,
 * which matters when the buyer is on an old Android in a truck. It is still a render, not
 * footage of a real site.
 *
 * The live scene stays as the fallback for anyone whose browser will not play the video.
 */
const LOOP_SRC = "/site/hero-loop.webm";

export default function HeroScene({ startHref, startLabel }: { startHref: string; startLabel: string }) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  // Until the loop proves it can play, we do not know whether the fallback is needed.
  const [videoOk, setVideoOk] = useState<boolean | null>(null);

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

  // Don't spend a phone's battery decoding video that is scrolled past, and hold the first
  // frame rather than looping for anyone who asked for less motion.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) void v.play().catch(() => {});
    else v.pause();
  }, [playing, videoOk]);

  return (
    <section className="lp-cine" ref={ref} aria-labelledby="cine-title">
      <div className="lp-cine-scene" aria-hidden>
        {videoOk !== false && (
          <video
            ref={videoRef}
            className="lp-cine-video"
            src={LOOP_SRC}
            poster="/site/hero-loop-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            // A still frame of the same shot is a fine outcome; a broken box is not.
            onPlaying={() => { setVideoOk(true); setReady(true); }}
            onError={() => setVideoOk(false)}
          />
        )}
        {videoOk === false && (
          <SiteScene
            playing={playing}
            initialProgress={0.42}
            reveal={1}
            cinematic
            onReady={(ok) => setReady(ok)}
          />
        )}
      </div>

      {/* Scrims: the type has to hold over a moving image at any frame. */}
      <div className="lp-cine-scrim" aria-hidden />

      <div className="lp-cine-copy">
        <a href="#features" className="lp-announce">
          <span className="lp-announce-tag">Offline</span>
          Clock-ins work with no signal
          <ArrowRight size={13} aria-hidden />
        </a>
        <h1 id="cine-title" className="lp-cine-h1">Run the job.</h1>
        <p className="lp-cine-sub">
          See who is on site, what they did, and bill it —
          <br />
          without re-typing a single hour.
        </p>

        <div className="lp-cine-ctas">
          <Link href={startHref} className="lp-cine-pill lp-shimmer">
            {startLabel}
            <span className="lp-cine-pill-go"><ArrowRight size={15} aria-hidden /></span>
          </Link>
          <a href="#day" className="lp-cine-ghost">
            See a day on site <ArrowRight size={14} aria-hidden />
          </a>
        </div>
      </div>

      {/* The horizon: a lit arc where the shot meets the page, so the dark hero hands off to
          the next section instead of ending on a hard edge. */}
      <div className="lp-cine-horizon" aria-hidden />

      <div className={`lp-cine-cue${ready ? " is-on" : ""}`} aria-hidden>
        <span />
      </div>
    </section>
  );
}
