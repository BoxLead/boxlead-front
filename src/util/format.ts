import { parseIsoDate } from "./dates";

const LOCALE = "es-AR";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "—";
  const diff = now - time;
  if (diff < MINUTE) return "recién";
  if (diff < HOUR) return `hace ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `hace ${Math.floor(diff / HOUR)} h`;
  if (diff < 2 * DAY) return "ayer";
  if (diff < 7 * DAY) return `hace ${Math.floor(diff / DAY)} días`;
  return new Date(time).toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
}

export function formatListTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  }
  if (now - date.getTime() < 6 * DAY) {
    return date.toLocaleDateString(LOCALE, { weekday: "short" }).replace(".", "");
  }
  return date.toLocaleDateString(LOCALE, { day: "numeric", month: "short" }).replace(".", "");
}

export function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: currency ?? "ARS",
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency ?? ""} ${amount.toLocaleString(LOCALE)}`.trim();
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString(LOCALE);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toLocaleString(LOCALE, { maximumFractionDigits: digits, minimumFractionDigits: 0 })}%`;
}

function sign(value: number): string {
  return value > 0 ? "+" : value < 0 ? "\u2212" : "";
}

export function formatPoints(value: number): string {
  const rounded = Math.round(value * 1000) / 10;
  return `${sign(rounded)}${Math.abs(rounded).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} pp`;
}

export function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 100);
  return `${sign(rounded)}${Math.abs(rounded).toLocaleString(LOCALE)}%`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = seconds / 3600;
  return `${hours.toLocaleString(LOCALE, { maximumFractionDigits: hours < 10 ? 1 : 0 })} h`;
}

export function formatShortDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(LOCALE, { day: "numeric", month: "short" }).replace(".", "");
}

export function formatLongDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" });
}

export function formatFactor(value: number): string {
  return `${value.toLocaleString(LOCALE, { maximumFractionDigits: 1, minimumFractionDigits: value < 10 ? 1 : 0 })}×`;
}
