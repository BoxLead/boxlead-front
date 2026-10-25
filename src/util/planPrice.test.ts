import { describe, expect, it } from "vitest";
import type { BillingPlan } from "../api/types";
import { formatMinor, formatPeriod, planPrice } from "./planPrice";

const plain = (value: string) => value.replace(/\s/g, " ");

const starter: BillingPlan = {
  code: "STARTER",
  name: "Starter",
  versionId: "v1",
  inviteOnly: false,
  price: { amountMinor: 6000, currency: "USD" },
  chargeToday: { amountMinor: 8700000, currency: "ARS" },
  fxRate: { day: "2026-10-24", source: "BNA", rate: "1450.00" },
  frequencyMonths: 1,
  priceIncludesVat: true,
  priceWithoutNationalTaxes: { amountMinor: 7190082, currency: "ARS" },
  limits: {},
};

describe("formatMinor", () => {
  it("shows pesos with the symbol and drops empty cents", () => {
    expect(plain(formatMinor({ amountMinor: 8700000, currency: "ARS" }))).toBe("$ 87.000");
  });

  it("keeps the cents when there are any", () => {
    expect(plain(formatMinor({ amountMinor: 7190082, currency: "ARS" }))).toBe("$ 71.900,82");
  });

  it("names dollars by their code", () => {
    expect(plain(formatMinor({ amountMinor: 6000, currency: "USD" }))).toBe("USD 60");
  });
});

describe("formatPeriod", () => {
  it("describes monthly and longer periods", () => {
    expect(formatPeriod(1)).toBe("por mes");
    expect(formatPeriod(3)).toBe("cada 3 meses");
    expect(formatPeriod(null)).toBe("");
  });
});

describe("planPrice", () => {
  it("leads with today's charge in pesos and keeps the dollars as a reference", () => {
    const price = planPrice(starter);
    expect(price && plain(price.amount)).toBe("$ 87.000");
    expect(price?.period).toBe("por mes");
    expect(price?.withoutNationalTaxes && plain(price.withoutNationalTaxes)).toBe("$ 71.900,82");
    expect(price?.reference && plain(price.reference)).toBe("USD 60 con IVA incluido");
    expect(price?.rateDay).toBe("24 de octubre");
  });

  it("falls back to the catalog price when there is no charge for today", () => {
    const price = planPrice({ ...starter, chargeToday: null, fxRate: null, priceWithoutNationalTaxes: null });
    expect(price && plain(price.amount)).toBe("USD 60");
    expect(price?.reference).toBeNull();
    expect(price?.rateDay).toBeNull();
    expect(price?.withoutNationalTaxes).toBeNull();
  });

  it("has nothing to show for a plan without amounts", () => {
    expect(planPrice({ ...starter, code: "ENTERPRISE", contactOnly: true, price: null, chargeToday: null })).toBeNull();
  });
});
