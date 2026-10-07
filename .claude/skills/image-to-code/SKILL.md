---
name: image-to-code
description: Turn a reference image — a screenshot, a design, a competitor's page, a photo of a whiteboard — into working code in this repo. Use whenever someone shares a picture and asks to build it, match it, or "make it look like this", and whenever copying a look from another site. It covers reading a design out of an image accurately, deciding what to copy versus what to translate into Constra's own system, and the legal and honesty lines that matter when the source is someone else's work.
---

# Image to code

Someone shares a picture and wants it built. The job is rarely "reproduce these pixels" — it
is "give me what this image is doing, in my product, with my data." Getting that distinction
right is most of the work.

## First: what kind of reference is this?

| The image is… | What they want | What to do |
|---|---|---|
| A screenshot of **this app** | A fix, usually | Find the real screen, reproduce the state, fix the code |
| A **design for this app** | Build it as drawn | Match layout and spacing closely; use repo tokens for colour and type |
| **Someone else's product** | The idea, not the pixels | Name what makes it work, rebuild that in Constra's system |
| A **photo of paper/whiteboard** | The structure | Extract the information model first; design second |
| A **render or artwork** | A feeling | Identify the handful of properties that carry it (see below) |

When it is someone else's product, say so plainly in your reply and build the Constra version.
Copying a competitor's layout wholesale is both a legal risk and a product mistake — it drags
their information architecture into an app built on different data.

## Read the image before you write anything

Describe it to yourself in this order. Skipping to code produces something that resembles the
image at a glance and falls apart at the second look.

1. **Structure** — how many regions, how they stack, what is fixed and what scrolls.
2. **Proportion** — the ratio that matters. Not "the sidebar is 280px", but "the sidebar is
   about a fifth, content takes the rest."
3. **Type scale** — count distinct sizes and weights. Most designs use three or four. Note
   the *ratio* between the largest and the body, not absolute pixels.
4. **Colour roles** — ground, surface, text, one accent. Note what the accent is *for*.
5. **Depth** — borders, fills, shadows, blur. Which elements are lifted and why.
6. **The one trick** — most striking designs have a single device doing the work: a glow
   behind a frame, an oversized number, a hairline grid, a tilted screenshot. Name it.

Say these out loud in your reply before building. If you cannot name the trick, you will
reproduce the layout and miss what made the person send the picture.

## Measuring, not guessing

Zoom in rather than squinting at a thumbnail. Crop regions and look at them full size:

```js
// from an image on disk
const sharp = require("sharp");
await sharp(src).extract({ left, top, width, height }).toFile(out);
```

To read an exact colour, sample the pixel rather than eyeballing it:

```js
const { data } = await sharp(src).extract({ left: x, top: y, width: 1, height: 1 })
  .raw().toBuffer({ resolveWithObject: true });
console.log(`#${[...data.slice(0,3)].map(v => v.toString(16).padStart(2,"0")).join("")}`);
```

A screenshot of a rendered page is usually scaled. Check the stated dimensions against the
displayed ones before trusting any pixel measurement — a 2x capture doubles every number.

## Translating, not transcribing

Take from the image: structure, proportion, rhythm, the trick.
Take from `constra-design`: palette, type, radius, spacing, motion.

The hi-vis yellow is the only accent. If the reference leans on a different accent colour, the
Constra version uses hi-vis in that role — otherwise the page stops looking like the product.

Translate rather than copy when the image shows:
- **Colours outside the palette** → map to the nearest role (ground/surface/accent), don't add
  a colour.
- **A typeface we don't have** → match the *category* (condensed display, humanist sans) using
  the repo's faces. Do not add a webfont for one section.
- **Numbers that aren't ours** → never transcribe figures from a reference. A reference showing
  "100k+ users" becomes a real Constra number or it does not appear. Inventing traction is a
  lie told to contractors.
- **A photoreal render** → say what is achievable. A real-time scene gets ~16ms per frame;
  an offline render takes minutes. Grade, bloom, depth and a moving camera carry most of the
  feeling. Photorealism does not come for free, and promising it wastes everyone's time.

## Build order that converges fastest

1. **Structure in place, real content, no styling.** Confirm the regions and the stacking.
2. **Type and spacing.** Get the scale right before any colour; most "doesn't look like it"
   is a type-scale problem, not a colour one.
3. **Colour and depth** from the tokens.
4. **The trick** last, deliberately, as its own commit.
5. **Render it and compare side by side.** Not from memory — put the two images next to each
   other and look.

## Checking your work against the reference

Screenshot the built page at the reference's aspect ratio and compare directly:

```js
// drive the page with the browser-testing skill, then:
await page.locator(".thing").screenshot({ path: "built.png" });
```

Then ask three questions, in this order:
1. Does the **structure** match? (regions, stacking, what's fixed)
2. Does the **proportion** match? (does the eye land in the same place first)
3. Does the **trick** read?

Colour and type come last, because getting those right while the proportions are wrong
produces something that is merely tinted correctly.

## Lines that do not move

- **Never reproduce another company's logo, wordmark, or brand assets** in the built page,
  even when they appear in the reference.
- **Never copy a competitor's copy verbatim.** Take the structure of their argument if it's
  good; write it in Constra's voice.
- **Never present numbers, testimonials, logos or counts from a reference as Constra's.**
  Reference images are full of invented figures. They do not survive the translation.
- If the person asks for something the toolchain genuinely cannot do (generating video or
  photographic people, for instance), say so in one sentence, offer the closest honest
  alternative, and move on. Do not quietly ship a weaker thing and let them think it is what
  they asked for.

## When the image is of this app

Different job entirely. Do not rebuild — find the bug.

1. Identify the exact screen and the state (theme, viewport, what data is loaded).
2. Reproduce it in a real browser with seeded data (`browser-testing`).
3. Measure the thing that looks wrong, rather than inferring it from the picture — a
   screenshot can be captured mid-transition.
4. Fix, then re-capture at the same size and compare.
