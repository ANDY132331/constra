// Short clips of real people using Constra on real sites, shown on the landing page.
//
// These must be genuine. Footage of people who are not real users, presented as if they are,
// is a fabricated testimonial — it misleads the contractors you are selling to and breaks
// advertising rules in most countries. Film your own crew, or customers who agree to it.
//
// To add one:
//   1. Put the file in  public/site/clips/  (see SHOTLIST.md there for what to film)
//   2. Export a poster frame as a .webp next to it
//   3. Add a line below
//   4. Deploy — the strip appears. While this list is empty, nothing renders.
//
// Keep each clip under ~6 MB and 15 seconds. Muted autoplay is the norm, so the clip has to
// make sense with no sound.

export type SiteClip = {
  /** File name inside public/site/clips/ (webm or mp4) */
  file: string;
  /** Poster frame inside public/site/clips/ */
  poster: string;
  /** Short caption shown under the clip */
  caption: string;
  /** What happens in the clip, for screen readers and when video is blocked */
  alt: string;
  /** Who is in it — shown so viewers know this is a real crew, not stock */
  credit?: string;
};

export const SITE_CLIPS: SiteClip[] = [
  // {
  //   file: "marco-clock-in.mp4",
  //   poster: "marco-clock-in.webp",
  //   caption: "Clocking in at the gate, 6:58am",
  //   alt: "A framer in a hi-vis vest holds up his phone and taps clock in, then shows the verified badge",
  //   credit: "Marco, Rossi Framing",
  // },
];
