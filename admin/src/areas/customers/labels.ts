import {
  INVOICE_STATUS,
  labelsOf,
  PAYMENT_STATUS,
  PLAN_LABELS,
  PLAN_SOURCE_LABELS,
  planLabel,
  planWithSource,
  SUBSCRIPTION_STATUS,
  TEAM_LABEL,
  tonesOf,
} from "../../status";
import type { Access, AttributionSource, CheckoutStatus, EntitlementKey, SubscriptionStatus } from "./types";

export const NO_SUBSCRIPTION = "NONE";

export { PLAN_LABELS, PLAN_SOURCE_LABELS, planLabel, planWithSource, TEAM_LABEL };

export const TEAM_FILTER = "TEAM";

export const SUBSCRIPTION_LABELS = labelsOf(SUBSCRIPTION_STATUS);
export const SUBSCRIPTION_TONES = tonesOf(SUBSCRIPTION_STATUS);
export const PAYMENT_LABELS = labelsOf(PAYMENT_STATUS);
export const PAYMENT_TONES = tonesOf(PAYMENT_STATUS);
export const INVOICE_LABELS = labelsOf(INVOICE_STATUS);

export const CHECKOUT_LABELS: Record<CheckoutStatus, string> = {
  WAITING: "Esperando el pago",
  PENDING: "Pago pendiente",
  REJECTED: "Pago rechazado",
};

export const SOURCE_LABELS: Record<AttributionSource, string> = {
  COOKIE: "Link de referido",
  INVITATION: "Invitación",
  ADMIN: "Corrección del equipo",
};

export const ACCESS_LABELS: Record<Access, string> = {
  FULL: "Completo",
  RESTRICTED: "Restringido",
};

export const LIMIT_LABELS: Record<EntitlementKey, string> = {
  AGENT_REPLIES_PER_PERIOD: "Respuestas del agente por período",
  AGENTS_MAX: "Agentes",
  PLAYGROUND_RUNS_PER_HOUR: "Pruebas del agente por hora",
  LLM_COST_CAP_MICROS: "Tope de costo de IA del período",
  METRICS_HISTORY_DAYS: "Días de historial de métricas",
  PUBLIC_COMMENT_REPLIES: "Respuestas a comentarios públicos",
  AUTO_CATEGORIZE: "Categorización automática",
  DEMO_DURATION_DAYS: "Días de Demo",
};

const CANCEL_LABELS: Record<string, string> = {
  USER_CANCELED: "La canceló el cliente",
  ADMIN_CANCELED: "La canceló el equipo",
  PROVIDER_CANCELED: "La canceló Mercado Pago",
  REFUNDED: "Reembolso total",
  CHARGEBACK_LOST: "Contracargo perdido",
  CHECKOUT_REPLACED: "Checkout reemplazado",
  CHECKOUT_EXPIRED: "Checkout vencido",
  GRACE_EXPIRED: "Venció la gracia",
  SUSPENSION_EXPIRED: "Venció la suspensión",
};

export function cancelReasonLabel(cause: string): string {
  return CANCEL_LABELS[cause] ?? cause;
}

export function subscriptionLabel(status: string): string {
  return status in SUBSCRIPTION_LABELS ? SUBSCRIPTION_LABELS[status as SubscriptionStatus] : status;
}
