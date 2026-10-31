import { afterEach, describe, expect, it, vi } from "vitest";
import { preferredLanguage, rememberVisit, storeLanguage } from "./preference";

function browserLanguages(languages: string[]) {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(languages);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("language preference", () => {
  it("falls back to the browser language", () => {
    browserLanguages(["en-US"]);
    expect(preferredLanguage()).toBe("en");
  });

  it("keeps the language of the public page read in this session over the browser", () => {
    browserLanguages(["es-AR"]);
    rememberVisit("en");
    expect(preferredLanguage()).toBe("en");
  });

  it("puts the language chosen on purpose above everything else", () => {
    browserLanguages(["en-US"]);
    rememberVisit("en");
    storeLanguage("es");
    expect(preferredLanguage()).toBe("es");
  });
});
