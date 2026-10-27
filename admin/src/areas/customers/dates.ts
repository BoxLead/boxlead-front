const TIME_ZONE = "America/Argentina/Buenos_Aires";
const OFFSET = "-03:00";
const DAY_MS = 86_400_000;

const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

export function dayOf(instant: Date | string): string {
  return DAY_FORMAT.format(typeof instant === "string" ? new Date(instant) : instant);
}

export function today(now = new Date()): string {
  return dayOf(now);
}

export function currentMonth(now = new Date()): string {
  return today(now).slice(0, 7);
}

export function addDays(day: string, days: number): string {
  return dayOf(new Date(Date.parse(`${day}T12:00:00${OFFSET}`) + days * DAY_MS));
}

export function endOfDay(day: string): string {
  return new Date(`${day}T23:59:59${OFFSET}`).toISOString();
}

export function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00${OFFSET}`));
}

export function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function formatMonth(month: string): string {
  return new Date(`${month}-15T12:00:00${OFFSET}`).toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: TIME_ZONE });
}
