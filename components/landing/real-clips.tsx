"use client";

import { useEffect, useRef, useState } from "react";
import { SITE_CLIPS } from "@/lib/site-clips";

// Real clips of real crews. Renders nothing until lib/site-clips.ts lists some, so the page
// never shows an empty shelf waiting to be filled.
export default function RealClips() {
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || SITE_CLIPS.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } },
      { rootMargin: "500px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (SITE_CLIPS.length === 0) return null;

  return (
    <section className="lp-clips" ref={ref} aria-labelledby="clips-title">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <p className="lp-kicker lp-kicker-inv">On site</p>
          <h2 id="clips-title" className="lp-h2">Real crews.<br />Real phones.</h2>
          <p className="lp-section-note">Filmed on working sites by the people using it.</p>
        </div>

        <div className="lp-clip-row">
          {SITE_CLIPS.map((c) => (
            <figure key={c.file} className="lp-clip">
              <div className="lp-clip-frame">
                {near ? (
                  <video
                    src={`/site/clips/${c.file}`}
                    poster={`/site/clips/${c.poster}`}
                    preload="metadata"
                    muted
                    loop
                    playsInline
                    controls
                    aria-label={c.alt}
                  />
                ) : (
                  <img src={`/site/clips/${c.poster}`} alt={c.alt} />
                )}
              </div>
              <figcaption>
                {c.caption}
                {c.credit && <span className="lp-clip-credit">{c.credit}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
