import { isDay, isUuid } from "../../components/list/filterRules";

const LOCALE = "es-AR";
const TIME_ZONE = "America/Argentina/Buenos_Aires";
const MICROS = 1_000_000;
const DAY_MS = 86_400_000;

export const MAX_RANGE_DAYS = 366;

export { isDay, isUuid };


export function formatCost(micros: number, currency: string | null): string {
  const units = micros / MICROS;
  if (!currency) return units.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(units);
  } catch {
    return `${currency} ${units.toLocaleString(LOCALE, { maximumFractionDigits: 4 })}`;
  }
}

export function todayInBuenosAires(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function monthStart(day: string): string {
  return `${day.slice(0, 8)}01`;
}

export function rangeProblem(from: string, to: string): string | null {
  if (!isDay(from) || !isDay(to)) return "Elegí las dos fechas del período.";
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS + 1;
  if (days < 1) return "La fecha de inicio tiene que ser anterior a la de fin.";
  if (days > MAX_RANGE_DAYS) return `El período puede tener hasta ${MAX_RANGE_DAYS} días.`;
  return null;
}
