"use client";

import { useEffect } from "react";

// Every modal in the app has a close or cancel control but none of them listened for Escape,
// which is the first thing people try. Rather than rewire eighteen dialogs, this presses the
// topmost open dialog's own close control, so each one still runs its existing logic.

const MODAL = '[role="dialog"], .sheet, .fixed.inset-0.z-50:not(.mobile-overlay)';

function visible(el: Element) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function closerFor(modal: HTMLElement): HTMLElement | null {
  const labelled = modal.querySelector<HTMLElement>('button[aria-label="Close"], button[aria-label="Cancel"], button[aria-label="Dismiss"]');
  if (labelled && visible(labelled)) return labelled;
  const byText = [...modal.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => /^(cancel|close|back)$/i.test((b.textContent ?? "").trim()) && visible(b),
  );
  return byText ?? null;
}

export function EscapeToClose() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Let a dialog that already handles Escape win, and leave native pickers alone
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing) return;
      const open = [...document.querySelectorAll<HTMLElement>(MODAL)].filter(visible);
      if (open.length === 0) return;
      // Innermost last: closing the topmost first matches what the person sees
      const closer = closerFor(open[open.length - 1]);
      if (!closer) return;
      e.preventDefault();
      closer.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
