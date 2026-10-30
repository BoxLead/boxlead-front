import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LegalDocument } from "../../api/types";
import { i18n } from "../../i18n";
import { LegalConsent } from "./LegalConsent";

const DOCUMENTS: LegalDocument[] = [
  { kind: "TERMS", version: "3", language: "es", url: "/terminos", requiresAcceptance: true },
  { kind: "PRIVACY", version: "2", language: "es", url: "/privacidad", requiresAcceptance: true },
  { kind: "ADHESION_CONTRACT", version: "1", language: "es", url: "/contratos", requiresAcceptance: true },
];

function renderConsent(documents: LegalDocument[] = DOCUMENTS) {
  render(
    <LegalConsent state="ready" documents={documents} checked={false} disabled={false} onChange={() => undefined} onRetry={() => undefined} />,
  );
}

describe("LegalConsent", () => {
  it("links each document in Spanish", () => {
    renderConsent();
    expect(screen.getByRole("checkbox")).toHaveAccessibleName(
      "Leí y acepto los Términos y condiciones, la Política de privacidad y el Contrato de adhesión de BoxLead, y que el pago lo procesa Mercado Pago según sus términos.",
    );
    expect(screen.getByRole("link", { name: "la Política de privacidad" })).toHaveAttribute("href", "/privacidad");
  });

  it("reads in English", async () => {
    await i18n.changeLanguage("en");
    renderConsent();
    expect(screen.getByRole("checkbox")).toHaveAccessibleName(
      "I've read and accept BoxLead's Terms of Service, Privacy Policy and Adhesion Contract, and that Mercado Pago processes the payment under its terms.",
    );
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terminos");
  });

  it("only mentions Mercado Pago without documents", async () => {
    await i18n.changeLanguage("en");
    renderConsent([]);
    expect(screen.getByRole("checkbox")).toHaveAccessibleName("I accept that Mercado Pago processes the payment under its terms.");
  });
});
