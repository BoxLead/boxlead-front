import { describe, expect, it } from "vitest";
import { canRefund, parseAmount, refundInProgress } from "./money";

const ars = (amountMinor: number) => ({ amountMinor, currency: "ARS" });

describe("refund amounts", () => {
  it("reads amounts the way people type them in Argentina", () => {
    expect(parseAmount("1234", "ARS")).toBe(123400);
    expect(parseAmount("1234,5", "ARS")).toBe(123450);
    expect(parseAmount("1.234,56", "ARS")).toBe(123456);
    expect(parseAmount("1.234", "ARS")).toBe(123400);
    expect(parseAmount("12.5", "ARS")).toBe(1250);
    expect(parseAmount(" 87 000 ", "ARS")).toBe(8700000);
  });

  it("refuses what is not an amount of that currency", () => {
    expect(parseAmount("", "ARS")).toBeNull();
    expect(parseAmount("-10", "ARS")).toBeNull();
    expect(parseAmount("1,234", "ARS")).toBeNull();
    expect(parseAmount("diez", "ARS")).toBeNull();
    expect(parseAmount("10,5", "CLP")).toBeNull();
    expect(parseAmount("1000", "CLP")).toBe(1000);
  });

  it("refunds only what core says is left, even before Mercado Pago confirms", () => {
    const payment = { status: "APPROVED" as const, amount: ars(8700000), refunded: ars(0), refundable: ars(0) };
    expect(canRefund(payment)).toBe(false);
    expect(refundInProgress(payment)).toEqual(ars(8700000));
    expect(canRefund({ ...payment, refundable: ars(100) })).toBe(true);
  });

  it("shows money in progress only while the payment can still be refunded", () => {
    const payment = { status: "PARTIALLY_REFUNDED" as const, amount: ars(8700000), refunded: ars(2000000), refundable: ars(5700000) };
    expect(refundInProgress(payment)).toEqual(ars(1000000));
    expect(refundInProgress({ ...payment, refundable: ars(6700000) })).toEqual(ars(0));
    expect(refundInProgress({ ...payment, status: "REFUNDED", refundable: ars(0) })).toEqual(ars(0));
  });
});
