import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { BillingSummary } from "../../api/types";
import { i18n } from "../../i18n";
import { BillingReturn } from "./BillingReturn";

const SUMMARY: BillingSummary = {
  access: "FULL",
  plan: { code: "STARTER", name: "Starter", source: "SUBSCRIPTION" },
  subscription: {
    status: "ACTIVE",
    price: { amountMinor: 6000, currency: "USD" },
    currentPeriodEnd: "2026-11-20T03:00:00Z",
    graceUntil: null,
    cancelAtPeriodEnd: false,
    pendingPlanCode: null,
    updatePaymentUrl: null,
  },
  demo: null,
  checkout: null,
  usage: { agentReplies: { used: 0, limit: 5000 }, periodEnd: "2026-11-20T03:00:00Z" },
  limits: {},
  billingProfileComplete: true,
};

vi.mock("../../data/subscription", () => ({ fetchSummary: () => Promise.resolve(SUMMARY) }));

function renderPage() {
  render(
    <MemoryRouter>
      <BillingReturn />
    </MemoryRouter>,
  );
}

describe("BillingReturn", () => {
  it("confirms the payment in Spanish", async () => {
    renderPage();
    expect(await screen.findByText("Tu pago está confirmado")).toBeInTheDocument();
    expect(screen.getByText("Ya tenés Starter. Tus agentes pueden responder.")).toBeInTheDocument();
  });

  it("reads in English", async () => {
    await i18n.changeLanguage("en");
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Payment status" })).toBeInTheDocument();
    expect(await screen.findByText("Your payment is confirmed")).toBeInTheDocument();
    expect(screen.getByText("You're now on Starter. Your agents can reply.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to inbox" })).toHaveAttribute("href", "/app/inbox");
    expect(screen.getByRole("link", { name: "View billing" })).toBeInTheDocument();
  });
});
