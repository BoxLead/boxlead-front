import type { Money } from "./api/types";

const LOCALE = "es-AR";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function formatMonth(month: string): string {
  return new Date(`${month}-15T12:00:00-03:00`).toLocaleDateString(LOCALE, { month: "long", year: "numeric", timeZone: TIME_ZONE });
}

export function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
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
