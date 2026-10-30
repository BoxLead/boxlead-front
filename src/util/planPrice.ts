import i18next from "i18next";
import type { BillingPlan, Money } from "../api/types";
import { parseIsoDate } from "./dates";
import { intlLocale } from "../i18n/locale";

export function nationalTaxesLegend(): string {
  return i18next.t("price.withoutNationalTaxes");
}

export type PlanPrice = {
  amount: string;
  period: string;
  withoutNationalTaxes: string | null;
  reference: string | null;
  rateDay: string | null;
};

function currencyDigits(currency: string): number {
  return new Intl.NumberFormat(intlLocale(), { style: "currency", currency }).resolvedOptions().minimumFractionDigits ?? 2;
}

export function formatMinor(money: Money): string {
  try {
    const value = money.amountMinor / 10 ** currencyDigits(money.currency);
    return new Intl.NumberFormat(intlLocale(), {
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
  if (frequencyMonths === 1) return i18next.t("price.perMonth");
  if (frequencyMonths && frequencyMonths > 1) return i18next.t("price.everyMonths", { count: frequencyMonths });
  return "";
}

function formatRateDay(day: string | undefined): string | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return parseIsoDate(day).toLocaleDateString(intlLocale(), { day: "numeric", month: "long" });
}

export function planPrice(plan: BillingPlan): PlanPrice | null {
  const today = plan.chargeToday ?? null;
  const main = today ?? plan.price;
  if (!main) return null;
  return {
    amount: formatMinor(main),
    period: formatPeriod(plan.frequencyMonths),
    withoutNationalTaxes: plan.priceWithoutNationalTaxes ? formatMinor(plan.priceWithoutNationalTaxes) : null,
    reference: today && plan.price ? (plan.priceIncludesVat ? i18next.t("price.vatIncluded", { price: formatMinor(plan.price) }) : formatMinor(plan.price)) : null,
    rateDay: today ? formatRateDay(plan.fxRate?.day) : null,
  };
}
