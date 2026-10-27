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

export function canRefund(payment: Pick<PaymentRow, "refundable">): boolean {
  return payment.refundable.amountMinor > 0;
}

export function refundInProgress(payment: Pick<PaymentRow, "status" | "amount" | "refunded" | "refundable">): Money {
  const waiting = REFUNDABLE.includes(payment.status)
    ? payment.amount.amountMinor - payment.refunded.amountMinor - payment.refundable.amountMinor
    : 0;
  return { amountMinor: Math.max(0, waiting), currency: payment.amount.currency };
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
