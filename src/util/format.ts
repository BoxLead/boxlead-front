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
