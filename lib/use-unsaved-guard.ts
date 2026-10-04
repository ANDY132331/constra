"use client";

import { useEffect } from "react";

/**
 * Warns before the page is closed or reloaded while a form still has unsaved edits.
 * Browsers show their own wording and only honour this after the person has interacted
 * with the page, so it is a safety net rather than a guarantee — pair it with a visible
 * "unsaved changes" cue.
 */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}
