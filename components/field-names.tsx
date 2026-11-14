"use client";

import { useEffect } from "react";

/**
 * Gives every form field an accessible name, app-wide, so screen readers and voice control can find
 * it. Most screens set a visible <label> as a sibling of its input without linking the two; this
 * links them (the label's own text becomes the name). A field with no label at all falls back to
 * its placeholder. Runs on every change to the page, and only fills in what is missing.
 */
const CONTROL = "input:not([type=hidden]), select, textarea";
let n = 0;

function link(root: ParentNode) {
  // 1. A label standing next to a field, with nothing tying them together
  root.querySelectorAll<HTMLLabelElement>("label:not([for])").forEach((label) => {
    if (label.querySelector(CONTROL) || !label.textContent?.trim()) return;
    let next: Element | null = label.nextElementSibling;
    let target: HTMLElement | null = null;
    // the field may be a sibling or inside the next wrapper, but never past another label
    for (let hops = 0; next && hops < 2 && !target; hops++) {
      if (next.tagName === "LABEL") break;
      target = next.matches(CONTROL) ? (next as HTMLElement) : next.querySelector<HTMLElement>(CONTROL);
      next = next.nextElementSibling;
    }
    if (!target || target.getAttribute("aria-label") || target.getAttribute("aria-labelledby")) return;
    if (!target.id) target.id = `fld-${++n}`;
    if (!document.querySelector(`label[for="${target.id}"]`)) label.htmlFor = target.id;
  });
  // 2. Anything still unnamed: use its placeholder
  root.querySelectorAll<HTMLElement>(CONTROL).forEach((el) => {
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title")) return;
    if (el.closest("label")) return;
    if (el.id && document.querySelector(`label[for="${el.id}"]`)) return;
    const ph = el.getAttribute("placeholder")?.trim();
    if (ph) el.setAttribute("aria-label", ph.replace(/^e\.g\.\s*/i, "").replace(/…$/, ""));
  });
}

export function FieldNames() {
  useEffect(() => {
    let raf = 0;
    const run = () => { raf = 0; link(document); };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(run); };
    run();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
