import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_KEY, readConsent, writeConsent } from "./consent";

describe("analytics consent", () => {
  beforeEach(() => {
    localStorage.clear();
    window.dataLayer = undefined;
    document.head.querySelectorAll("script").forEach((script) => script.remove());
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("remembers the choice and treats anything else as undecided", () => {
    expect(readConsent()).toBeNull();
    writeConsent("granted");
    expect(localStorage.getItem(CONSENT_KEY)).toBe("granted");
    localStorage.setItem(CONSENT_KEY, "maybe");
    expect(readConsent()).toBeNull();
    writeConsent(null);
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });

  it("loads nothing and sends nothing without a measurement id", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "");
    const gtag = await import("./gtag");
    gtag.applyConsent("granted");
    gtag.trackEvent("cta_registro", { ubicacion: "hero" });
    expect(window.dataLayer).toBeUndefined();
    expect(document.head.querySelector("script")).toBeNull();
  });

  it("starts with every storage denied and only loads the tag after accepting", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST");
    const gtag = await import("./gtag");
    gtag.startAnalytics("/");
    gtag.trackEvent("cta_registro");
    expect(window.dataLayer).toBeUndefined();
    expect(document.head.querySelector("script")).toBeNull();

    gtag.applyConsent("granted");
    const layer = (window.dataLayer ?? []).map((entry) => Array.from(entry));
    expect(window.dataLayer?.every((entry) => Object.prototype.toString.call(entry) === "[object Arguments]")).toBe(true);
    expect(layer[0]).toEqual(["consent", "default", expect.objectContaining({ analytics_storage: "denied", ad_storage: "denied" })]);
    expect(layer).toContainEqual(["consent", "update", { analytics_storage: "granted" }]);
    expect(document.head.querySelector("script")?.getAttribute("src")).toBe("https://www.googletagmanager.com/gtag/js?id=G-TEST");

    gtag.trackEvent("demo_play");
    expect(Array.from(window.dataLayer?.at(-1) ?? [])).toEqual(["event", "demo_play", {}]);
  });

  it("never measures inside the app", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST");
    writeConsent("granted");
    const gtag = await import("./gtag");
    gtag.startAnalytics("/app/inbox");
    expect(document.head.querySelector("script")).toBeNull();
    gtag.trackPageView("/app/inbox", "Bandeja");
    expect(window.dataLayer).toBeUndefined();
    expect(gtag.isPublicPath("/app")).toBe(false);
    expect(gtag.isPublicPath("/whatsapp")).toBe(true);
  });

  it("keeps the choice when the person rejects", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST");
    const gtag = await import("./gtag");
    gtag.applyConsent("denied");
    expect(readConsent()).toBe("denied");
    expect(document.head.querySelector("script")).toBeNull();
    gtag.trackEvent("contacto");
    expect((window.dataLayer ?? []).some((entry) => entry[0] === "event")).toBe(false);
  });
});
