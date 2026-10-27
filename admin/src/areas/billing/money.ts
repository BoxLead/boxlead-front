import type { Money } from "../../api/types";
import type { PaymentRow, PaymentStatus } from "./types";

const REFUNDABLE: readonly PaymentStatus[] = ["APPROVED", "PARTIALLY_REFUNDED"];

export function fractionDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function refundable(payment: Pick<PaymentRow, "amount" | "refunded">): Money {
  const left = payment.amount.amountMinor - payment.refunded.amountMinor;
  return { amountMinor: Math.max(0, left), currency: payment.amount.currency };
}

export function canRefund(payment: Pick<PaymentRow, "status" | "amount" | "refunded">): boolean {
  return REFUNDABLE.includes(payment.status) && refundable(payment).amountMinor > 0;
}

export function parseAmount(text: string, currency: string): number | null {
  const digits = fractionDigits(currency);
  const compact = text.replace(/\s/g, "");
  if (!compact) return null;
  const grouped = compact.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(compact);
  const normalized = grouped ? compact.replace(/\./g, "").replace(",", ".") : compact;
  const pattern = digits > 0 ? new RegExp(`^\\d+(\\.\\d{1,${digits}})?$`) : /^\d+$/;
  if (!pattern.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0") || "0");
  return Number.isSafeInteger(minor) ? minor : null;
}
