import { readConsent, writeConsent, type Consent } from "./consent";

declare global {
  interface Window {
    dataLayer?: IArguments[];
  }
}

export const MEASUREMENT_ID: string = import.meta.env.VITE_GA_MEASUREMENT_ID ?? "";
export const ANALYTICS_ENABLED = MEASUREMENT_ID !== "";
export const TAG_ORIGIN = "https://www.googletagmanager.com";

const APP_PREFIX = /^\/app(\/|$)/;
const EMAIL_LINK_PREFIX = /^\/avisos(\/|$)/;

export type EventName = "cta_registro" | "demo_play" | "contacto" | "canal_visita" | "registro_inicio";

export type EventParams = Record<string, string>;

let loaded = false;
let prepared = false;

type Command = (...args: unknown[]) => void;

const push: Command = function () {
  window.dataLayer ??= [];
  window.dataLayer.push(arguments);
};

export function isPublicPath(pathname: string): boolean {
  return !APP_PREFIX.test(pathname) && !EMAIL_LINK_PREFIX.test(pathname);
}

export function isActive(pathname = window.location.pathname): boolean {
  return ANALYTICS_ENABLED && isPublicPath(pathname) && readConsent() === "granted";
}

function prepare(): void {
  if (prepared) return;
  prepared = true;
  push("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  push("js", new Date());
  push("config", MEASUREMENT_ID, { send_page_view: false });
}

function loadTag(): void {
  if (loaded) return;
  loaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `${TAG_ORIGIN}/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function applyConsent(consent: Consent): void {
  writeConsent(consent);
  if (!ANALYTICS_ENABLED) return;
  prepare();
  if (consent === "granted") {
    push("consent", "update", { analytics_storage: "granted" });
    if (isPublicPath(window.location.pathname)) {
      loadTag();
      trackPageView(window.location.pathname, document.title);
    }
  } else {
    push("consent", "update", { analytics_storage: "denied" });
  }
}

export function startAnalytics(pathname: string): void {
  if (!ANALYTICS_ENABLED || !isPublicPath(pathname) || readConsent() !== "granted") return;
  prepare();
  loadTag();
}

export function trackPageView(pathname: string, title: string): void {
  if (!isActive(pathname)) return;
  push("event", "page_view", { page_path: pathname, page_title: title, page_location: window.location.href });
}

export function trackEvent(name: EventName, params: EventParams = {}): void {
  if (!isActive()) return;
  push("event", name, params);
}
