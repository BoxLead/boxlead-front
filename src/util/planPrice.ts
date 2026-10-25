import type { BillingPlan, Money } from "../api/types";
import { parseIsoDate } from "./dates";

const LOCALE = "es-AR";

export const NATIONAL_TAXES_LEGEND = "PRECIO SIN IMPUESTOS NACIONALES";

export type PlanPrice = {
  amount: string;
  period: string;
  withoutNationalTaxes: string | null;
  reference: string | null;
  rateDay: string | null;
};

function currencyDigits(currency: string): number {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).resolvedOptions().minimumFractionDigits ?? 2;
}

export function formatMinor(money: Money): string {
  try {
    const value = money.amountMinor / 10 ** currencyDigits(money.currency);
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: money.currency,
      currencyDisplay: money.currency === "ARS" ? "symbol" : "code",
      minimumFractionDigits: Number.isInteger(value) ? 0 : undefined,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    return `${money.currency} ${money.amountMinor}`;
  }
}

export function formatPeriod(frequencyMonths: number | null): string {
  if (frequencyMonths === 1) return "por mes";
  if (frequencyMonths && frequencyMonths > 1) return `cada ${frequencyMonths} meses`;
  return "";
}

function formatRateDay(day: string | undefined): string | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return parseIsoDate(day).toLocaleDateString(LOCALE, { day: "numeric", month: "long" });
}

export function planPrice(plan: BillingPlan): PlanPrice | null {
  const today = plan.chargeToday ?? null;
  const main = today ?? plan.price;
  if (!main) return null;
  const vat = plan.priceIncludesVat ? " con IVA incluido" : "";
  return {
    amount: formatMinor(main),
    period: formatPeriod(plan.frequencyMonths),
    withoutNationalTaxes: plan.priceWithoutNationalTaxes ? formatMinor(plan.priceWithoutNationalTaxes) : null,
    reference: today && plan.price ? `${formatMinor(plan.price)}${vat}` : null,
    rateDay: today ? formatRateDay(plan.fxRate?.day) : null,
  };
}
