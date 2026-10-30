import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import i18next from "i18next";
import { pageNameFrom } from "./pageName";

const SETTLE_MS = 400;

function focusTarget(): HTMLElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && active.closest("main, .layout-content, .landing")) {
    return null;
  }
  return (
    document.querySelector<HTMLElement>("[data-route-focus]") ??
    document.querySelector<HTMLElement>(".layout-content h1, main h1, h1")
  );
}

function announcePage(page: string, show: (message: string) => void): void {
  show(i18next.t("announcer.loaded", { page }));
}

export function RouteAnnouncer() {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let settled = false;
    const announce = () => {
      if (settled) return;
      settled = true;
      announcePage(pageNameFrom(document.title), setMessage);
      const target = focusTarget();
      if (target) {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    };
    const title = document.querySelector("title");
    const observer = title ? new MutationObserver(announce) : null;
    if (title && observer) observer.observe(title, { childList: true, characterData: true, subtree: true });
    const timer = window.setTimeout(announce, SETTLE_MS);
    return () => {
      observer?.disconnect();
      window.clearTimeout(timer);
    };
  }, [location.pathname]);

  return (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
