import { describe, expect, it } from "vitest";
import type { BillingSummary, LegalDocument } from "../api/types";
import { checkoutLegal, checkoutOutcome, isCheckoutUrl, isSettled, paidPlanCode } from "./checkout";

const summary: BillingSummary = {
  access: "RESTRICTED",
  plan: null,
  subscription: null,
  demo: null,
  checkout: null,
  usage: { agentReplies: { used: 0, limit: 0 }, periodEnd: "2026-11-25T00:00:00Z" },
  limits: {},
  billingProfileComplete: true,
};

describe("isCheckoutUrl", () => {
  it("accepts the Mercado Pago checkout over https", () => {
    expect(isCheckoutUrl("https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=abc")).toBe(true);
  });

  it.each([
    "http://www.mercadopago.com.ar/subscriptions/checkout",
    "https://mercadopago.com.ar/subscriptions/checkout",
    "https://www.mercadopago.com.ar.evil.test/subscriptions/checkout",
    "https://evil.test/?next=https://www.mercadopago.com.ar/",
    "https://www.mercadopago.com.ar@evil.test/",
    "https://user:pass@www.mercadopago.com.ar/",
    "https://www.mercadopago.com.ar:8443/subscriptions/checkout",
    "https://www.mercadopago.com/subscriptions/checkout",
    "javascript:alert(1)",
    "/subscriptions/checkout",
    "",
  ])("rejects %s", (value) => {
    expect(isCheckoutUrl(value)).toBe(false);
  });

  it("rejects anything that is not text", () => {
    expect(isCheckoutUrl(undefined)).toBe(false);
    expect(isCheckoutUrl({ href: "https://www.mercadopago.com.ar/" })).toBe(false);
  });
});

describe("paidPlanCode", () => {
  it("only takes the plans that can be bought", () => {
    expect(paidPlanCode("STARTER")).toBe("STARTER");
    expect(paidPlanCode("BUSINESS")).toBe("BUSINESS");
    expect(paidPlanCode("ENTERPRISE")).toBeNull();
    expect(paidPlanCode("DEMO")).toBeNull();
    expect(paidPlanCode("starter")).toBeNull();
    expect(paidPlanCode(null)).toBeNull();
  });
});

describe("checkoutOutcome", () => {
  it("reads the result from the server summary", () => {
    expect(checkoutOutcome({ ...summary, checkout: { planCode: "STARTER", status: "WAITING" } })).toBe("waiting");
    expect(checkoutOutcome({ ...summary, checkout: { planCode: "STARTER", status: "PENDING" } })).toBe("pending");
    expect(checkoutOutcome({ ...summary, checkout: { planCode: "STARTER", status: "REJECTED" } })).toBe("rejected");
    expect(checkoutOutcome(summary)).toBe("none");
    expect(
      checkoutOutcome({
        ...summary,
        access: "FULL",
        subscription: {
          status: "ACTIVE",
          price: { amountMinor: 1, currency: "ARS" },
          currentPeriodEnd: "2026-11-25T00:00:00Z",
          graceUntil: null,
          cancelAtPeriodEnd: false,
          pendingPlanCode: null,
          updatePaymentUrl: null,
        },
      }),
    ).toBe("approved");
    const unpaid = {
      status: "PAST_DUE" as const,
      price: { amountMinor: 1, currency: "ARS" },
      currentPeriodEnd: "2026-11-25T00:00:00Z",
      graceUntil: null,
      cancelAtPeriodEnd: false,
      pendingPlanCode: null,
      updatePaymentUrl: null,
    };
    expect(checkoutOutcome({ ...summary, subscription: unpaid })).toBe("unpaid");
    expect(checkoutOutcome({ ...summary, subscription: { ...unpaid, status: "SUSPENDED" } })).toBe("unpaid");
  });

  it("keeps polling only while the payment can still change", () => {
    expect(isSettled("waiting")).toBe(false);
    expect(isSettled("pending")).toBe(false);
    expect(isSettled("unpaid")).toBe(false);
    expect(isSettled("approved")).toBe(true);
    expect(isSettled("rejected")).toBe(true);
    expect(isSettled("none")).toBe(true);
  });
});

describe("checkoutLegal", () => {
  it("accepts the terms, privacy and adhesion contract in force", () => {
    const documents: LegalDocument[] = [
      { kind: "TERMS", version: "2026-11", language: "es", url: "/terminos", requiresAcceptance: true },
      { kind: "PRIVACY", version: "2026-11", language: "es", url: "/privacidad", requiresAcceptance: true },
      { kind: "ADHESION_CONTRACT", version: "2026-11", language: "es", url: "/contratos", requiresAcceptance: true },
      { kind: "RESELLER_AGREEMENT", version: "2026-11", language: "es", url: "/contratos", requiresAcceptance: true },
      { kind: "DATA_PROCESSING", version: "2026-11", language: "es", url: "/privacidad", requiresAcceptance: false },
    ];
    expect(checkoutLegal(documents)).toEqual([
      { kind: "TERMS", version: "2026-11" },
      { kind: "PRIVACY", version: "2026-11" },
      { kind: "ADHESION_CONTRACT", version: "2026-11" },
    ]);
    expect(checkoutLegal([])).toEqual([]);
  });
});
