import { describe, expect, it } from "vitest";
import { i18n } from "../../i18n";
import { pendingDocuments } from "./legalDocuments";

describe("pendingDocuments", () => {
  it("names each pending version and links the published page", () => {
    const docs = pendingDocuments(
      [
        { kind: "TERMS", version: "2026-11" },
        { kind: "PRIVACY", version: "2026-11" },
      ],
      [{ kind: "TERMS", version: "2026-11", language: "es", url: "/terminos", requiresAcceptance: true }],
    );
    expect(docs).toEqual([
      { kind: "TERMS", version: "2026-11", label: "Términos y condiciones", path: "/terminos" },
      { kind: "PRIVACY", version: "2026-11", label: "Política de privacidad", path: "/privacidad" },
    ]);
  });

  it("never links outside the app", () => {
    const [doc] = pendingDocuments(
      [{ kind: "RESELLER_AGREEMENT", version: "1" }],
      [{ kind: "RESELLER_AGREEMENT", version: "1", language: "es", url: "//evil.example", requiresAcceptance: true }],
    );
    expect(doc.path).toBeNull();
  });
});

describe("pendingDocuments in English", () => {
  it("names the documents in English and keeps the Spanish pages", async () => {
    await i18n.changeLanguage("en");
    const [doc] = pendingDocuments([{ kind: "TERMS", version: "2026-11" }], undefined);
    expect(doc).toEqual({ kind: "TERMS", version: "2026-11", label: "Terms and conditions", path: "/terminos" });
  });
});
