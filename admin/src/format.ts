import type { Money } from "./api/types";

const LOCALE = "es-AR";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(LOCALE, { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: TIME_ZONE });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00-03:00`) : new Date(iso);
  return date.toLocaleDateString(LOCALE, { dateStyle: "medium", timeZone: TIME_ZONE });
}

export function formatMoney(money: Money): string {
  try {
    const format = new Intl.NumberFormat(LOCALE, { style: "currency", currency: money.currency });
    const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
    return format.format(money.amountMinor / 10 ** digits);
  } catch {
    return `${money.currency} ${money.amountMinor}`;
  }
}

export function formatCount(value: number): string {
  return value.toLocaleString(LOCALE);
}
