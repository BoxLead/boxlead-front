import type { PlanLimits } from "../../api/types";
import { PERIODS, type MetricsPeriod } from "../../util/metrics";

export const FORECAST_HISTORY_DAYS = 84;

function historyDays(limits: PlanLimits): number | null {
  const days = limits.METRICS_HISTORY_DAYS;
  return typeof days === "number" ? days : null;
}

export function allowedPeriods(limits: PlanLimits): MetricsPeriod[] {
  const days = historyDays(limits);
  if (days === null) return [...PERIODS];
  return PERIODS.filter((period) => period * 2 <= days);
}

export function forecastAllowed(limits: PlanLimits): boolean {
  const days = historyDays(limits);
  return days === null || days >= FORECAST_HISTORY_DAYS;
}

export function fitPeriod(period: MetricsPeriod, allowed: MetricsPeriod[]): MetricsPeriod {
  if (allowed.includes(period)) return period;
  const shorter = allowed.filter((days) => days < period);
  return shorter.length > 0 ? shorter[shorter.length - 1] : (allowed[0] ?? period);
}

export function historyNote(limits: PlanLimits): string | null {
  const days = historyDays(limits);
  const allowed = allowedPeriods(limits).length;
  if (days === null || allowed === 0 || allowed === PERIODS.length) return null;
  return `Tu plan incluye ${days === 1 ? "1 día" : `${days} días`} de historial.`;
}
