import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72;

export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void> | void,
) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullYRef = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      activeRef.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!activeRef.current) return;
      if (el.scrollTop > 0) { activeRef.current = false; pullYRef.current = 0; setPullY(0); return; }
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        const v = Math.min(dy * 0.4, THRESHOLD + 20);
        pullYRef.current = v;
        setPullY(v);
      }
    };

    const onEnd = async () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      if (pullYRef.current >= THRESHOLD) {
        setRefreshing(true);
        setPullY(THRESHOLD);
        pullYRef.current = 0;
        try { await onRefresh(); } finally { setRefreshing(false); setPullY(0); }
      } else {
        pullYRef.current = 0;
        setPullY(0);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [containerRef, onRefresh]);

  return { pullY, refreshing, threshold: THRESHOLD };
}
