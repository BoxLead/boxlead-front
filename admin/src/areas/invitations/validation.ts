import { isDay, todayInBuenosAires } from "./dates";
import { MAX_DEMO_DAYS, MAX_EMAIL_LENGTH } from "./types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailProblem(email: string): string | null {
  const value = email.trim();
  if (!value) return "Escribí el email de la persona.";
  if (value.length > MAX_EMAIL_LENGTH || !EMAIL.test(value)) return "Revisá el email.";
  return null;
}

export function futureDayProblem(day: string, after?: string): string | null {
  if (!day) return "Elegí un día.";
  if (!isDay(day)) return "Revisá la fecha.";
  if (day < todayInBuenosAires()) return "Elegí hoy o un día que todavía no pasó.";
  if (after && day <= after) return "Elegí un día posterior al fin actual.";
  return null;
}

export function demoDaysProblem(days: string): string | null {
  if (!days.trim()) return null;
  const value = Number(days);
  if (!Number.isInteger(value) || value < 1 || value > MAX_DEMO_DAYS) return `Poné un número de días entre 1 y ${MAX_DEMO_DAYS}.`;
  return null;
}

export function demoDaysValue(days: string): number | null {
  return days.trim() ? Number(days) : null;
}

export function daysText(days: number | null): string {
  if (days === null) return "La duración del plan Demo";
  return days === 1 ? "1 día" : `${days} días`;
}
