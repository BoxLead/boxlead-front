import type { TagTone } from "../../../../src/components/ui/Tag";
import type {
  Access,
  AttributionSource,
  CheckoutStatus,
  EntitlementKey,
  InvoiceStatus,
  PaymentStatus,
  PlanCode,
  PlanSource,
  SubscriptionStatus,
} from "./types";

export const NO_SUBSCRIPTION = "NONE";

export const PLAN_LABELS: Record<PlanCode, string> = {
  DEMO: "Demo",
  STARTER: "Starter",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

export const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = {
  INCOMPLETE: "Incompleta",
  ACTIVE: "Activa",
  PAST_DUE: "Con pago vencido",
  SUSPENDED: "Suspendida",
  PAUSED: "Pausada",
  CANCELED: "Cancelada",
};

export const SUBSCRIPTION_TONES: Record<SubscriptionStatus, TagTone> = {
  INCOMPLETE: "neutral",
  ACTIVE: "success",
  PAST_DUE: "warning",
  SUSPENDED: "danger",
  PAUSED: "warning",
  CANCELED: "neutral",
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Reembolsado en parte",
  CHARGED_BACK: "Contracargo",
  IN_MEDIATION: "En mediación",
  CANCELLED: "Cancelado",
};

export const PAYMENT_TONES: Record<PaymentStatus, TagTone> = {
  PENDING: "neutral",
  APPROVED: "success",
  REJECTED: "danger",
  REFUNDED: "warning",
  PARTIALLY_REFUNDED: "warning",
  CHARGED_BACK: "danger",
  IN_MEDIATION: "warning",
  CANCELLED: "neutral",
};

export const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  PENDING: "Para emitir",
  ISSUED: "Emitida",
  VOIDED: "Anulada",
};

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

export const PLAN_SOURCE_LABELS: Record<PlanSource, string> = {
  SUBSCRIPTION: "Suscripción",
  DEMO: "Demo",
  NONE: "Sin plan",
};

export const ACCESS_LABELS: Record<Access, string> = {
  FULL: "Completo",
  RESTRICTED: "Restringido",
};

export const LIMIT_LABELS: Record<EntitlementKey, string> = {
  AGENT_REPLIES_PER_PERIOD: "Respuestas del agente por período",
  AGENTS_MAX: "Agentes",
  PLAYGROUND_RUNS_PER_HOUR: "Pruebas en el playground por hora",
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

export function planLabel(code: string | null): string {
  if (!code) return "Sin plan";
  return code in PLAN_LABELS ? PLAN_LABELS[code as PlanCode] : code;
}

export function subscriptionLabel(status: string): string {
  return status in SUBSCRIPTION_LABELS ? SUBSCRIPTION_LABELS[status as SubscriptionStatus] : status;
}
