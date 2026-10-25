import { describe, expect, it } from "vitest";
import { readAcceptedLegal, signupLegal } from "./legalAcceptance";

const documents = [
  { kind: "TERMS", version: "2026-11", language: "es", url: "/terminos", requiresAcceptance: true },
  { kind: "PRIVACY", version: "2026-11", language: "es", url: "/privacidad", requiresAcceptance: true },
  { kind: "ADHESION_CONTRACT", version: "2026-11", language: "es", url: "/contratos", requiresAcceptance: true },
];

describe("signupLegal", () => {
  it("keeps the terms and the privacy policy the sign up has to accept", () => {
    expect(signupLegal(documents)).toEqual({
      versions: [
        { kind: "TERMS", version: "2026-11" },
        { kind: "PRIVACY", version: "2026-11" },
      ],
      termsUrl: "/terminos",
      privacyUrl: "/privacidad",
    });
  });

  it("ignores anything that is not a list with both documents", () => {
    expect(signupLegal({ error: "Not found" })).toBeNull();
    expect(signupLegal(documents.slice(1))).toBeNull();
  });

  it("refuses links that leave the site", () => {
    expect(signupLegal([{ ...documents[0], url: "https://evil.test/terminos" }, documents[1]])).toBeNull();
    expect(signupLegal([{ ...documents[0], url: "//evil.test" }, documents[1]])).toBeNull();
  });
});

describe("readAcceptedLegal", () => {
  it("reads the versions saved before going to the provider", () => {
    expect(readAcceptedLegal([{ kind: "TERMS", version: "2026-11" }, { kind: "PRIVACY", version: "2026-11" }])).toEqual([
      { kind: "TERMS", version: "2026-11" },
      { kind: "PRIVACY", version: "2026-11" },
    ]);
  });

  it("drops unexpected values", () => {
    expect(readAcceptedLegal(undefined)).toBeUndefined();
    expect(readAcceptedLegal("TERMS")).toBeUndefined();
    expect(readAcceptedLegal([{ kind: "ADMIN", version: "1" }, null])).toBeUndefined();
  });
});
