import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { BillingPlan, BillingSummary } from "../../api/types";
import { ToastContext } from "../../components/ui/toast";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { BILLING_SUMMARY_KEY } from "../../data/billing";
import { PLANS_PATH } from "../../data/plans";
import { PAYMENTS_KEY } from "../../data/subscription";
import { i18n } from "../../i18n";
import { Billing } from "./Billing";

const queries = new Map<string, unknown>();

vi.mock("../../hooks/useApiQuery", () => ({
  useApiQuery: (key: string | null) => ({
    data: key ? queries.get(key) : undefined,
    error: null,
    loading: key ? !queries.has(key) : false,
    reload: () => undefined,
  }),
}));

const SUMMARY: BillingSummary = {
  access: "RESTRICTED",
  plan: null,
  subscription: null,
  demo: null,
  checkout: { planCode: "STARTER", status: "REJECTED" },
  usage: { agentReplies: { used: 0, limit: 0 }, periodEnd: "2026-11-01T03:00:00Z" },
  limits: {},
  billingProfileComplete: false,
};

const PLANS: BillingPlan[] = [
  {
    code: "STARTER",
    name: "Starter",
    versionId: "STARTER",
    inviteOnly: false,
    price: { amountMinor: 6000, currency: "USD" },
    frequencyMonths: 1,
    priceIncludesVat: true,
    limits: { AGENTS_MAX: 1 },
  },
  { code: "ENTERPRISE", name: "Enterprise", versionId: "ENTERPRISE", inviteOnly: false, contactOnly: true, price: null, frequencyMonths: null, priceIncludesVat: false, limits: {} },
];

const AUTH: AuthContextValue = {
  ...SESSION_FLAGS_OFF,
  user: null,
  login: async () => undefined,
  register: async () => undefined,
  socialLogin: async () => undefined,
  logout: () => undefined,
  refreshUser: async () => undefined,
  isLoading: false,
  error: null,
  clearError: () => undefined,
};

function renderPage() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={AUTH}>
        <ToastContext.Provider value={() => undefined}>
          <Billing />
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("Billing", () => {
  it("reads in English", async () => {
    await i18n.changeLanguage("en");
    queries.set(BILLING_SUMMARY_KEY, SUMMARY);
    queries.set(PLANS_PATH, PLANS);
    queries.set(PAYMENTS_KEY, []);
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Billing" })).toBeInTheDocument();
    expect(screen.getByText("Mercado Pago rejected your Starter payment")).toBeInTheDocument();
    expect(screen.getByText("No plan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Resume payment" })).toBeEnabled();
    expect(screen.getByText("Up to 1 agent")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact us" })).toBeInTheDocument();
    expect(screen.getByText("No payments yet")).toBeInTheDocument();
    expect(screen.getByText("You haven't added your tax details yet")).toBeInTheDocument();
  });

  it("keeps the Spanish copy", () => {
    queries.set(BILLING_SUMMARY_KEY, SUMMARY);
    queries.set(PLANS_PATH, PLANS);
    queries.set(PAYMENTS_KEY, []);
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Facturación" })).toBeInTheDocument();
    expect(screen.getByText("Mercado Pago rechazó el pago de Starter")).toBeInTheDocument();
    expect(screen.getByText("Hasta 1 agentes")).toBeInTheDocument();
    expect(screen.getByText("Todavía no cargaste tus datos fiscales")).toBeInTheDocument();
  });
});
