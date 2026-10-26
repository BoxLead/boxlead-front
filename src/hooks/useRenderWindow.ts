import { useCallback, useEffect, useRef, useState } from "react";

export const RENDER_WINDOW_STEP = 60;

type RenderWindow<T> = {
  shown: T[];
  remaining: number;
  showMore: () => void;
  sentinelRef: (node: HTMLElement | null) => void;
};

export function useRenderWindow<T>(items: T[], resetKey: string, step = RENDER_WINDOW_STEP): RenderWindow<T> {
  const [count, setCount] = useState(step);
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setCount(step);
  }
  const observer = useRef<IntersectionObserver | null>(null);
  const showMore = useCallback(() => setCount((current) => current + step), [step]);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observer.current?.disconnect();
      observer.current = null;
      if (!node || typeof IntersectionObserver !== "function") return;
      observer.current = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) showMore();
      });
      observer.current.observe(node);
    },
    [showMore],
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  const shown = items.length > count ? items.slice(0, count) : items;
  return { shown, remaining: Math.max(0, items.length - shown.length), showMore, sentinelRef };
}
