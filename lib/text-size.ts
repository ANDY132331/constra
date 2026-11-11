// Bigger text, per phone. The app sets sizes in pixels, so the phone's own text-size setting
// barely changes it; this scales every screen's content instead (CSS zoom on the page, which
// reflows rather than overflowing). Saved on the device, like the language, and applied before
// the first paint by the script in app/layout.tsx.

export const TEXT_SIZES = [
  { id: "normal", label: "Normal", scale: 1 },
  { id: "large", label: "Large", scale: 1.12 },
  { id: "xl", label: "Extra large", scale: 1.25 },
] as const;
export type TextSize = (typeof TEXT_SIZES)[number]["id"];

const KEY = "constra_text_size";

export function getTextSize(): TextSize {
  try {
    const v = localStorage.getItem(KEY);
    return TEXT_SIZES.some((s) => s.id === v) ? (v as TextSize) : "normal";
  } catch {
    return "normal";
  }
}

export function setTextSize(size: TextSize) {
  try { localStorage.setItem(KEY, size); } catch { /* private mode: applies for this visit only */ }
  document.documentElement.setAttribute("data-text-size", size);
}
