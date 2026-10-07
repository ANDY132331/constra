---
name: field-app-design
description: Mobile and app design rules from the published guidance — Apple HIG, Material 3, WCAG 2.2 — plus the research on how people actually hold phones and what breaks on a job site in gloves and sunlight. Use this when building or reviewing any screen, choosing a tap target or font size, placing a primary or destructive action, or deciding where something goes on a phone. It exists because Constra is used one-handed, outdoors, in gloves, which is the hardest case these standards describe and the one a desk-built screen fails first.
---

# Designing for a phone on a job site

Constra's hardest user is a framer at 7am: one hand on the phone, one on a ladder, gloves on,
sun on the screen. Every rule below is sourced. Where sources disagree, the stricter number
wins, because the cost of a missed tap here is a wrong clock-in on someone's pay.

## The numbers

**Tap targets.** Three standards, three floors:

| Source | Minimum | Note |
|---|---|---|
| WCAG 2.2 SC 2.5.8 (AA) | 24×24 CSS px | The legal floor. Five exceptions — see below. |
| Apple HIG | 44×44 pt | "a button needs a hit region of at least 44x44 pt" |
| Material 3 | 48×48 dp | ~9mm physical, whatever the screen |

**Use 44px as this repo's working minimum** and 48px for anything on a phone. 24px only
clears the law, not a gloved thumb. For gloved field use, guidance for construction apps
recommends 60×60 px for interactive elements and 72×72 px for a primary action like clock-in,
with at least 16px of clear space between targets. Constra's clock-in button is already 54px
plus a large hit area — that is the floor for the one control people use every single day.

**WCAG's five exceptions to 24×24** (worth knowing before "fixing" something that is fine):
spacing (a 24px circle centred on the target hits nothing else), equivalent (another control
on the page does the same job at full size), **inline** (a link inside a sentence), user-agent
controls, and essential (a map pin). An inline link in a paragraph is exempt; a row action
button is not.

**Spacing between targets.** Material: 8dp minimum. Gloved field guidance: 16px. Adjacent
destructive and non-destructive actions (Edit next to Delete) take the larger number.

**Type sizes** (Apple, iOS): default 17pt, **minimum 11pt**. Below that is not a design choice,
it is a defect. Thin weights need to go larger than the minimum to stay legible — "if you're
using a custom font with a thin weight, aim for larger than the recommended sizes".

**Contrast** (Apple's table, matching WCAG AA):

| Text | Minimum ratio |
|---|---|
| Up to 17pt, any weight | 4.5:1 |
| 18pt+ | 3:1 |
| Any size, bold | 3:1 |

Check both themes. Apple: "If your app supports Dark Mode, make sure to check the minimum
contrast in both light and dark appearances." This repo has shipped a light theme that failed
this on every page — see `ui-review`.

## Where things go: the thumb

Steven Hoober's field observation, still the most-cited data on this: **49% of people hold a
phone one-handed**, 36% cradle it and tap with the other hand, 15% use two thumbs. Roughly
75% of interactions are thumb-driven.

That gives a reach map on a phone held one-handed:

- **Bottom centre — easy.** Primary actions, the thing they do every shift.
- **Middle — comfortable.** Content, lists.
- **Top corners — hard.** Requires regripping the phone. On a ladder, regripping is not free.

So: **primary actions go to the bottom.** Constra's clock-in sits in the bottom bar, which is
correct. A destructive action must *not* sit where the thumb rests by default. Bottom tab bars
hold **five items maximum** — past that the targets get too narrow to hit.

Edges are where people are least precise. Smashing's measurements recommend ~46px targets at
the bottom edge and ~42px at the top, versus ~27px mid-screen — bigger at the edges, not
smaller.

## Sunlight

A screen that reads fine at a desk is unreadable on a roof. From guidance written for
construction apps specifically:

- **Bright blues and greens nearly vanish in direct sun.** Use them as accent, never as the
  only carrier of meaning. A green "Clocked in" state needs a word or icon too.
- **High contrast, large text, less reliance on colour.** Treat the contrast table above as a
  floor, not a target.
- **Shadows and gradients cut contrast.** A subtle border holds a button's shape when glare
  washes the fill out.

This is why the repo's hi-vis yellow is a *surface* colour with near-black text on it, not a
text colour on a light ground — yellow text on cream measured 1.5:1 here.

## Gloves

- **Taps only.** Swipe and pinch do not work reliably through a glove. Anything reachable only
  by swipe needs a tap route as well. A swipe-to-delete with no button is unreachable on site.
- **No long-press-only actions** for the same reason.
- **Test in the gloves.** The guidance is blunt about it: wear the gloves your users wear.
  Short of that, measure — a 20px button does not become reachable because it looks fine.

## Rules that are not about size

- **Never colour alone.** Apple: "Convey information with more than color alone" — red-green
  is the common confusion, and it is also the pairing Constra uses for overdue vs paid. Pair
  every status colour with a word, an icon, or a shape.
- **Every custom button needs a press state.** Apple: "Without a press state, a button can
  feel unresponsive, making people wonder if it's accepting their input." On a laggy site
  connection this is the difference between one clock-in and three.
- **Order by importance, top and leading first.** People read top-to-bottom; put the thing
  they came for at the top.
- **Group related items** with space, containers or rules — "people assume that aligned items
  are related to each other".
- **Progressive disclosure.** Too many choices at once makes everything slower to find.
- **Support larger text.** Apple asks for enlargement to at least 200%. Layouts that break
  when the system font grows are a real failure for anyone over about 45 — which is a lot of
  foremen.

## How to check

Measure, don't eyeball. `browser-testing` has the harness; `ui-review` has the failures that
have actually shipped here. The quick version:

```js
// every visible control under the floor
[...document.querySelectorAll("button, a[href], [role=button]")]
  .map(e => ({ e, r: e.getBoundingClientRect() }))
  .filter(({ e, r }) => r.width > 0 && getComputedStyle(e).visibility !== "hidden"
                        && (r.width < 44 || r.height < 44))
  .map(({ e, r }) => `${r.width|0}x${r.height|0} ${e.getAttribute("aria-label") || e.innerText.slice(0,20)}`);
```

Colours resolve through a canvas, never by parsing the string — Tailwind v4 emits `oklab()`,
and reading its numbers as RGB reports white text as black. That mistake produced a
confident, wrong audit in this repo once already.

## Sources

- Apple, Human Interface Guidelines — [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) (type sizes, contrast table, colour-alone, Dynamic Type), [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) (44×44pt hit region, press state), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) (hierarchy, grouping, progressive disclosure)
- Material Design 3 — [Accessibility](https://m3.material.io/foundations/designing/structure), [Grids & spacing](https://m3.material.io/foundations/layout/grids-spacing/density) (48×48dp, 8dp spacing, density opt-in)
- W3C — [WCAG 2.2 Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) (24×24 and the five exceptions)
- Steven Hoober — [How Do Users Really Hold Mobile Devices?](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php), and [The Thumb Zone](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/)
- Smashing Magazine — [Accessible Target Sizes Cheatsheet](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/) (edge vs centre sizes), [Bottom Navigation](https://www.smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design/) (five-item limit)
- [Designing apps for construction workers](https://thisisglance.com/learning-centre/how-should-i-design-apps-for-construction-workers) (gloves, sunlight, 60/72px targets, 16px spacing)
