---
name: constra-design
description: The Constra design system — brand palette, type, spacing, theming and component patterns for this construction app and its marketing site. Use this whenever building or restyling any screen, component, email, PDF or landing-page section in this repo, whenever picking a colour, font or spacing value, and whenever something "looks off" or inconsistent. Consult it before writing new UI rather than inventing values, because a screen built from fresh guesses ends up looking like a different product bolted on.
---

# Constra design system

Constra is a field app for construction crews. People use it outdoors, in gloves, in glare,
on cracked phones, often one-handed. That context drives every choice below: high contrast,
large targets, plain words, no decoration that costs legibility.

The marketing site and the app share one palette and one voice deliberately. When someone
signs up, the product should look like the thing they were sold.

## Palette

Never hardcode a colour that isn't on this list, and never introduce a second accent hue.
A past version of the messages screen used its own blue palette and immediately read as a
different product.

**Ink / neutral**

| Token | Value | Use |
|---|---|---|
| ink | `#151617` | Primary text on light, dark surfaces |
| ink2 | `#4B4D50` | Secondary text on light |
| ink3 | `#77797C` | Tertiary / captions on light |
| ground | `#E7E5E0` | Page background, light |
| paper | `#F5F4F1` | Raised surface, light |
| rule | `#CBC8C1` | Borders, light |

**Dark surfaces** (the app's default): page `#0a0a0a`, raised `#111111`, raised-2 `#1a1a1a`,
borders `rgba(255,255,255,0.06–0.12)`, night text `#ECEAE5`, night dim `#9A9C9F`.

**Accent and status**

| Token | Value | Use |
|---|---|---|
| hi-vis | `#F5C400` | The one accent. Primary actions, selected state, highlights |
| hv-ink | `#1A1600` | Text on hi-vis fills |
| go | `#1E7A45` / `#2EAA62` | Success, on site, paid |
| stop | `#B9382C` / `#ef4444` | Danger, overdue, delete |
| info | `#0ea5e9` | Neutral data accent (hours, counts) |

Hi-vis yellow is the brand. It is borrowed from safety gear, so use it where you want a
gloved hand to go. Spending it on decoration makes the real actions harder to find.

## Type

- **Display** — Barlow Condensed, 800, uppercase, tight leading (~0.92). Page titles, big
  numbers, PDF headings. Condensed because site names and totals are long and space is tight.
- **Body** — IBM Plex Sans. 13–16px in the app, 15–19px on the site.
- **Data / labels** — IBM Plex Mono, 10–12px, uppercase with `.08–.12em` tracking for eyebrow
  labels. Use `font-variant-numeric: tabular-nums` anywhere figures stack in a column.

## Theming — follow it, never fight it

The app supports light and dark via `data-theme` on `<html>`, set before hydration by an
inline script and kept in sync by `ThemeApplier`. `globals.css` remaps the dark-first utility
classes for light mode.

Rules that keep this working:

- Read the theme from the store (`const { theme } = useStore()`) and derive colours from it.
  Do not hardcode a dark-only hex in a component.
- Muted text has a readability floor: never below roughly 4.5:1. `globals.css` already lifts
  `text-white/10`–`/45` in light mode — don't reintroduce raw faint values.
- Yellow text on a light ground fails contrast. Use the dark gold `#7A5C00`, or put the yellow
  on an ink fill instead.
- Give any new surface an explicit background. A transparent one inherits the wrong ground
  when the theme flips.

## Spacing, shape, motion

- Radius: `rounded-xl`/`2xl` for cards and sheets, `rounded-full` for pills and primary
  buttons, `rounded-[3px]` for the brand mark.
- Hairlines over heavy borders: 1px at 6–12% opacity on dark, `--rule` on light.
- Transitions 120–250ms. Respect `prefers-reduced-motion` — crews on old phones feel jank.
- Hazard tape (`repeating-linear-gradient(135deg, ink 0 Npx, hi-vis Npx 2Npx)`) is the one
  decorative motif. Used sparingly it signals "construction"; used everywhere it's noise.

## Touch and reach

- Minimum tap target **36×36px**, and 44px for anything primary. Icon-only controls need
  padding plus a matching negative margin so the target grows without moving the layout:
  `inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-2 -m-2`.
- Every icon-only control needs an accessible name that says what it acts on —
  `aria-label="Edit Marco Rossi's times"` beats `aria-label="Edit"` when a list repeats it.
- Keep the bottom ~8.75rem of scrollable pages clear so content can scroll past the mobile
  nav and the floating chat button.

## Component patterns already in the repo

Reuse these rather than rebuilding:

- `components/empty-state.tsx` — pass `isFiltered` when a search or filter caused the empty
  list, so it says "No results found" instead of "create your first one".
- `components/confirm-modal.tsx` — every destructive action goes through it. It is a real
  dialog (role, aria-modal), opens focused on Cancel, and closes on Escape or backdrop.
- `components/escape-to-close.tsx` — global Escape handling. New dialogs get it free as long
  as they are a visible full-screen layer with a Close or Cancel control.
- Sheets: full-screen bottom sheet on phones (`.sheet`), centred card from `sm:` up.
- Floating save bar: `.save-bar`, `z-[55]`, shown only while a draft differs from what is
  stored. It must sit above the chat button, which otherwise swallows the click.

## Writing

Say what happens in the words a foreman uses. "Clock in", not "Create time entry".
Errors name the cause and the next step: "That feature isn't set up on this workspace yet —
a database update is still pending", not "Save failed". Never claim something was saved
when it wasn't.

## Before you ship a screen

Run through `ui-review` in this repo. It lists the failures that have actually shipped here
(clipped popovers, z-index collisions, unreachable controls, empty states that lie) rather
than generic advice.
