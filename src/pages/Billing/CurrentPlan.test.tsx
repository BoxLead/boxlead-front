import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BillingPlan, BillingSummary, CurrentPlan as Plan, SubscriptionSummary } from "../../api/types";
import { CurrentPlan } from "./CurrentPlan";
import { PlanList } from "./PlanList";

const SUSPENDED: SubscriptionSummary = {
  status: "SUSPENDED",
  price: { amountMinor: 8700000, currency: "ARS" },
  currentPeriodEnd: "2026-10-20T03:00:00Z",
  graceUntil: "2026-10-27T03:00:00Z",
  cancelAtPeriodEnd: false,
  pendingPlanCode: null,
  updatePaymentUrl: "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=abc",
};

function summary(plan: Plan | null, patch: Partial<BillingSummary> = {}): BillingSummary {
  return {
    access: plan ? "FULL" : "RESTRICTED",
    plan,
    subscription: null,
    demo: null,
    checkout: null,
    usage: { agentReplies: { used: 30, limit: 5000 }, periodEnd: "2026-11-01T03:00:00Z" },
    limits: { AGENT_REPLIES_PER_PERIOD: 5000, AGENTS_MAX: 10 },
    billingProfileComplete: true,
    ...patch,
  };
}

function renderPlan(data: BillingSummary) {
  render(<CurrentPlan summary={data} planName={(code) => code} busy={false} onCancel={() => undefined} onKeep={() => undefined} />);
}

const TEAM: Plan = { code: "BUSINESS", name: "Business", source: "TEAM" };

const PLANS: BillingPlan[] = (["STARTER", "BUSINESS"] as const).map((code) => ({
  code,
  name: code === "STARTER" ? "Starter" : "Business",
  versionId: code,
  inviteOnly: false,
  price: { amountMinor: 6000, currency: "USD" },
  frequencyMonths: 1,
  priceIncludesVat: true,
  limits: {},
}));

describe("CurrentPlan", () => {
  it("says there is no plan when core sends a null plan", () => {
    renderPlan(summary(null, { limits: { METRICS_HISTORY_DAYS: 30 } }));
    expect(screen.getByText("Sin plan")).toBeInTheDocument();
    expect(screen.getByText("Elegí un plan para que tus agentes respondan y puedas enviar mensajes.")).toBeInTheDocument();
    expect(screen.queryByText("Respuestas de agentes")).not.toBeInTheDocument();
  });

  it("reads a plan without code nor name from the NONE source as no plan", () => {
    renderPlan(summary({ code: null, name: null, source: "NONE" }));
    expect(screen.getByText("Sin plan")).toBeInTheDocument();
    expect(screen.getByText("Elegí un plan para que tus agentes respondan y puedas enviar mensajes.")).toBeInTheDocument();
  });

  it("tells a team account it uses BoxLead for free and offers nothing to buy or cancel", () => {
    renderPlan(summary(TEAM, { subscription: SUSPENDED }));
    expect(screen.getByText("Equipo de BoxLead")).toBeInTheDocument();
    expect(screen.getByText("Sin cargo")).toBeInTheDocument();
    expect(screen.getByText(/Esta cuenta es del equipo de BoxLead\. Usás la app sin pagar con los límites de Business/)).toBeInTheDocument();
    expect(screen.queryByText("Suspendida")).not.toBeInTheDocument();
    expect(screen.queryByText("Tus agentes están apagados hasta que se regularice el pago.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cambiar el medio de pago" })).not.toBeInTheDocument();
    expect(screen.getByText("30 de 5.000 respuestas")).toBeInTheDocument();
  });

  it("keeps a team account without an active Business version readable", () => {
    renderPlan(summary({ code: null, name: null, source: "TEAM" }, { limits: { AGENT_REPLIES_PER_PERIOD: 0 } }));
    expect(screen.getByText("Equipo de BoxLead")).toBeInTheDocument();
  });
});

describe("PlanList", () => {
  it("offers no purchase to a team account", () => {
    render(
      <PlanList plans={PLANS} summary={summary(TEAM)} busy={false} onBuy={() => undefined} onChange={() => undefined} />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers each plan without one", () => {
    render(<PlanList plans={PLANS} summary={summary(null)} busy={false} onBuy={() => undefined} onChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "Contratar Starter" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Contratar Business" })).toBeEnabled();
  });
});
