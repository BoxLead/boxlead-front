import type { TagTone } from "../../../../src/components/ui/Tag";
import type { FilterOption } from "../../components/list/Filters";
import type { InvoiceStatus, PaymentStatus, PlanCode, RefundStatus, SubscriptionStatus } from "./types";

export type StatusLabel = { label: string; tone: TagTone };

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, StatusLabel> = {
  INCOMPLETE: { label: "Sin pagar", tone: "warning" },
  ACTIVE: { label: "Activa", tone: "success" },
  PAST_DUE: { label: "Cuota impaga", tone: "warning" },
  SUSPENDED: { label: "Suspendida", tone: "danger" },
  PAUSED: { label: "Pausada", tone: "warning" },
  CANCELED: { label: "Cancelada", tone: "neutral" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusLabel> = {
  PENDING: { label: "Pendiente", tone: "warning" },
  APPROVED: { label: "Aprobado", tone: "success" },
  REJECTED: { label: "Rechazado", tone: "danger" },
  REFUNDED: { label: "Reembolsado", tone: "neutral" },
  PARTIALLY_REFUNDED: { label: "Reembolso parcial", tone: "neutral" },
  CHARGED_BACK: { label: "Contracargo", tone: "danger" },
  IN_MEDIATION: { label: "En mediación", tone: "warning" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};

export const REFUND_STATUS: Record<RefundStatus, StatusLabel> = {
  REQUESTED: { label: "Sin respuesta", tone: "warning" },
  APPROVED: { label: "Aprobado", tone: "success" },
  REJECTED: { label: "Rechazado", tone: "danger" },
};

export const INVOICE_STATUS: Record<InvoiceStatus, StatusLabel> = {
  PENDING: { label: "Para emitir", tone: "warning" },
  ISSUED: { label: "Emitida", tone: "success" },
  VOIDED: { label: "Anulada", tone: "neutral" },
};

export const PLAN_LABELS: Record<PlanCode, string> = {
  DEMO: "Demo",
  STARTER: "Starter",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

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

export function planLabel(code: string | null): string {
  if (!code) return "Sin plan";
  return code in PLAN_LABELS ? PLAN_LABELS[code as PlanCode] : code;
}

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
