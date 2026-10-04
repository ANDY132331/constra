"use client";

import { useEffect, useRef } from "react";

// Every modal in the app has a close or cancel control but none of them listened for Escape,
// which is the first thing people try. Rather than rewire every dialog, this presses the
// topmost open one's own close control, so each still runs its existing logic.
//
// Overlays are found by shape (a visible, stacked, full-screen layer) rather than by a fixed
// list of class names, so a new modal is covered without being registered here.
//
// Escape is for dismissing something you have not invested in. Once someone has typed into a
// form, a stray Escape must not throw the work away — they can still close it deliberately
// with Cancel or the X.

function overlays(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="dialog"], .sheet, .fixed.inset-0')].filter((el) => {
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
  // The overlay the person has typed into. Compared by identity, so reopening a dialog
  // (a fresh element) starts clean again.
  const editedIn = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onInput = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable)) return;
      const host = overlays().find((o) => o.contains(el));
      if (host) editedIn.current = host;
    };

    const onKey = (e: KeyboardEvent) => {
      // Let a dialog that already handles Escape win, and leave text composition alone
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing) return;
      const open = overlays();
      if (open.length === 0) { editedIn.current = null; return; }
      // Topmost by stacking order, falling back to the last one painted
      const top = open.reduce((a, b) =>
        (Number(getComputedStyle(b).zIndex) || 0) >= (Number(getComputedStyle(a).zIndex) || 0) ? b : a,
      );
      // Something was typed here — closing would discard it
      if (editedIn.current && (top === editedIn.current || top.contains(editedIn.current))) return;
      const closer = closerFor(top);
      if (!closer) return;
      e.preventDefault();
      closer.click();
    };

    document.addEventListener("input", onInput, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("input", onInput, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
