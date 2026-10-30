import { describe, expect, it } from "vitest";
import type { CommissionStatus, SubscriptionStatus } from "../../api/types";
import { COMMISSION_STATUSES } from "../../data/referrals";
import {
  COMMISSION_TONES,
  commissionLabel,
  cycleLabel,
  cycleProgress,
  formatAmount,
  subscriptionLabel,
} from "./resellerModel";

function plain(text: string): string {
  return text.replace(/\s/g, " ");
}

describe("formatAmount", () => {
  it("reads minor units with the currency and keeps the cents it has", () => {
    expect(plain(formatAmount({ amountMinor: 185175, currency: "ARS" }))).toBe("$ 1.851,75");
    expect(plain(formatAmount({ amountMinor: 5, currency: "ARS" }))).toBe("$ 0,05");
  });

  it("adds no decimals to whole amounts", () => {
    expect(plain(formatAmount({ amountMinor: 1666500, currency: "ARS" }))).toBe("$ 16.665");
    expect(plain(formatAmount({ amountMinor: 0, currency: "ARS" }))).toBe("$ 0");
  });

  it("shows reversals as negative amounts", () => {
    expect(plain(formatAmount({ amountMinor: -185175, currency: "ARS" }))).toBe("-$ 1.851,75");
  });

  it("names currencies other than the peso", () => {
    expect(plain(formatAmount({ amountMinor: 6050, currency: "USD" }))).toBe("US$ 60,50");
  });

  it("follows the exponent of each currency", () => {
    expect(plain(formatAmount({ amountMinor: 1500, currency: "JPY" }))).toBe("JPY 1.500");
    expect(plain(formatAmount({ amountMinor: 12345, currency: "KWD" }))).toBe("KWD 12,345");
  });

  it("never prints floating point noise", () => {
    expect(plain(formatAmount({ amountMinor: 10000030, currency: "ARS" }))).toBe("$ 100.000,30");
    expect(plain(formatAmount({ amountMinor: 29, currency: "ARS" }))).toBe("$ 0,29");
  });

  it("still shows the amount when the currency code is not valid", () => {
    expect(plain(formatAmount({ amountMinor: 185175, currency: "XX" }))).toBe("XX 1.851,75");
  });
});

describe("labels", () => {
  it("names every commission status", () => {
    const statuses: CommissionStatus[] = ["ACCRUED", "HELD", "APPROVED", "PAID", "REVERSED"];
    expect(COMMISSION_STATUSES).toEqual(statuses);
    expect(statuses.map((status) => commissionLabel(status).label)).toEqual([
      "Pendiente",
      "Retenida",
      "Aprobada",
      "Pagada",
      "Revertida",
    ]);
    expect(COMMISSION_TONES.PAID).toBe("success");
    expect(COMMISSION_TONES.REVERSED).toBe("danger");
  });

  it("names every subscription status", () => {
    const statuses: SubscriptionStatus[] = ["INCOMPLETE", "ACTIVE", "PAST_DUE", "SUSPENDED", "PAUSED", "CANCELED"];
    expect(statuses.map((status) => subscriptionLabel(status).label)).toEqual([
      "Sin pago",
      "Activo",
      "Pago atrasado",
      "Suspendido",
      "Pausado",
      "Dado de baja",
    ]);
  });
});

describe("unknown statuses", () => {
  it("show the raw status instead of breaking the page", () => {
    expect(commissionLabel("SETTLED" as CommissionStatus)).toEqual({ label: "SETTLED", tone: "neutral", hint: null });
    expect(subscriptionLabel("TRIAL" as SubscriptionStatus)).toEqual({ label: "TRIAL", tone: "neutral" });
    expect(commissionLabel("toString" as CommissionStatus).label).toBe("toString");
  });
});

describe("cycles", () => {
  it("tells which charge a customer is on", () => {
    expect(cycleLabel(3, 6)).toBe("Cobro 3 de 6");
    expect(cycleLabel(0, 6)).toBe("Sin cobros todavía");
  });

  it("fills one step per charge", () => {
    expect(cycleProgress(3, 6)).toEqual([true, true, true, false, false, false]);
    expect(cycleProgress(9, 6)).toEqual([true, true, true, true, true, true]);
    expect(cycleProgress(1, -1)).toEqual([]);
  });
});
