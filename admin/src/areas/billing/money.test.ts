import { describe, expect, it } from "vitest";
import { canRefund, parseAmount, refundable } from "./money";

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

  it("knows what is left of a payment and when it can be refunded", () => {
    const payment = { status: "PARTIALLY_REFUNDED" as const, amount: ars(8700000), refunded: ars(2000000) };
    expect(refundable(payment)).toEqual(ars(6700000));
    expect(canRefund(payment)).toBe(true);
    expect(canRefund({ ...payment, refunded: ars(8700000) })).toBe(false);
    expect(canRefund({ ...payment, status: "CHARGED_BACK" })).toBe(false);
    expect(canRefund({ ...payment, status: "APPROVED", refunded: ars(0) })).toBe(true);
  });
});
