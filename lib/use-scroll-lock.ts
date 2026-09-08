import { useEffect } from "react";

/**
 * Locks the main scroll container while `locked` is true.
 * Prevents background content from scrolling behind open modals/sheets.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const main = document.querySelector<HTMLElement>("main");
    if (!main) return;
    const prev = main.style.overflow;
    main.style.overflow = "hidden";
    return () => {
      main.style.overflow = prev;
    };
  }, [locked]);
}
