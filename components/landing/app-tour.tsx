"use client";

import { useEffect, useRef, useState } from "react";

// A screen recording of the app itself, plus real screens from it. Nothing is downloaded
// until the section is close to the viewport.
const SHOTS: [string, string, string][] = [
  ["clock", "Time", "Who is on site, live, with the hours already totted up"],
  ["invoices", "Invoices", "What is owed, what is paid, what is late"],
  ["dashboard", "Dashboard", "The morning read on every job at once"],
  ["daily-report", "Daily reports", "Weather, crew and work done, filed from the truck"],
];

export default function AppTour() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [shot, setShot] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Only play while it is actually on screen
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !near) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) void v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [near]);

  return (
    <section className="lp-tour" ref={sectionRef} aria-labelledby="tour-title">
      <div className="lp-wrap lp-tour-grid">
        <div className="lp-tour-copy">
          <p className="lp-kicker">The actual app</p>
          <h2 id="tour-title" className="lp-h2">No mock-ups.<br />This is the app.</h2>
          <p className="lp-section-note">
            A screen recording of Constra running on a phone, with a sample crew on three sample jobs. Everything here is the real interface — the same one your crew taps on site.
          </p>

          <div className="lp-tour-tabs" role="tablist" aria-label="App screens">
            {SHOTS.map(([slug, label], i) => (
              <button
                key={slug}
                role="tab"
                type="button"
                aria-selected={shot === i}
                aria-controls="lp-tour-shot"
                className={shot === i ? "is-on" : undefined}
                onClick={() => setShot(i)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="lp-tour-caption" id="lp-tour-shot" aria-live="polite">{SHOTS[shot][2]}</p>
        </div>

        <div className="lp-tour-devices">
          <figure className="lp-device lp-device-video">
            <div className="lp-device-screen">
              {near ? (
                <video
                  ref={videoRef}
                  src="/site/app-demo.webm"
                  poster="/site/app-demo-poster.webp"
                  preload="none"
                  loop
                  muted
                  playsInline
                  controls={false}
                  aria-label="Screen recording of the Constra app: dashboard, live crew hours, invoices and a daily report"
                />
              ) : (
                <img src="/site/app-demo-poster.webp" alt="" aria-hidden width={780} height={1688} />
              )}
            </div>
            <figcaption className="lp-mono">Recorded on a phone screen</figcaption>
          </figure>

          <figure className="lp-device lp-device-shot">
            <div className="lp-device-screen">
              {near && (
                <img
                  src={`/site/app-${SHOTS[shot][0]}.webp`}
                  width={780}
                  height={1688}
                  decoding="async"
                  alt={`The Constra ${SHOTS[shot][1]} screen: ${SHOTS[shot][2].toLowerCase()}`}
                />
              )}
            </div>
            <figcaption className="lp-mono">{SHOTS[shot][1]}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
