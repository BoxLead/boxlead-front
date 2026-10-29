import { cleanup, render, screen } from "@testing-library/react";
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

  it("tells a team account it uses BoxLead for free and offers nothing to cancel without an own subscription", () => {
    renderPlan(summary(TEAM));
    expect(screen.getByText("Equipo de BoxLead")).toBeInTheDocument();
    expect(screen.getByText("Sin cargo")).toBeInTheDocument();
    expect(screen.getByText(/Esta cuenta es del equipo de BoxLead\. Usás la app sin pagar con los límites de Business/)).toBeInTheDocument();
    expect(screen.queryByText(/plan pago propio/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("30 de 5.000 respuestas")).toBeInTheDocument();
  });

  it("keeps showing the own subscription of a team account with its charge and its cancel", () => {
    const active: SubscriptionSummary = { ...SUSPENDED, status: "ACTIVE", graceUntil: null, updatePaymentUrl: null, pendingPlanCode: "STARTER" };
    renderPlan(summary(TEAM, { subscription: active }));
    expect(screen.getByText("Equipo de BoxLead")).toBeInTheDocument();
    expect(screen.getByText(/También tenés un plan pago propio que hoy figura como/)).toHaveTextContent(
      "También tenés un plan pago propio que hoy figura como Activo. No lo necesitás para usar BoxLead, pero Mercado Pago te lo sigue cobrando hasta que lo des de baja.",
    );
    expect(screen.getByText(/^Próxima cuota de/)).toBeInTheDocument();
    expect(screen.getByText(/^Pasás a STARTER el/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dar de baja" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^Seguir en/ })).not.toBeInTheDocument();
  });

  it("tells a team account its own suspended subscription is still charged and how to pay it", () => {
    renderPlan(summary(TEAM, { subscription: SUSPENDED }));
    expect(screen.getByText(/También tenés un plan pago propio/)).toHaveTextContent("hoy figura como Suspendido. No lo necesitás para usar BoxLead, pero Mercado Pago te lo sigue cobrando");
    expect(screen.getByRole("link", { name: "Cambiar el medio de pago" })).toHaveAttribute("href", SUSPENDED.updatePaymentUrl);
    expect(screen.queryByText("Tus agentes están apagados hasta que se regularice el pago.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });

  it("tells a team account what happens with a paused, past due or canceled own subscription", () => {
    renderPlan(summary(TEAM, { subscription: { ...SUSPENDED, status: "PAUSED", updatePaymentUrl: null } }));
    expect(screen.getByText(/Mientras esté pausado Mercado Pago no te lo cobra, pero si se reanuda te lo vuelve a cobrar\./)).toBeInTheDocument();
    expect(screen.queryByText(/te lo sigue cobrando/)).not.toBeInTheDocument();
    cleanup();
    renderPlan(summary(TEAM, { subscription: { ...SUSPENDED, status: "PAST_DUE" } }));
    expect(screen.getByText("Mercado Pago no pudo cobrar la cuota.")).toBeInTheDocument();
    expect(screen.queryByText(/Seguís con acceso/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dar de baja" })).toBeEnabled();
    cleanup();
    renderPlan(summary(TEAM, { subscription: { ...SUSPENDED, status: "ACTIVE", cancelAtPeriodEnd: true, updatePaymentUrl: null } }));
    expect(screen.getByText(/Lo diste de baja y termina el .+\. No se te cobra más\./)).toBeInTheDocument();
    expect(screen.queryByText(/Tenés acceso hasta/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });

  it("says the agents are off only when access is restricted", () => {
    const starter: Plan = { code: "STARTER", name: "Starter", source: "SUBSCRIPTION" };
    renderPlan(summary(starter, { access: "FULL", subscription: SUSPENDED }));
    expect(screen.queryByText("Tus agentes están apagados hasta que se regularice el pago.")).not.toBeInTheDocument();
    renderPlan(summary(starter, { access: "RESTRICTED", subscription: SUSPENDED }));
    expect(screen.getByText("Tus agentes están apagados hasta que se regularice el pago.")).toBeInTheDocument();
  });

  it("shows a scheduled upgrade like any pending change and offers to undo it", () => {
    const starter: Plan = { code: "STARTER", name: "Starter", source: "SUBSCRIPTION" };
    render(
      <CurrentPlan
        summary={summary(starter, { subscription: { ...SUSPENDED, status: "ACTIVE", updatePaymentUrl: null, pendingPlanCode: "BUSINESS" } })}
        planName={(code) => (code === "BUSINESS" ? "Business" : "Starter")}
        busy={false}
        onCancel={() => undefined}
        onKeep={() => undefined}
      />,
    );
    expect(screen.getByText(/^Pasás a Business el/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir en Starter" })).toBeEnabled();
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
