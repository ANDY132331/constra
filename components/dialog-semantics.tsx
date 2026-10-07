"use client";

import { useEffect } from "react";

// Every modal in the app is hand-rolled from a stacked full-screen layer plus a `.sheet`
// panel. They look right, and Escape closes them, but to assistive tech they were not
// dialogs at all: no role, no aria-modal, no accessible name, and focus stayed on the button
// behind the overlay. A screen reader announced nothing, and a keyboard user tabbed through
// the page underneath while a modal covered it.
//
// Rather than rewire 28 files, this finds panels by the same shape EscapeToClose uses and
// gives them the semantics and focus behaviour a dialog is supposed to have. A new modal is
// covered without being registered anywhere.

const PANEL = '[role="dialog"], .sheet, .fixed.inset-0';

function isVisible(el: Element) {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== "hidden" && cs.pointerEvents !== "none";
}

/** The inner panel people actually read — the scrim is not the dialog. */
function panels(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(PANEL)].filter((el) => {
    if (el.classList.contains("mobile-overlay")) return false; // the sidebar scrim
    if (!isVisible(el)) return false;
    // A full-screen scrim that contains its own .sheet is the backdrop, not the panel.
    if (!el.classList.contains("sheet") && el.querySelector(".sheet")) return false;
    const cs = getComputedStyle(el);
    return el.getAttribute("role") === "dialog" || el.classList.contains("sheet") || (Number(cs.zIndex) || 0) >= 40;
  });
}

function topmost(list: HTMLElement[]) {
  return list.reduce((a, b) =>
    (Number(getComputedStyle(b).zIndex) || 0) >= (Number(getComputedStyle(a).zIndex) || 0) ? b : a,
  );
}

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter(isVisible);
}

let seq = 0;

function dress(panel: HTMLElement) {
  if (panel.dataset.dlgReady === "1") return;
  panel.dataset.dlgReady = "1";

  if (!panel.getAttribute("role")) panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");

  // Name it from its own heading, which every one of these panels already has.
  if (!panel.getAttribute("aria-label") && !panel.getAttribute("aria-labelledby")) {
    const heading = panel.querySelector<HTMLElement>("h1, h2, h3, h4");
    if (heading?.textContent?.trim()) {
      if (!heading.id) heading.id = `dlg-title-${++seq}`;
      panel.setAttribute("aria-labelledby", heading.id);
    } else {
      const closer = panel.querySelector<HTMLElement>('button[aria-label="Close"]');
      panel.setAttribute("aria-label", closer?.getAttribute("aria-label") ? "Dialog" : "Dialog");
    }
  }

  if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
}

/**
 * Move focus in without hijacking what the person is already doing: if the dialog opened
 * because they clicked inside it, or it already holds focus, leave it alone.
 */
function focusInto(panel: HTMLElement) {
  if (panel.contains(document.activeElement) && document.activeElement !== document.body) return;
  const items = focusables(panel);
  // Skip a leading Close button — landing on "Close" first reads as if the dialog is over.
  const first = items.find((el) => el.getAttribute("aria-label") !== "Close") ?? items[0] ?? panel;
  // Don't pop the keyboard open on a phone just because a dialog appeared.
  const isText = first instanceof HTMLInputElement || first instanceof HTMLTextAreaElement;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  (isText && coarse ? panel : first).focus({ preventScroll: true });
}

export function DialogSemantics() {
  useEffect(() => {
    let openPanel: HTMLElement | null = null;
    let restoreTo: HTMLElement | null = null;
    // React often re-creates the trigger while the dialog is open, which leaves the saved
    // element detached. Remember what it was called so we can find its replacement instead
    // of dropping focus to the top of the page.
    let restoreLabel = "";

    const restoreFocus = () => {
      if (restoreTo && document.contains(restoreTo) && isVisible(restoreTo)) {
        restoreTo.focus({ preventScroll: true });
        return;
      }
      if (restoreLabel) {
        const match = [...document.querySelectorAll<HTMLElement>("button, a[href]")].find(
          (el) => isVisible(el) && (el.getAttribute("aria-label") ?? el.textContent ?? "").trim() === restoreLabel,
        );
        if (match) { match.focus({ preventScroll: true }); return; }
      }
      // Last resort: the page's own content, so the next Tab carries on from here rather
      // than restarting at the browser chrome.
      const main = document.querySelector<HTMLElement>("main");
      if (main) {
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
      }
    };

    const sync = () => {
      const open = panels();
      if (open.length === 0) {
        if (openPanel) {
          openPanel = null;
          restoreFocus();
          restoreTo = null;
          restoreLabel = "";
        }
        return;
      }
      const top = topmost(open);
      open.forEach(dress);
      if (top !== openPanel) {
        if (!openPanel) {
          const active = document.activeElement;
          restoreTo = active instanceof HTMLElement && active !== document.body ? active : null;
          restoreLabel = restoreTo ? (restoreTo.getAttribute("aria-label") ?? restoreTo.textContent ?? "").trim() : "";
        }
        openPanel = top;
        // Let the panel finish mounting its fields before choosing where to land.
        requestAnimationFrame(() => { if (openPanel === top && document.contains(top)) focusInto(top); });
      }
    };

    // Keep Tab inside the open dialog. Without this the page behind stays reachable.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !openPanel || e.defaultPrevented) return;
      const items = focusables(openPanel);
      if (items.length === 0) { e.preventDefault(); openPanel.focus({ preventScroll: true }); return; }
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !openPanel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus({ preventScroll: true });
        return;
      }
      if (!e.shiftKey && active === last) { e.preventDefault(); first.focus({ preventScroll: true }); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus({ preventScroll: true }); }
    };

    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    document.addEventListener("keydown", onKey, true);
    sync();

    return () => {
      mo.disconnect();
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);

  return null;
}
