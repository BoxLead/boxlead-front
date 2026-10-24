import { describe, expect, it } from "vitest";
import { SOCIAL_PROVIDERS, socialRedirectUri } from "./social";

describe("social login", () => {
  it("builds the redirect uri from the origin", () => {
    expect(socialRedirectUri("https://boxlead.app")).toBe("https://boxlead.app/social/callback");
  });

  it("offers Google and Facebook through their Auth0 connections", () => {
    expect(SOCIAL_PROVIDERS.map((p) => [p.id, p.connection])).toEqual([
      ["google", "google-oauth2"],
      ["facebook", "facebook"],
    ]);
  });
});
