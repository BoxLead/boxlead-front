import i18next from "i18next";
import { formatLongDate, formatShortDate } from "../../util/format";
import type { ChartEstimate, ChartPoint } from "./charts/chartLayout";
import type { ForecastPoint } from "./forecast";
import type { MetricsView } from "./metricsView";
import { metricDefinition, metricSeries, type MetricDefinition, type MetricKey } from "./series";

const SPARSE_PER_DAY = 3;
const WEEK = 7;

export type ChartData = {
  definition: MetricDefinition;
  weekly: boolean;
  drawKey: string;
  partialLast: boolean;
  points: ChartPoint[];
  estimates: ChartEstimate[];
  forecastTotal: number | null;
};

function isWeekly(view: MetricsView, definition: MetricDefinition): boolean {
  if (view.period === 90) return true;
  if (view.period !== 30 || definition.kind !== "count") return false;
  return (view.current[definition.key] ?? 0) / view.days.length < SPARSE_PER_DAY;
}

function weekEstimate(days: ForecastPoint[]): ChartEstimate {
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const value = days.reduce((sum, day) => sum + day.value, 0);
  const spread = Math.sqrt(days.reduce((sum, day) => sum + ((day.high - day.low) / 2) ** 2, 0));
  return {
    key: `estimate-${first}`,
    axisLabel: formatShortDate(first),
    title: i18next.t("chart.estimated", {
      ns: "metrics",
      when: i18next.t("range", { ns: "metrics", from: formatShortDate(first), to: formatShortDate(last) }),
    }),
    value,
    low: Math.max(0, value - spread),
    high: value + spread,
  };
}

function dayEstimate(day: ForecastPoint): ChartEstimate {
  return {
    key: `estimate-${day.date}`,
    axisLabel: formatShortDate(day.date),
    title: i18next.t("chart.estimated", { ns: "metrics", when: formatLongDate(day.date) }),
    value: day.value,
    low: day.low,
    high: day.high,
  };
}

function pointTitle(date: string, end: string, weekly: boolean, current: boolean): string {
  const when = weekly
    ? i18next.t("range", { ns: "metrics", from: formatShortDate(date), to: formatShortDate(end) })
    : formatLongDate(date);
  return current ? i18next.t("chart.untilNow", { ns: "metrics", when }) : when;
}

export function buildChartData(view: MetricsView, metric: MetricKey): ChartData {
  const definition = metricDefinition(metric);
  const weekly = isWeekly(view, definition);
  const current = metricSeries(metric, [...view.previousDays, ...view.days], view.from, view.to, weekly);
  const previous = metricSeries(metric, view.previousDays, view.previousFrom, view.previousTo, weekly);
  const forecast = definition.forecast ? view.forecasts[metric] : undefined;
  const days = forecast?.points ?? [];

  return {
    definition,
    weekly,
    drawKey: `${metric}-${view.period}-${weekly ? "week" : "day"}`,
    partialLast: !weekly && definition.kind === "count",
    points: current.map((point, index) => ({
      key: point.date,
      axisLabel: formatShortDate(point.date),
      title: pointTitle(point.date, point.end, weekly, point.end === view.to),
      value: point.value,
      previous: previous[index]?.value ?? null,
    })),
    estimates: weekly
      ? [days.slice(0, WEEK), days.slice(WEEK, WEEK * 2)].filter((chunk) => chunk.length > 0).map(weekEstimate)
      : days.map(dayEstimate),
    forecastTotal: forecast?.total ?? null,
  };
}
