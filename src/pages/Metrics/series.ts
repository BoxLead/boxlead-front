import type { MetricsSegment } from "../../api/types";
import { addDays, dateRange, daysBetween } from "../../util/dates";
import { formatDuration, formatNumber, formatPercent } from "../../util/format";
import { FAST_RESPONSE_BUCKETS, RESPONSE_LIMITS } from "../../util/metrics";
import { estimateMedianSeconds, ratio } from "./metricsModel";

export type MetricKey = "leads" | "fast" | "response" | "qualification";

export type DayTotals = {
  date: string;
  leads: number;
  qualified: number;
  responseBuckets: number[];
  unanswered: number;
};

export type MetricDefinition = {
  key: MetricKey;
  label: string;
  kind: "count" | "rate" | "duration";
  better: "up" | "down";
  forecast: boolean;
};

export const METRICS: MetricDefinition[] = [
  { key: "leads", label: "Leads", kind: "count", better: "up", forecast: true },
  { key: "fast", label: "Respuesta en 5 min", kind: "rate", better: "up", forecast: false },
  { key: "response", label: "Primera respuesta", kind: "duration", better: "down", forecast: false },
  { key: "qualification", label: "Calificación", kind: "rate", better: "up", forecast: false },
];

export function metricDefinition(key: MetricKey): MetricDefinition {
  return METRICS.find((metric) => metric.key === key) ?? METRICS[0];
}

export type SeriesPoint = {
  date: string;
  end: string;
  value: number | null;
};

const ROLLING_DAYS = 7;
const WEEK = 7;

function emptyDay(date: string): DayTotals {
  return { date, leads: 0, qualified: 0, responseBuckets: RESPONSE_LIMITS.map(() => 0), unanswered: 0 };
}

function addDay(target: DayTotals, day: Omit<DayTotals, "date">) {
  target.leads += day.leads;
  target.qualified += day.qualified;
  target.unanswered += day.unanswered;
  day.responseBuckets.forEach((count, index) => {
    target.responseBuckets[index] = (target.responseBuckets[index] ?? 0) + count;
  });
}

export function dayTotals(segments: MetricsSegment[], from: string, to: string): DayTotals[] {
  const days = new Map(dateRange(from, to).map((date) => [date, emptyDay(date)]));
  for (const segment of segments) {
    for (const day of segment.days) {
      const target = days.get(day.date);
      if (target) addDay(target, day);
    }
  }
  return [...days.values()];
}

function combine(days: DayTotals[]): DayTotals {
  const total = emptyDay(days[0]?.date ?? "");
  for (const day of days) addDay(total, day);
  return total;
}

export function metricValue(key: MetricKey, totals: DayTotals): number | null {
  const answered = totals.responseBuckets.reduce((sum, count) => sum + count, 0);
  switch (key) {
    case "leads":
      return totals.leads;
    case "fast":
      return ratio(
        totals.responseBuckets.slice(0, FAST_RESPONSE_BUCKETS).reduce((sum, count) => sum + count, 0),
        answered + totals.unanswered,
      );
    case "response":
      return estimateMedianSeconds(totals.responseBuckets);
    case "qualification":
      return ratio(totals.qualified, totals.leads);
  }
}

export function metricTotal(key: MetricKey, days: DayTotals[]): number | null {
  return metricValue(key, combine(days));
}

export function metricSeries(key: MetricKey, days: DayTotals[], from: string, to: string, weekly: boolean): SeriesPoint[] {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const pick = (start: string, end: string) => dateRange(start, end).map((date) => byDate.get(date) ?? emptyDay(date));
  const point = (start: string, end: string): SeriesPoint => ({
    date: start,
    end,
    value: metricValue(key, combine(pick(start, end))),
  });

  if (!weekly) {
    const rolling = metricDefinition(key).kind !== "count";
    return dateRange(from, to).map((date) => ({
      ...point(rolling ? addDays(date, -(ROLLING_DAYS - 1)) : date, date),
      date,
    }));
  }

  const total = daysBetween(from, to) + 1;
  let size = total % WEEK || WEEK;
  let start = from;
  if (size < WEEK && total > WEEK) {
    start = addDays(start, size);
    size = WEEK;
  }
  const points: SeriesPoint[] = [];
  while (start <= to) {
    const end = addDays(start, size - 1);
    points.push(point(start, end));
    start = addDays(end, 1);
    size = WEEK;
  }
  return points;
}

export function formatMetric(definition: MetricDefinition, value: number | null): string {
  if (value === null) return "—";
  if (definition.kind === "rate") return formatPercent(value);
  if (definition.kind === "duration") return formatDuration(value);
  return formatNumber(value);
}

export function metricChange(definition: MetricDefinition, current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  if (definition.kind === "rate") return current - previous;
  return previous === 0 ? null : (current - previous) / previous;
}
