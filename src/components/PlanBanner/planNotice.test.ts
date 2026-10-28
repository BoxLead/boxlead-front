import { describe, expect, it } from "vitest";
import type { BillingSummary, SubscriptionSummary } from "../../api/types";
import { planErrorNotice, planNotice, safePaymentUrl } from "./planNotice";

const NOW = new Date("2026-11-10T12:00:00Z");
const PAY_URL = "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=abc";

function summary(patch: Partial<BillingSummary> = {}): BillingSummary {
  return {
    access: "FULL",
    plan: { code: "STARTER", name: "Starter", source: "SUBSCRIPTION" },
    subscription: null,
    demo: null,
    checkout: null,
    usage: { agentReplies: { used: 120, limit: 1000 }, periodEnd: "2026-11-28T03:00:00Z" },
    limits: { AGENT_REPLIES_PER_PERIOD: 1000, AGENTS_MAX: 3 },
    billingProfileComplete: true,
    ...patch,
  };
}

function subscription(patch: Partial<SubscriptionSummary>): SubscriptionSummary {
  return {
    status: "ACTIVE",
    price: { amountMinor: 0, currency: "ARS" },
    currentPeriodEnd: "2026-11-28T03:00:00Z",
    graceUntil: null,
    cancelAtPeriodEnd: false,
    pendingPlanCode: null,
    updatePaymentUrl: null,
    ...patch,
  };
}

describe("planNotice", () => {
  it("stays quiet on an active plan with room left", () => {
    expect(planNotice(summary({ subscription: subscription({}) }), NOW)).toBeNull();
  });

  it("warns that the demo ends within a week", () => {
    const demo = summary({
      plan: { code: "DEMO", name: "Beta", source: "DEMO" },
      demo: { endsAt: "2026-11-14T12:00:00Z" },
    });
    expect(planNotice(demo, NOW)).toMatchObject({
      kind: "demo-ending",
      tone: "info",
      title: "Tu Beta termina pronto",
      action: { href: "/app/billing", external: false },
    });
    expect(planNotice({ ...demo, demo: { endsAt: "2026-11-30T12:00:00Z" } }, NOW)).toBeNull();
  });

  it("asks for a new payment method when the charge failed", () => {
    const notice = planNotice(
      summary({ subscription: subscription({ status: "PAST_DUE", graceUntil: "2026-11-15T12:00:00Z", updatePaymentUrl: PAY_URL }) }),
      NOW,
    );
    expect(notice).toMatchObject({
      kind: "past-due",
      tone: "warning",
      action: { label: "Cambiar medio de pago", href: PAY_URL, external: true },
    });
    expect(notice?.text).toContain("antes del 15 de noviembre");
  });

  it("explains a suspended plan with the payment link", () => {
    const notice = planNotice(
      summary({ access: "RESTRICTED", subscription: subscription({ status: "SUSPENDED", updatePaymentUrl: PAY_URL }) }),
      NOW,
    );
    expect(notice).toMatchObject({ kind: "suspended", tone: "danger", action: { href: PAY_URL, external: true } });
  });

  it("explains a paused plan", () => {
    const notice = planNotice(summary({ access: "RESTRICTED", subscription: subscription({ status: "PAUSED" }) }), NOW);
    expect(notice).toMatchObject({ kind: "paused", tone: "danger", action: { href: "/app/billing" } });
  });

  it("explains what works without a plan", () => {
    const notice = planNotice(summary({ access: "RESTRICTED", plan: null, limits: {} }), NOW);
    expect(notice).toMatchObject({ kind: "no-plan", title: "No tenés un plan activo", action: { label: "Elegir un plan" } });
  });

  it("warns when the agents used every reply of the period", () => {
    const notice = planNotice(
      summary({ usage: { agentReplies: { used: 1000, limit: 1000 }, periodEnd: "2026-11-28T12:00:00Z" } }),
      NOW,
    );
    expect(notice).toMatchObject({ kind: "replies-limit", title: "Tus agentes usaron todas las respuestas del plan" });
    expect(notice?.text).toContain("28 de noviembre");
  });

  it("ignores usage when the plan sets no reply limit", () => {
    const unlimited = summary({ limits: {}, usage: { agentReplies: { used: 5000, limit: null }, periodEnd: "2026-11-28T12:00:00Z" } });
    expect(planNotice(unlimited, NOW)).toBeNull();
  });

  it("says nothing about an own subscription to a team account", () => {
    const team = summary({
      plan: { code: "BUSINESS", name: "Business", source: "TEAM" },
      subscription: subscription({ status: "SUSPENDED", updatePaymentUrl: PAY_URL }),
    });
    expect(planNotice(team, NOW)).toBeNull();
    expect(planNotice({ ...team, subscription: subscription({ status: "PAST_DUE" }) }, NOW)).toBeNull();
  });

  it("tells a team account when the replies run out without offering plans", () => {
    const team = summary({
      plan: { code: "BUSINESS", name: "Business", source: "TEAM" },
      usage: { agentReplies: { used: 1000, limit: 1000 }, periodEnd: "2026-12-01T03:00:00Z" },
    });
    const notice = planNotice(team, NOW);
    expect(notice).toMatchObject({
      kind: "replies-limit",
      title: "Tus agentes usaron todas las respuestas del período",
      action: { label: "Ir a facturación" },
    });
    expect(notice?.text).not.toContain("plan");
  });

  it("never links to a payment page outside Mercado Pago", () => {
    const notice = planNotice(
      summary({ subscription: subscription({ status: "PAST_DUE", updatePaymentUrl: "https://evil.example/pay" }) }),
      NOW,
    );
    expect(notice?.action).toEqual({ label: "Ir a facturación", href: "/app/billing", external: false });
    expect(safePaymentUrl("http://www.mercadopago.com.ar/x")).toBeNull();
    expect(safePaymentUrl("not a url")).toBeNull();
    expect(safePaymentUrl(PAY_URL)).toBe(PAY_URL);
  });
});

describe("planErrorNotice", () => {
  it("points to billing after a plan limit", () => {
    expect(planErrorNotice("PLAN_LIMIT_REACHED", null)).toMatchObject({
      title: "Llegaste al límite de tu plan",
      action: { href: "/app/billing" },
    });
  });

  it("does not repeat a missing plan that the plan notice already explains", () => {
    const noPlan = planNotice(summary({ access: "RESTRICTED", plan: null }), NOW);
    expect(planErrorNotice("PLAN_REQUIRED", noPlan)).toBeNull();
    expect(planErrorNotice("PLAN_REQUIRED", null)).toMatchObject({ title: "Necesitás un plan activo" });
  });
});
