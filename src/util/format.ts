import { parseIsoDate } from "./dates";
import i18next from "i18next";
import { intlLocale } from "../i18n/locale";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return i18next.t("time.empty");
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return i18next.t("time.empty");
  const diff = now - time;
  if (diff < MINUTE) return i18next.t("time.justNow");
  if (diff < HOUR) return i18next.t("time.minutesAgo", { count: Math.floor(diff / MINUTE) });
  if (diff < DAY) return i18next.t("time.hoursAgo", { count: Math.floor(diff / HOUR) });
  if (diff < 2 * DAY) return i18next.t("time.yesterday");
  if (diff < 7 * DAY) return i18next.t("time.daysAgo", { count: Math.floor(diff / DAY) });
  return new Date(time).toLocaleDateString(intlLocale(), { day: "numeric", month: "short" });
}

export function formatListTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  }
  if (now - date.getTime() < 6 * DAY) {
    return date.toLocaleDateString(intlLocale(), { weekday: "short" }).replace(".", "");
  }
  return date.toLocaleDateString(intlLocale(), { day: "numeric", month: "short" }).replace(".", "");
}

export function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  try {
    return new Intl.NumberFormat(intlLocale(), {
      style: "currency",
      currency: currency ?? "ARS",
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency ?? ""} ${amount.toLocaleString(intlLocale())}`.trim();
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(intlLocale(), {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString(intlLocale());
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toLocaleString(intlLocale(), { maximumFractionDigits: digits, minimumFractionDigits: 0 })}%`;
}

function sign(value: number): string {
  return value > 0 ? "+" : value < 0 ? "\u2212" : "";
}

export function formatPoints(value: number): string {
  const rounded = Math.round(value * 1000) / 10;
  return i18next.t("time.points", { value: `${sign(rounded)}${Math.abs(rounded).toLocaleString(intlLocale(), { maximumFractionDigits: 1 })}` });
}

export function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 100);
  return `${sign(rounded)}${Math.abs(rounded).toLocaleString(intlLocale())}%`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return i18next.t("time.empty");
  if (seconds < 60) return i18next.t("time.seconds", { value: Math.max(1, Math.round(seconds)) });
  if (seconds < 3600) return i18next.t("time.minutes", { value: Math.round(seconds / 60) });
  const hours = seconds / 3600;
  return i18next.t("time.hours", { value: hours.toLocaleString(intlLocale(), { maximumFractionDigits: hours < 10 ? 1 : 0 }) });
}

export function formatShortDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(intlLocale(), { day: "numeric", month: "short" }).replace(".", "");
}

export function formatLongDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" });
}

export function formatFactor(value: number): string {
  return `${value.toLocaleString(intlLocale(), { maximumFractionDigits: 1, minimumFractionDigits: value < 10 ? 1 : 0 })}×`;
}
