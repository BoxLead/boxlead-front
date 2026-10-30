import { describe, expect, it } from "vitest";
import { browserLanguage, prefixedLanguage, stripLanguage } from "./languages";
import { alternatePaths, localizedPath } from "./paths";
import { parseRich, plainText } from "./richText";
import { routeLanguage } from "./routeLanguage";

describe("languages and paths", () => {
  it("reads the language from the /en prefix only", () => {
    expect(prefixedLanguage("/en")).toBe("en");
    expect(prefixedLanguage("/en/whatsapp")).toBe("en");
    expect(prefixedLanguage("/english")).toBeNull();
    expect(prefixedLanguage("/whatsapp")).toBeNull();
    expect(stripLanguage("/en")).toBe("/");
    expect(stripLanguage("/en/instagram")).toBe("/instagram");
    expect(stripLanguage("/instagram")).toBe("/instagram");
  });

  it("picks the first supported browser language and falls back to Spanish", () => {
    expect(browserLanguage(["en-US", "es-AR"])).toBe("en");
    expect(browserLanguage(["pt-BR", "es-MX"])).toBe("es");
    expect(browserLanguage(["fr-FR"])).toBe("es");
    expect(browserLanguage([])).toBe("es");
  });

  it("localizes only the paths that have an English version", () => {
    expect(localizedPath("/", "en")).toBe("/en");
    expect(localizedPath("/#demo", "en")).toBe("/en#demo");
    expect(localizedPath("/whatsapp", "en")).toBe("/en/whatsapp");
    expect(localizedPath("/privacidad", "en")).toBe("/privacy-policy");
    expect(localizedPath("/contratos", "en")).toBe("/contratos");
    expect(localizedPath("/register?plan=STARTER", "en")).toBe("/register?plan=STARTER");
    expect(localizedPath("mailto:support@boxlead.app", "en")).toBe("mailto:support@boxlead.app");
    expect(localizedPath("/whatsapp", "es")).toBe("/whatsapp");
  });

  it("lists both versions of a translated page", () => {
    expect(alternatePaths("/en/mercadolibre")).toEqual([
      { language: "es", path: "/mercadolibre" },
      { language: "en", path: "/en/mercadolibre" },
    ]);
    expect(alternatePaths("/terminos")).toEqual([]);
  });

  it("fixes the language of public pages and leaves the app to the preference", () => {
    expect(routeLanguage("/")).toBe("es");
    expect(routeLanguage("/en/agencias")).toBe("en");
    expect(routeLanguage("/terms-of-service")).toBe("en");
    expect(routeLanguage("/esto-no-existe")).toBeNull();
    expect(routeLanguage("/login")).toBeNull();
    expect(routeLanguage("/app/inbox")).toBeNull();
  });

  it("turns message links into parts and plain text", () => {
    expect(parseRich("Mirá la [Política](/privacidad) hoy.")).toEqual(["Mirá la ", { label: "Política", href: "/privacidad" }, " hoy."]);
    expect(plainText("Con [WhatsApp](/whatsapp) y [Instagram](/instagram).")).toBe("Con WhatsApp y Instagram.");
  });
});
