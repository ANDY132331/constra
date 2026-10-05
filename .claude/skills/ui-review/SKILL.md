---
name: ui-review
description: The UI bug checklist for this repo — the specific failures that have actually shipped in Constra, and how to catch each one with a real browser. Use this before shipping any UI change, when the user reports something "doesn't work", "looks off", "is cut off" or "won't click", and whenever auditing a page or doing a sweep for bugs. It exists because these failures repeat: a control that looks fine in the markup can still be clipped, covered, or unreachable in the running app.
---

# UI review

Every item here corresponds to a bug that actually shipped in this app. Reading markup does
not catch them — a control can look correct in JSX and still be clipped by an ancestor,
covered by a floating element, or rendered twice with only the hidden copy wired up. Drive
the real browser (see the `browser-testing` skill) and measure.

## The failures that repeat here

### 1. Popover clipped by an `overflow-hidden` ancestor
A dropdown wider or taller than its parent menu gets cut off. The PDF style picker opened a
288px panel inside a 224px menu with `overflow-hidden`: one half-cut row, the other options
invisible and unclickable.

Check: for every absolutely-positioned panel, walk up to the nearest ancestor with
`overflow: hidden` and compare rects. Any overhang is a bug.

Fix: don't nest a menu in a menu. Lay the choices out in place, or portal the panel out.

### 2. A floating element covering a real control
The AI chat button (`z-50`) sat directly over the "Save Invoice" bar (`z-30`). Clicks landed
on the chat widget, so an edited invoice could not be saved at all.

Check: `document.elementFromPoint(centre of the button)` — if it isn't your button or a child,
something is on top.

Fix: raise the bar and have the floating thing step aside while it's up.

### 3. Rendered twice for responsive layouts, wired up once
Pages often render a narrow and a wide variant of the same control. Two bugs follow:
- **Shared refs.** Both export menus set the same `ref`, so the outside-click handler only
  knew about one. Clicking the other counted as "outside" and shut the menu as it opened —
  the button looked dead. Match on a marker attribute (`[data-export-menu]`) instead of one
  element.
- **Hidden duplicates fool tests.** `locator('input[placeholder*=Search]')` can resolve to the
  hidden copy and silently do nothing. Always use `:visible`.

### 4. Empty states that lie
"No invoices yet — create your first invoice" shown to someone who has four and searched for
something unmatched. Pass `isFiltered` to `EmptyState` whenever a search or filter is active.

### 5. Controls too small or unnamed
Timesheet rows carried a 10×10px map link with no accessible name, plus 11px edit and flag
buttons. Unusable in gloves, invisible to a screen reader.

Check: every visible button/link ≥36×36px and has a non-empty accessible name.

### 6. Dialog behaviour
Each dialog needs: `role="dialog"` + `aria-modal`, Escape to dismiss, backdrop click to
dismiss, focus starting on the safe choice (Cancel, not Delete).

One caveat learned the hard way: **Escape must not discard typed work.** `escape-to-close.tsx`
ignores Escape once someone has typed into the dialog.

### 7. Contrast in both themes
A colour that reads on dark can vanish on light. Faint text (`text-white/10`–`/45`) and yellow
text on light grounds are the usual offenders. Sample real pixels rather than trusting a
screenshot's appearance — screenshots can be captured mid-transition and mislead you.

### 8. Search that only filters part of the page
"Search workers" narrowed the entries list but left every worker in the clocked-in and
clock-in lists. Decide what a search means on that screen and apply it to all of it; keep
summary counts on the full set.

### 9. Unsaved work with no cue
Settings and document drafts only persist on Save. Without a cue, edits vanish on reload.
Show an "Unsaved changes" indicator and use `lib/use-unsaved-guard.ts`.

### 10. Numbers that can go wrong
Money and durations need guards: shift length can never be negative (a phone clock running
ahead once produced "-6h -32m" and subtracted from payroll); a missing rate must read as $0
and be flagged, not NaN; line totals must sum to the printed total (`lib/money.ts`).

## How to sweep

Work through this in a real browser with seeded data, at 1280×900 and 390×844:

1. **Load every page.** Watch for crashes, blank panels, hydration errors, and horizontal
   page scroll (`documentElement.scrollWidth > innerWidth`). A horizontally scrolling
   *container* is fine; a scrolling *page* is not.
2. **Open every create action.** Does a dialog appear? Does Escape close it? Does the close
   button work? Does submitting empty give feedback — a disabled button, a message, or native
   validation all count.
3. **Click every delete.** It must ask first.
4. **Type gibberish into every search.** A known item should disappear and the page should
   say why it's empty. Verify by checking a known string vanished, not by text length — an
   empty state can be longer than a short list.
5. **Open every menu and measure for clipping and overlap** (items 1 and 2).
6. **Switch themes and sample pixels** on sidebar, surface, and text.

## Interpreting results

Be suspicious of your own harness before declaring a bug. In past sweeps, "14 pages don't
filter" and "two forms have no validation" were both measurement errors — a hidden duplicate
input and native browser validation the probe couldn't see. Confirm a failure a second way
before reporting or "fixing" it, and say plainly when a result turned out to be a false alarm.
