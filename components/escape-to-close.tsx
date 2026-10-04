"use client";

import { useEffect } from "react";

// Every modal in the app has a close or cancel control but none of them listened for Escape,
// which is the first thing people try. Rather than rewire every dialog, this presses the
// topmost open one's own close control, so each still runs its existing logic.
//
// Overlays are found by shape (a visible, stacked, full-screen layer) rather than by a fixed
// list of class names, so a new modal is covered without being registered here.

function overlays(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="dialog"], .sheet, .fixed.inset-0')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      if (el.classList.contains("mobile-overlay")) return false; // the sidebar scrim closes itself
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.pointerEvents === "none") return false;
      return el.getAttribute("role") === "dialog" || el.classList.contains("sheet") || (Number(cs.zIndex) || 0) >= 40;
    });
}

function visible(el: Element) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function closerFor(modal: HTMLElement): HTMLElement | null {
  const labelled = modal.querySelector<HTMLElement>(
    'button[aria-label="Close"], button[aria-label="Cancel"], button[aria-label="Dismiss"], button[aria-label="Back"]',
  );
  if (labelled && visible(labelled)) return labelled;
  return (
    [...modal.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => /^(cancel|close|back|not now|dismiss)$/i.test((b.textContent ?? "").trim()) && visible(b),
    ) ?? null
  );
}

export function EscapeToClose() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Let a dialog that already handles Escape win, and leave text composition alone
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing) return;
      const open = overlays();
      if (open.length === 0) return;
      // Topmost by stacking order, falling back to the last one painted
      const top = open.reduce((a, b) =>
        (Number(getComputedStyle(b).zIndex) || 0) >= (Number(getComputedStyle(a).zIndex) || 0) ? b : a,
      );
      const closer = closerFor(top);
      if (!closer) return;
      e.preventDefault();
      closer.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
