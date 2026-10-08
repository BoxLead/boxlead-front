import { useMemo } from "react";
import type { CategoryResponse, MetricsReport, MetricsSettings, PlatformType } from "../../api/types";
import { CATEGORIES_KEY } from "../../data/categories";
import { METRICS_SETTINGS_KEY, metricsKey } from "../../data/metrics";
import { useApiQuery } from "../../hooks/useApiQuery";
import { CONNECTABLE_PLATFORMS } from "../../platforms";
import { addDays, isoDate, localTimezone } from "../../util/dates";
import type { MetricsPeriod } from "../../util/metrics";
import { forecastDaily, type Forecast } from "./forecast";
import { buildInsights, type Insight } from "./insights";
import {
  categoryBreakdown,
  channelBreakdown,
  periodRange,
  rates,
  selectSegments,
  sumSegments,
  UNCATEGORIZED,
  type BreakdownRow,
  type MetricsFilters,
  type Rates,
  type Totals,
} from "./metricsModel";
import { dayTotals, METRICS, metricTotal, type DayTotals, type MetricKey } from "./series";

export const HISTORY_DAYS = 84;
export const FORECAST_DAYS = 14;

export type MetricsView = {
  period: MetricsPeriod;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  settings: MetricsSettings;
  categories: CategoryResponse[];
  platforms: PlatformType[];
  totals: Totals;
  previousTotals: Totals;
  rates: Rates;
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

function totalsByMetric(days: DayTotals[], ticket: number | null): Record<MetricKey, number | null> {
  return Object.fromEntries(METRICS.map((metric) => [metric.key, metricTotal(metric.key, days, ticket)])) as Record<
    MetricKey,
    number | null
  >;
}

export function useMetricsView(period: MetricsPeriod, filters: MetricsFilters) {
  const today = isoDate(new Date());
  const timezone = localTimezone();
  const range = periodRange(period, today);
  const historyTo = addDays(today, -1);
  const historyFrom = addDays(historyTo, -(HISTORY_DAYS - 1));

  const current = useApiQuery<MetricsReport>(metricsKey(range.from, range.to, timezone));
  const previous = useApiQuery<MetricsReport>(metricsKey(range.previousFrom, range.previousTo, timezone));
  const history = useApiQuery<MetricsReport>(metricsKey(historyFrom, historyTo, timezone));
  const settings = useApiQuery<MetricsSettings>(METRICS_SETTINGS_KEY);
  const categories = useApiQuery<CategoryResponse[]>(CATEGORIES_KEY);

  const { platform, category } = filters;
  const view = useMemo<MetricsView | null>(() => {
    if (!current.data || !previous.data || !settings.data) return null;
    const scope: MetricsFilters = { platform, category };
    const ticket = settings.data.averageTicket;
    const segments = selectSegments(current.data, scope);
    const previousSegments = selectSegments(previous.data, scope);
    const totals = sumSegments(segments);
    const previousTotals = sumSegments(previousSegments);
    const categoryList = categories.data ?? [];
    const names = new Map(categoryList.map((item) => [item.id, item.name]));
    const categoryName = (id: string) =>
      id === UNCATEGORIZED ? "Sin categoría" : (names.get(id) ?? "Categoría eliminada");
    const days = dayTotals(segments, range.from, range.to);
    const previousDays = dayTotals(previousSegments, range.previousFrom, range.previousTo);
    const channelScope: MetricsFilters = { platform: "ALL", category };
    const categoryScope: MetricsFilters = { platform, category: null };
    const channels = channelBreakdown(
      selectSegments(current.data, channelScope),
      selectSegments(previous.data, channelScope),
    );
    const categoryRows = categoryBreakdown(
      selectSegments(current.data, categoryScope),
      selectSegments(previous.data, categoryScope),
      categoryList,
    );
    const historyDays = history.data
      ? dayTotals(selectSegments(history.data, scope), history.data.from, history.data.to)
      : [];
    const leadsForecast = forecastDaily(
      historyDays.map((day) => ({ date: day.date, value: day.leads })),
      FORECAST_DAYS,
      1,
    );
    const salesForecast = forecastDaily(
      historyDays.map((day) => ({ date: day.date, value: day.closed })),
      FORECAST_DAYS,
      1,
    );
    const revenueForecast =
      salesForecast && ticket !== null
        ? {
            points: salesForecast.points.map((point) => ({
              ...point,
              value: point.value * ticket,
              low: point.low * ticket,
              high: point.high * ticket,
            })),
            total: salesForecast.total * ticket,
            low: salesForecast.low * ticket,
            high: salesForecast.high * ticket,
          }
        : null;
    const present = new Set(current.data.segments.map((segment) => segment.platform));
    return {
      period,
      from: range.from,
      to: range.to,
      previousFrom: range.previousFrom,
      previousTo: range.previousTo,
      settings: settings.data,
      categories: categoryList,
      platforms: CONNECTABLE_PLATFORMS.map((p) => p.id).filter((id) => present.has(id)),
      totals,
      previousTotals,
      rates: rates(totals),
      days,
      previousDays,
      current: totalsByMetric(days, ticket),
      previous: totalsByMetric(previousDays, ticket),
      forecasts: {
        ...(leadsForecast ? { leads: leadsForecast } : {}),
        ...(salesForecast ? { sales: salesForecast } : {}),
        ...(revenueForecast ? { revenue: revenueForecast } : {}),
      },
      channels,
      categoryRows,
      insights: buildInsights({
        days: period,
        current: totals,
        previous: previousTotals,
        channels,
        categories: categoryRows,
        categoryName,
      }),
      categoryName,
    };
  }, [
    current.data,
    previous.data,
    history.data,
    settings.data,
    categories.data,
    platform,
    category,
    period,
    range.from,
    range.to,
    range.previousFrom,
    range.previousTo,
  ]);

  const error = current.error ?? previous.error ?? settings.error;
  return {
    view,
    loading: !view && !error,
    error: view ? null : error,
    reload: () => Promise.all([current.reload(), previous.reload(), history.reload(), settings.reload()]),
  };
}
