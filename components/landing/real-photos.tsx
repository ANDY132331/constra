"use client";

import { SITE_PHOTOS } from "@/lib/site-photos";

// Photographs from the user's own sites. Renders nothing until lib/site-photos.ts lists some.
export default function RealPhotos() {
  if (SITE_PHOTOS.length === 0) return null;

  return (
    <section className="lp-real" aria-labelledby="real-title">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <p className="lp-kicker">On the tools</p>
          <h2 id="real-title" className="lp-h2">Jobs run on Constra.</h2>
        </div>
        <div className="lp-real-grid">
          {SITE_PHOTOS.map((p) => (
            <figure key={p.file}>
              <img src={`/site/real/${p.file}`} alt={p.alt} loading="lazy" decoding="async" />
              <figcaption>{p.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
