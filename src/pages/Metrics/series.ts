import type { MetricsSegment } from "../../api/types";
import { addDays, dateRange, daysBetween } from "../../util/dates";
import { formatCompactMoney, formatNumber, formatPercent } from "../../util/format";
import { ratio } from "./metricsModel";

export type MetricKey = "leads" | "fast" | "qualification" | "sales" | "revenue";

export type DayTotals = {
  date: string;
  leads: number;
  qualified: number;
  closed: number;
  firstResponses: number;
  fastResponses: number;
};

export type MetricDefinition = {
  key: MetricKey;
  label: string;
  kind: "count" | "rate" | "money";
  unit: [string, string];
  forecast: boolean;
};

export const METRICS: MetricDefinition[] = [
  { key: "leads", label: "Leads", kind: "count", unit: ["lead", "leads"], forecast: true },
  { key: "fast", label: "Respuesta en 5 min", kind: "rate", unit: ["", ""], forecast: false },
  { key: "qualification", label: "Calificación", kind: "rate", unit: ["", ""], forecast: false },
  { key: "sales", label: "Ventas", kind: "count", unit: ["venta", "ventas"], forecast: true },
  { key: "revenue", label: "Ingresos", kind: "money", unit: ["", ""], forecast: true },
];

export type SeriesPoint = {
  date: string;
  end: string;
  value: number | null;
};

const ROLLING_DAYS = 7;
const MIN_LEADING_DAYS = 4;

function emptyDay(date: string): DayTotals {
  return { date, leads: 0, qualified: 0, closed: 0, firstResponses: 0, fastResponses: 0 };
}

export function dayTotals(segments: MetricsSegment[], from: string, to: string): DayTotals[] {
  const days = new Map(dateRange(from, to).map((date) => [date, emptyDay(date)]));
  for (const segment of segments) {
    for (const day of segment.days) {
      const target = days.get(day.date);
      if (!target) continue;
      target.leads += day.leads;
      target.qualified += day.qualified;
      target.closed += day.closed;
      target.firstResponses += day.firstResponses;
      target.fastResponses += day.fastResponses;
    }
  }
  return [...days.values()];
}

function sum(days: DayTotals[]): DayTotals {
  return days.reduce(
    (acc, day) => ({
      date: acc.date,
      leads: acc.leads + day.leads,
      qualified: acc.qualified + day.qualified,
      closed: acc.closed + day.closed,
      firstResponses: acc.firstResponses + day.firstResponses,
      fastResponses: acc.fastResponses + day.fastResponses,
    }),
    emptyDay(days[0]?.date ?? ""),
  );
}

export function metricValue(key: MetricKey, totals: DayTotals, ticket: number | null): number | null {
  switch (key) {
    case "leads":
      return totals.leads;
    case "fast":
      return ratio(totals.fastResponses, totals.firstResponses);
    case "qualification":
      return ratio(totals.qualified, totals.leads);
    case "sales":
      return totals.closed;
    case "revenue":
      return ticket === null ? null : totals.closed * ticket;
  }
}

export function metricTotal(key: MetricKey, days: DayTotals[], ticket: number | null): number | null {
  return metricValue(key, sum(days), ticket);
}

export function metricSeries(
  key: MetricKey,
  days: DayTotals[],
  from: string,
  to: string,
  weekly: boolean,
  ticket: number | null,
): SeriesPoint[] {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const rate = METRICS.find((metric) => metric.key === key)?.kind === "rate";
  const pick = (start: string, end: string) =>
    dateRange(start, end).map((date) => byDate.get(date) ?? emptyDay(date));

  if (weekly) {
    const points: SeriesPoint[] = [];
    const total = daysBetween(from, to) + 1;
    let start = from;
    let size = total % 7 || 7;
    if (size < MIN_LEADING_DAYS && total > 7) {
      start = addDays(start, size);
      size = 7;
    }
    while (start <= to) {
      const end = addDays(start, size - 1);
      points.push({ date: start, end, value: metricValue(key, sum(pick(start, end)), ticket) });
      start = addDays(end, 1);
      size = 7;
    }
    return points;
  }

  return dateRange(from, to).map((date) => {
    const window = rate ? pick(addDays(date, -(ROLLING_DAYS - 1)), date) : pick(date, date);
    return { date, end: date, value: metricValue(key, sum(window), ticket) };
  });
}

export function formatMetric(definition: MetricDefinition, value: number | null, currency: string): string {
  if (value === null) return "—";
  if (definition.kind === "rate") return formatPercent(value);
  if (definition.kind === "money") return formatCompactMoney(value, currency);
  return formatNumber(value);
}

export function metricChange(definition: MetricDefinition, current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  if (definition.kind === "rate") return current - previous;
  return previous === 0 ? null : (current - previous) / previous;
}
