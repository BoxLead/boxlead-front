import type { CategoryResponse, MetricsReport, MetricsSettings, PlatformType } from "../../api/types";
import { CONNECTABLE_PLATFORMS } from "../../platforms";
import { UNCATEGORIZED } from "../../util/categories";
import type { MetricsPeriod } from "../../util/metrics";
import { categoryBreakdown, channelBreakdown, type BreakdownRow } from "./breakdown";
import { forecastDaily, type Forecast } from "./forecast";
import { buildInsights, type Insight } from "./insights";
import { selectSegments, sumSegments, type MetricsFilters, type Totals } from "./metricsModel";
import { dayTotals, METRICS, metricTotal, metricValue, type DayTotals, type MetricKey } from "./series";

export const FORECAST_DAYS = 14;

export type MetricsRange = {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
};

export type MetricsInput = {
  period: MetricsPeriod;
  filters: MetricsFilters;
  range: MetricsRange;
  current: MetricsReport;
  previous: MetricsReport;
  history: MetricsReport | undefined;
  settings: MetricsSettings;
  categories: CategoryResponse[] | undefined;
};

export type MetricsView = MetricsRange & {
  period: MetricsPeriod;
  settings: MetricsSettings;
  categories: CategoryResponse[];
  platforms: PlatformType[];
  totals: Totals;
  previousTotals: Totals;
  days: DayTotals[];
  previousDays: DayTotals[];
  current: Record<MetricKey, number | null>;
  previous: Record<MetricKey, number | null>;
  forecasts: Partial<Record<MetricKey, Forecast>>;
  channels: BreakdownRow[];
  categoryRows: BreakdownRow[];
  insights: Insight[];
  categoryName: (id: string) => string;
};

function totalsByMetric(days: DayTotals[]) {
  return Object.fromEntries(METRICS.map(({ key }) => [key, metricTotal(key, days)])) as Record<MetricKey, number | null>;
}

function forecasts(history: DayTotals[]): Partial<Record<MetricKey, Forecast>> {
  const result: Partial<Record<MetricKey, Forecast>> = {};
  for (const metric of METRICS.filter((definition) => definition.forecast)) {
    const forecast = forecastDaily(
      history.map((day) => ({ date: day.date, value: metricValue(metric.key, day) ?? 0 })),
      FORECAST_DAYS,
      1,
    );
    if (forecast) result[metric.key] = forecast;
  }
  return result;
}

export function buildMetricsView(input: MetricsInput): MetricsView {
  const { period, filters, range, current, previous, history, settings } = input;
  const categories = input.categories ?? [];
  const known = input.categories ? new Set(categories.map((category) => category.id)) : null;
  const segments = selectSegments(current, filters, known);
  const previousSegments = selectSegments(previous, filters, known);
  const days = dayTotals(segments, range.from, range.to);
  const previousDays = dayTotals(previousSegments, range.previousFrom, range.previousTo);
  const historyDays = history ? dayTotals(selectSegments(history, filters, known), history.from, history.to) : [];
  const totals = sumSegments(segments);

  const byChannel = { ...filters, platform: "ALL" as const };
  const byCategory = { ...filters, category: null };
  const channels = channelBreakdown(selectSegments(current, byChannel, known), selectSegments(previous, byChannel, known));
  const categoryRows = categoryBreakdown(
    selectSegments(current, byCategory, known),
    selectSegments(previous, byCategory, known),
    known,
  );

  const names = new Map(categories.map((category) => [category.id, category.name]));
  const categoryName = (id: string) =>
    id === UNCATEGORIZED ? "Sin categoría" : (names.get(id) ?? "Categoría eliminada");
  const present = new Set(current.segments.map((segment) => segment.platform));

  return {
    ...range,
    period,
    settings,
    categories,
    platforms: CONNECTABLE_PLATFORMS.map((platform) => platform.id).filter((id) => present.has(id)),
    totals,
    previousTotals: sumSegments(previousSegments),
    days,
    previousDays,
    current: totalsByMetric(days),
    previous: totalsByMetric(previousDays),
    forecasts: forecasts(historyDays),
    channels,
    categoryRows,
    insights: buildInsights({ current: totals, channels, categories: categoryRows, categoryName }),
    categoryName,
  };
}
