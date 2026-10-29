import { ApiError } from "../../api/client";
import { apiErrorCode } from "../../api/errors";
import type { PaidPlanCode, PaymentStatus, SubscriptionStatus } from "../../api/types";
import type { TagTone } from "../../components/ui/Tag";
import { SUPPORT_EMAIL } from "../../util/company";

export const MERCADO_PAGO_TERMS_URL = "https://www.mercadopago.com.ar/ayuda/terminos-y-condiciones_299";
export const MERCADO_PAGO_BANNER = "/mercadopago/banner.jpg";
export const ENTERPRISE_CONTACT = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Plan Enterprise")}`;

export function rateNote(rateDay: string | null): string | null {
  return rateDay ? `Dólar oficial del Banco Nación del ${rateDay}` : null;
}

export const PLAN_RANK: Record<PaidPlanCode, number> = { STARTER: 1, BUSINESS: 2 };

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; tone: TagTone }> = {
  INCOMPLETE: { label: "Sin pagar", tone: "warning" },
  ACTIVE: { label: "Activo", tone: "success" },
  PAST_DUE: { label: "Cuota impaga", tone: "warning" },
  SUSPENDED: { label: "Suspendido", tone: "danger" },
  PAUSED: { label: "Pausado", tone: "warning" },
  CANCELED: { label: "Cancelado", tone: "neutral" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: TagTone }> = {
  PENDING: { label: "Pendiente", tone: "warning" },
  APPROVED: { label: "Aprobado", tone: "success" },
  REJECTED: { label: "Rechazado", tone: "danger" },
  REFUNDED: { label: "Reembolsado", tone: "neutral" },
  PARTIALLY_REFUNDED: { label: "Reembolso parcial", tone: "neutral" },
  CHARGED_BACK: { label: "Contracargo", tone: "danger" },
  IN_MEDIATION: { label: "En mediación", tone: "warning" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};

const CODE_MESSAGES: Record<string, string> = {
  SUBSCRIPTION_EXISTS: "Ya tenés una suscripción. Si la diste de baja, podés volver a contratar cuando termine el período pagado.",
  SAME_PLAN: "Ya estás en ese plan.",
  SUBSCRIPTION_NOT_ACTIVE: "Tu suscripción no está activa. Regularizá el pago para cambiar de plan.",
  SUBSCRIPTION_CANCELING: "Diste de baja tu plan. Podés volver a contratar cuando termine el período pagado.",
  BILLING_PROFILE_REQUIRED: "Completá tus datos fiscales para seguir.",
  PROVIDER_UNAVAILABLE: "Mercado Pago no responde. Probá de nuevo en unos minutos.",
  CHECKOUT_PENDING: "Tenés un pago en proceso en Mercado Pago. Esperá a que se confirme antes de pagar otro plan o con otro email.",
  LEGAL_ACCEPTANCE_REQUIRED: "Cambiaron los términos. Leelos y aceptalos de nuevo para seguir.",
};

export const CANCEL_REQUESTED = "Pediste la baja. Mercado Pago la confirma en unos minutos. Si en un rato no la ves acá, pedila de nuevo.";

export function billingErrorMessage(error: unknown, fallback: string): string {
  const code = apiErrorCode(error);
  if (code && code in CODE_MESSAGES) return CODE_MESSAGES[code];
  if (error instanceof ApiError && error.status === 429) return error.message;
  return fallback;
}
