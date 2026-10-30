import i18next from "i18next";
import { ApiError } from "../../api/client";
import { apiErrorCode } from "../../api/errors";
import type { PaidPlanCode, PaymentStatus, SubscriptionStatus } from "../../api/types";
import type { TagTone } from "../../components/ui/Tag";
import { VAT_CONDITIONS } from "../../util/taxId";
import { SUPPORT_EMAIL } from "../../util/company";

export const MERCADO_PAGO_TERMS_URL = "https://www.mercadopago.com.ar/ayuda/terminos-y-condiciones_299";
export const MERCADO_PAGO_BANNER = "/mercadopago/banner.jpg";
export const ENTERPRISE_CONTACT = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Plan Enterprise")}`;

export type StatusLabel = { label: string; tone: TagTone };

export function rateNote(rateDay: string | null): string | null {
  return rateDay ? i18next.t("rateNote", { ns: "billing", day: rateDay }) : null;
}

export const PLAN_RANK: Record<PaidPlanCode, number> = { STARTER: 1, BUSINESS: 2 };

const SUBSCRIPTION_TONES: Record<SubscriptionStatus, TagTone> = {
  INCOMPLETE: "warning",
  ACTIVE: "success",
  PAST_DUE: "warning",
  SUSPENDED: "danger",
  PAUSED: "warning",
  CANCELED: "neutral",
};

const PAYMENT_TONES: Record<PaymentStatus, TagTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "neutral",
  CHARGED_BACK: "danger",
  IN_MEDIATION: "warning",
  CANCELLED: "neutral",
};

export function subscriptionStatus(status: SubscriptionStatus): StatusLabel {
  if (!Object.hasOwn(SUBSCRIPTION_TONES, status)) return { label: status, tone: "neutral" };
  return { label: i18next.t(`status.subscription.${status}`, { ns: "billing" }), tone: SUBSCRIPTION_TONES[status] };
}

export function paymentStatus(status: PaymentStatus): StatusLabel {
  if (!Object.hasOwn(PAYMENT_TONES, status)) return { label: status, tone: "neutral" };
  return { label: i18next.t(`status.payment.${status}`, { ns: "billing" }), tone: PAYMENT_TONES[status] };
}

export function vatConditionName(value: string): string {
  const condition = VAT_CONDITIONS.find((item) => item.value === value);
  return condition ? i18next.t(`vatConditions.${condition.value}`, { ns: "billing" }) : value;
}

const CODE_MESSAGES = [
  "SUBSCRIPTION_EXISTS",
  "SAME_PLAN",
  "SUBSCRIPTION_NOT_ACTIVE",
  "SUBSCRIPTION_CANCELING",
  "BILLING_PROFILE_REQUIRED",
  "PROVIDER_UNAVAILABLE",
  "CHECKOUT_PENDING",
  "LEGAL_ACCEPTANCE_REQUIRED",
] as const;

type MessageCode = (typeof CODE_MESSAGES)[number];

function isMessageCode(code: string): code is MessageCode {
  return (CODE_MESSAGES as readonly string[]).includes(code);
}

export function cancelRequested(): string {
  return i18next.t("cancelPlan.requested", { ns: "billing" });
}

export function billingErrorMessage(error: unknown, fallback: string): string {
  const code = apiErrorCode(error);
  if (code && isMessageCode(code)) return i18next.t(`errors.${code}`, { ns: "billing" });
  if (error instanceof ApiError && error.status === 429) return error.message;
  return fallback;
}
