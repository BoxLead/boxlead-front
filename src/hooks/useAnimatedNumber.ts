import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function useAnimatedNumber(target: number, duration = 450): number {
  const reduced = useMediaQuery(REDUCED_MOTION);
  const [value, setValue] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    if (reduced) return;
    const from = shown.current;
    if (from === target) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * (1 - (1 - progress) ** 3);
      shown.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  return reduced ? target : value;
}
