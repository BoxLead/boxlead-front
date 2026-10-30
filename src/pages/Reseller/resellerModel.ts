import type { CommissionStatus, Money, SubscriptionStatus } from "../../api/types";
import type { TagTone } from "../../components/ui/Tag";
import { intlLocale } from "../../i18n/locale";

const FALLBACK_DIGITS = 2;

type StatusLabel = { label: string; tone: TagTone };

type CommissionLabel = StatusLabel & { hint: string | null };

export const COMMISSION_LABELS: Record<CommissionStatus, CommissionLabel> = {
  ACCRUED: { label: "Pendiente", tone: "neutral", hint: "Se liberan cuando termina el plazo de espera" },
  HELD: { label: "Retenida", tone: "warning", hint: "En revisión por una disputa o un control" },
  APPROVED: { label: "Aprobada", tone: "accent", hint: "Entran en la próxima liquidación" },
  PAID: { label: "Pagada", tone: "success", hint: "Ya te las pagamos" },
  REVERSED: { label: "Revertida", tone: "danger", hint: "Por reembolsos o contracargos" },
};

export const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, StatusLabel> = {
  INCOMPLETE: { label: "Sin pago", tone: "neutral" },
  ACTIVE: { label: "Activo", tone: "success" },
  PAST_DUE: { label: "Pago atrasado", tone: "warning" },
  SUSPENDED: { label: "Suspendido", tone: "danger" },
  PAUSED: { label: "Pausado", tone: "neutral" },
  CANCELED: { label: "Dado de baja", tone: "neutral" },
};

export function commissionLabel(status: CommissionStatus): CommissionLabel {
  return Object.hasOwn(COMMISSION_LABELS, status) ? COMMISSION_LABELS[status] : { label: status, tone: "neutral", hint: null };
}

export function subscriptionLabel(status: SubscriptionStatus): StatusLabel {
  return Object.hasOwn(SUBSCRIPTION_LABELS, status) ? SUBSCRIPTION_LABELS[status] : { label: status, tone: "neutral" };
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
  if (cycle <= 0) return "Sin cobros todavía";
  return `Cobro ${cycle} de ${maxCycles}`;
}

export function cycleProgress(cycle: number, maxCycles: number): boolean[] {
  const total = Math.max(0, Math.min(maxCycles, 12));
  return Array.from({ length: total }, (_, index) => index < cycle);
}
