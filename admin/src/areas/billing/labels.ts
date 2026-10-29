import type { FilterOption } from "../../components/list/Filters";
import type { SubscriptionCancellation } from "./types";
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
export const REFUND_IN_PROCESS: StatusLabel = { label: "En proceso", tone: "accent" };

export function refundStatusOf(refund: { status: keyof typeof REFUND_STATUS; providerRefundId: string | null }): StatusLabel {
  return refund.status === "REQUESTED" && refund.providerRefundId ? REFUND_IN_PROCESS : REFUND_STATUS[refund.status];
}

export function canRetryRefund(refund: { status: keyof typeof REFUND_STATUS; providerRefundId: string | null }): boolean {
  return refund.status === "REQUESTED" && !refund.providerRefundId;
}

export const REFUND_STATUS_OPTIONS = options(REFUND_STATUS).map((option) =>
  option.value === "REQUESTED" ? { ...option, label: "Sin respuesta o en proceso" } : option,
);
export const INVOICE_STATUS_OPTIONS = options(INVOICE_STATUS);
export const PLAN_OPTIONS = options(PLAN_LABELS).filter((option) => option.value !== "DEMO");

export const REFUND_NEEDED: StatusLabel = { label: "Para devolver", tone: "warning" };

export type RefundNotice = { tone: "success" | "info" | "danger"; message: string };

const CANCEL_FAILED =
  "Mercado Pago no confirmó la cancelación de la suscripción, así que sigue viva y puede volver a cobrar. La tiene que cancelar un Dueño desde Suscripciones.";

const CANCEL_PENDING = "El reembolso quedó en proceso. La suscripción se cancela sola cuando Mercado Pago lo confirme.";

export function withCancellation(notice: RefundNotice, cancellation: SubscriptionCancellation | undefined): RefundNotice {
  if (cancellation === "FAILED") return { tone: "danger", message: `${notice.message} ${CANCEL_FAILED}` };
  if (cancellation === "PENDING") return { ...notice, message: `${notice.message} ${CANCEL_PENDING}` };
  if (cancellation === "CANCELED") return { ...notice, message: `${notice.message} La suscripción quedó cancelada.` };
  return notice;
}
