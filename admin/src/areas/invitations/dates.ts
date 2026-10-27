const TIME_ZONE = "America/Argentina/Buenos_Aires";
const OFFSET = "-03:00";

export function todayInBuenosAires(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

export function dayInBuenosAires(iso: string): string {
  return todayInBuenosAires(new Date(iso));
}

export function endOfDay(day: string): string {
  return new Date(`${day}T23:59:59.999${OFFSET}`).toISOString();
}

export function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00${OFFSET}`));
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00${OFFSET}`);
  date.setUTCDate(date.getUTCDate() + days);
  return todayInBuenosAires(date);
}
