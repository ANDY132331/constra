---
name: browser-testing
description: How to drive this repo's app in a real browser with Playwright — starting the dev server, seeding sample data, controlling the clock, taking clean screenshots, rendering generated PDFs, and avoiding the traps that produce false results. Use this whenever verifying a UI change, reproducing a reported bug, auditing pages, or capturing screenshots and video of the app. Reach for it instead of hand-rolling a one-off script, because the setup has several non-obvious gotchas that silently produce wrong answers.
---

# Browser testing

Verify UI changes by running the app, not by reading the diff. This repo already has
everything needed: Playwright is in `node_modules`, and the app can run fully offline with
sample data in `localStorage`.

## Setup

**Start the dev server** with `preview_start` using the `constra-offline` config. It runs the
app with `NEXT_PUBLIC_SUPABASE_URL` blank, so the whole app works from `localStorage` with no
database and no risk of touching real data.

Only one Next dev server can run per project directory. If a second refuses to start, stop
the first.

**Browsers:** Playwright's own Chromium is not downloaded here. Launch with the installed
Edge: `chromium.launch({ channel: "msedge" })`. For WebGL work add
`args: ["--use-gl=angle", "--enable-unsafe-swiftshader"]`.

**Scripts must live inside the project** (e.g. `.tmp-cap/`, which is gitignored). Node resolves
`playwright` from the script's own location, so a script in a scratch directory outside the
repo fails with `ERR_MODULE_NOT_FOUND`. Delete the folder when finished.

## The standard harness

`scripts/seed.js` in this skill fills `localStorage` with a realistic company: six crew, three
projects, a week of clock entries, four invoices, a daily report, a safety incident. Load the
app once, run the seed, then navigate:

```js
await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);           // let the store hydrate
await p.evaluate(SEED);                 // contents of scripts/seed.js
await p.goto(BASE + "/invoices");       // now the app has data
```

**Freeze the clock** so running shifts and "today" read sensibly, and so screenshots are
reproducible:

```js
const d = new Date(); d.setHours(15, 10, 0, 0);
await ctx.clock.install({ time: d });
await ctx.clock.resume();               // resume, or animations and timers stall
```

**Silence the promos** before screenshots — they otherwise cover the UI:

```js
await p.evaluate(() => {
  localStorage.setItem("constra_ctab_v1", "1");             // install banner
  localStorage.setItem("constra_notif_prompt_dismissed", "1");
  localStorage.setItem("constra_share_nudge_v1", "1");      // referral nudge
});
await p.evaluate(() => document.querySelectorAll("nextjs-portal, .pwa-banner, .cc-fab").forEach((e) => e.remove()));
```

`nextjs-portal` is the dev error overlay. It reappears on recompiles, so for long recordings
sweep it on an interval.

## Traps that produce wrong answers

**Hidden duplicate layouts.** Most pages render a narrow and a wide variant. A plain selector
often resolves to the hidden copy, and `fill()` then times out or silently does nothing — which
reads as "the feature is broken". Always use `:visible`.

**Stale dev routes.** The dev server sometimes starts serving 404s for dynamic routes like
`/invoices/[id]` after heavy editing. If a route 404s but the production build is fine, stop
the server, `rm -rf .next/dev`, and start it again.

**Editing while a probe runs.** Each save triggers a recompile and navigation crawls. Finish
edits, then run the probe.

**The browser pane backgrounds itself.** When `document.hidden` is true, video pauses and
`requestAnimationFrame` stops, so animation and WebGL look broken. Verify anything
motion-related through Playwright, which stays visible.

**Screenshots lag state.** A screenshot can be captured mid-transition. For colour or layout
claims, measure with `getBoundingClientRect` / `getComputedStyle`, or sample pixels with
`sharp`, rather than judging by eye from one frame.

## Measuring instead of eyeballing

```js
// Is this control actually clickable, or is something on top of it?
const r = el.getBoundingClientRect();
const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
const covered = top !== el && !el.contains(top);

// Is this panel clipped by an ancestor?
const clip = el.closest(".overflow-hidden")?.getBoundingClientRect();
const cutOff = clip && (r.right > clip.right + 1 || r.bottom > clip.bottom + 1);

// Does the page scroll sideways? (a scrolling container is fine; the page is not)
document.documentElement.scrollWidth > window.innerWidth;
```

## Files the app generates

**PDFs** — click the download control and capture the event:

```js
const dl = p.waitForEvent("download", { timeout: 30000 });
await p.getByRole("button", { name: /Download PDF/ }).click();
await (await dl).saveAs(dest);
```

To look at one, render it with the bundled `pdfjs-dist` inside a page and screenshot the
canvas. `pdftoppm` is not installed.

**Video** — `recordVideo` on the context needs Playwright's ffmpeg: `npx playwright install
ffmpeg`. That ffmpeg build is minimal: it has `libvpx` (VP8 WebM) but no H.264, and no
`setpts` filter. To speed a clip up, rescale input timestamps instead: `-itsscale 0.62`.

**Canvas / WebGL stills** — `canvas.toDataURL()` returns blank unless the renderer was created
with `preserveDrawingBuffer`. Screenshot the canvas element with Playwright instead, which
captures the composited pixels.

## Reporting

State what you measured and how. If a probe result turns out to be a harness artefact, say so
rather than quietly dropping it — false positives here have twice looked like app-wide bugs
(see `ui-review`). Pair any "it works now" with the measurement that shows it.
