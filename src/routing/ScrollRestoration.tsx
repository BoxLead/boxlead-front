import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

type Position = { window: number; content: number };

const positions = new Map<string, Position>();
const CONTENT_SELECTOR = ".layout-content";

function contentElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(CONTENT_SELECTOR);
}

function rememberPosition(key: string): void {
  positions.set(key, { window: window.scrollY, content: contentElement()?.scrollTop ?? 0 });
}

function scrollTo(position: Position): void {
  window.scrollTo({ top: position.window, left: 0, behavior: "instant" });
  const content = contentElement();
  if (content) content.scrollTop = position.content;
}

function scrollToHash(hash: string): boolean {
  if (!hash) return false;
  let target: Element | null;
  try {
    target = document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    target = null;
  }
  if (!target) return false;
  target.scrollIntoView({ block: "start", behavior: "instant" });
  return true;
}

export function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    const key = location.key;
    if (navigationType === "POP") {
      const saved = positions.get(key);
      if (saved) {
        scrollTo(saved);
        const frame = requestAnimationFrame(() => scrollTo(saved));
        return () => {
          cancelAnimationFrame(frame);
          rememberPosition(key);
        };
      }
    }
    if (!scrollToHash(location.hash)) scrollTo({ window: 0, content: 0 });
    return () => rememberPosition(key);
  }, [location.key, location.hash, navigationType]);

  return null;
}
