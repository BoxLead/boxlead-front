import { describe, expect, it } from "vitest";
import type { CommissionEntry, CommissionTotal } from "../api/types";
import { activeCodes, sortEntries, sortTotals } from "./referrals";

function total(status: CommissionTotal["status"], currency = "ARS"): CommissionTotal {
  return { status, amount: { amountMinor: 100, currency } };
}

function entry(date: string): CommissionEntry {
  return {
    date,
    customerLabel: "Negocio SRL",
    cycle: 1,
    amount: { amountMinor: 100, currency: "ARS" },
    status: "ACCRUED",
    releaseAt: null,
  };
}

describe("referrals", () => {
  it("keeps only the active codes", () => {
    const codes = activeCodes([
      { code: "AAAAAAAAAA", link: "https://api.boxlead.app/r/AAAAAAAAAA", status: "DISABLED" },
      { code: "BBBBBBBBBB", link: "https://api.boxlead.app/r/BBBBBBBBBB", status: "ACTIVE" },
    ]);
    expect(codes.map((code) => code.code)).toEqual(["BBBBBBBBBB"]);
  });

  it("orders the totals along the life of a commission", () => {
    const sorted = sortTotals([total("PAID"), total("REVERSED"), total("ACCRUED"), total("APPROVED"), total("HELD")]);
    expect(sorted.map((item) => item.status)).toEqual(["ACCRUED", "HELD", "APPROVED", "PAID", "REVERSED"]);
  });

  it("keeps one total per currency next to each other", () => {
    const sorted = sortTotals([total("PAID", "USD"), total("ACCRUED"), total("PAID", "ARS")]);
    expect(sorted.map((item) => `${item.status} ${item.amount.currency}`)).toEqual(["ACCRUED ARS", "PAID ARS", "PAID USD"]);
  });

  it("lists the newest commissions first and leaves unreadable dates last", () => {
    const sorted = sortEntries([entry("2026-09-01T10:00:00Z"), entry("nope"), entry("2026-10-20T10:00:00Z")]);
    expect(sorted.map((item) => item.date)).toEqual(["2026-10-20T10:00:00Z", "2026-09-01T10:00:00Z", "nope"]);
  });

  it("does not change the response it sorts", () => {
    const totals = [total("PAID"), total("ACCRUED")];
    sortTotals(totals);
    expect(totals.map((item) => item.status)).toEqual(["PAID", "ACCRUED"]);
  });
});
