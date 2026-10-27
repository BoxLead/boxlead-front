import type { FilterOption } from "../../components/list/Filters";
import {
  INVOICE_STATUS,
  PAYMENT_STATUS,
  PLAN_LABELS,
  planLabel,
  REFUND_STATUS,
  SUBSCRIPTION_STATUS,
  type StatusLabel,
} from "../../status";

export type { StatusLabel };
export { INVOICE_STATUS, PAYMENT_STATUS, PLAN_LABELS, planLabel, REFUND_STATUS, SUBSCRIPTION_STATUS };

const CANCEL_CAUSES: Record<string, string> = {
  USER_CANCELED: "la dio de baja el cliente",
  ADMIN_CANCELED: "la canceló el equipo",
  PROVIDER_CANCELED: "la canceló Mercado Pago",
  REFUNDED: "por un reembolso",
  SUSPENSION_EXPIRED: "por falta de pago",
  CHARGEBACK_LOST: "por un contracargo perdido",
  CHECKOUT_REPLACED: "por otro checkout",
  CHECKOUT_EXPIRED: "porque el checkout venció",
};

export function cancelCause(cause: string | null): string | null {
  return cause ? (CANCEL_CAUSES[cause] ?? null) : null;
}

function options<K extends string>(labels: Record<K, StatusLabel | string>): FilterOption[] {
  return Object.entries<StatusLabel | string>(labels).map(([value, label]) => ({
    value,
    label: typeof label === "string" ? label : label.label,
  }));
}

export const SUBSCRIPTION_STATUS_OPTIONS = options(SUBSCRIPTION_STATUS);
export const PAYMENT_STATUS_OPTIONS = options(PAYMENT_STATUS);
export const REFUND_STATUS_OPTIONS = options(REFUND_STATUS);
export const INVOICE_STATUS_OPTIONS = options(INVOICE_STATUS);
export const PLAN_OPTIONS = options(PLAN_LABELS);
