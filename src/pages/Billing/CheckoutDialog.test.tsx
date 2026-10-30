import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BillingPlan } from "../../api/types";
import { i18n } from "../../i18n";
import { CheckoutDialog } from "./CheckoutDialog";

vi.mock("../../data/subscription", () => ({
  CheckoutUrlError: class extends Error {},
  fetchCheckoutLegal: () => Promise.resolve([]),
  startCheckout: () => Promise.resolve("https://www.mercadopago.com.ar/checkout"),
  saveProfile: () => Promise.reject(new Error("not used")),
}));

const PLAN: BillingPlan = {
  code: "STARTER",
  name: "Starter",
  versionId: "STARTER",
  inviteOnly: false,
  price: { amountMinor: 6000, currency: "USD" },
  frequencyMonths: 1,
  priceIncludesVat: true,
  limits: {},
};

function renderDialog(profileComplete: boolean) {
  render(<CheckoutDialog plan={PLAN} planCode="STARTER" profileComplete={profileComplete} userEmail="ana@negocio.com" onClose={() => undefined} />);
}

describe("CheckoutDialog in English", () => {
  it("shows the purchase summary", async () => {
    await i18n.changeLanguage("en");
    renderDialog(true);
    expect(screen.getByRole("heading", { name: "Get Starter", hidden: true })).toBeInTheDocument();
    expect(screen.getByText("Final price with VAT")).toBeInTheDocument();
    expect(screen.getByText("Right of withdrawal")).toBeInTheDocument();
    expect(screen.getByLabelText("Your Mercado Pago account email")).toHaveValue("ana@negocio.com");
    expect(screen.getByRole("link", { name: "terms and conditions", hidden: true })).toBeInTheDocument();
    expect(await screen.findByRole("checkbox", { name: "I accept that Mercado Pago processes the payment under its terms.", hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to payment", hidden: true })).toBeEnabled();
  });

  it("asks for the tax details first", async () => {
    await i18n.changeLanguage("en");
    renderDialog(false);
    expect(screen.getByRole("heading", { name: "Your tax details", hidden: true })).toBeInTheDocument();
    expect(screen.getByLabelText("Legal name or full name")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Registered VAT taxpayer", hidden: true })).toBeInTheDocument();
    expect(screen.getByText("With or without dashes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue", hidden: true })).toBeEnabled();
  });
});
