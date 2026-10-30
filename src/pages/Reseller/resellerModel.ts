import i18next from "i18next";
import type { CommissionStatus, Money, SubscriptionStatus } from "../../api/types";
import type { TagTone } from "../../components/ui/Tag";
import { intlLocale } from "../../i18n/locale";

const FALLBACK_DIGITS = 2;

type StatusLabel = { label: string; tone: TagTone };

type CommissionLabel = StatusLabel & { hint: string | null };

export const COMMISSION_TONES: Record<CommissionStatus, TagTone> = {
  ACCRUED: "neutral",
  HELD: "warning",
  APPROVED: "accent",
  PAID: "success",
  REVERSED: "danger",
};

export const SUBSCRIPTION_TONES: Record<SubscriptionStatus, TagTone> = {
  INCOMPLETE: "neutral",
  ACTIVE: "success",
  PAST_DUE: "warning",
  SUSPENDED: "danger",
  PAUSED: "neutral",
  CANCELED: "neutral",
};

export function commissionLabel(status: CommissionStatus): CommissionLabel {
  if (!Object.hasOwn(COMMISSION_TONES, status)) return { label: status, tone: "neutral", hint: null };
  return {
    label: i18next.t(`reseller.commission.${status}`, { ns: "billing" }),
    tone: COMMISSION_TONES[status],
    hint: i18next.t(`reseller.commissionHint.${status}`, { ns: "billing" }),
  };
}

export function subscriptionLabel(status: SubscriptionStatus): StatusLabel {
  if (!Object.hasOwn(SUBSCRIPTION_TONES, status)) return { label: status, tone: "neutral" };
  return { label: i18next.t(`reseller.subscription.${status}`, { ns: "billing" }), tone: SUBSCRIPTION_TONES[status] };
}

function currencyDigits(currency: string): number | null {
  try {
    return new Intl.NumberFormat(intlLocale(), { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? FALLBACK_DIGITS;
  } catch {
    return null;
  }
}

export function formatAmount(money: Money): string {
  const digits = currencyDigits(money.currency);
  const scale = 10 ** (digits ?? FALLBACK_DIGITS);
  const minor = Math.trunc(money.amountMinor);
  const fraction = minor % scale === 0 ? 0 : (digits ?? FALLBACK_DIGITS);
  const options = { minimumFractionDigits: fraction, maximumFractionDigits: fraction };
  const value = minor / scale;
  if (digits === null) return `${money.currency} ${value.toLocaleString(intlLocale(), options)}`.trim();
  return new Intl.NumberFormat(intlLocale(), { style: "currency", currency: money.currency, ...options }).format(value);
}

export function cycleLabel(cycle: number, maxCycles: number): string {
  if (cycle <= 0) return i18next.t("reseller.noCharges", { ns: "billing" });
  return i18next.t("reseller.cycle", { ns: "billing", cycle, max: maxCycles });
}

export function cycleProgress(cycle: number, maxCycles: number): boolean[] {
  const total = Math.max(0, Math.min(maxCycles, 12));
  return Array.from({ length: total }, (_, index) => index < cycle);
}
