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
  dailySeries,
  periodRange,
  rates,
  selectSegments,
  sumSegments,
  UNCATEGORIZED,
  type BreakdownRow,
  type MetricsFilters,
  type Rates,
  type SeriesPoint,
  type Totals,
} from "./metricsModel";

export const HISTORY_DAYS = 84;
export const FORECAST_DAYS = 14;

export type MetricsView = {
  period: MetricsPeriod;
  from: string;
  to: string;
  settings: MetricsSettings;
  categories: CategoryResponse[];
  platforms: PlatformType[];
  totals: Totals;
  previousTotals: Totals;
  rates: Rates;
  previousRates: Rates;
  daily: SeriesPoint[];
  previousDaily: SeriesPoint[];
  channels: BreakdownRow[];
  categoryRows: BreakdownRow[];
  forecast: Forecast | null;
  forecastCloseRate: number | null;
  insights: Insight[];
  categoryName: (id: string) => string;
};

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
    const segments = selectSegments(current.data, scope);
    const previousSegments = selectSegments(previous.data, scope);
    const totals = sumSegments(segments);
    const previousTotals = sumSegments(previousSegments);
    const categoryList = categories.data ?? [];
    const names = new Map(categoryList.map((item) => [item.id, item.name]));
    const categoryName = (id: string) => (id === UNCATEGORIZED ? "Sin categoría" : (names.get(id) ?? "Categoría eliminada"));
    const channels = channelBreakdown(segments, previousSegments);
    const categoryRows = categoryBreakdown(segments, previousSegments, categoryList);
    const historySegments = history.data ? selectSegments(history.data, scope) : [];
    const historySeries = history.data
      ? dailySeries(historySegments, history.data.from, history.data.to).map((point) => ({
          date: point.date,
          value: point.total,
        }))
      : [];
    const forecast = forecastDaily(historySeries, FORECAST_DAYS, 1);
    const present = new Set(current.data.segments.map((segment) => segment.platform));
    return {
      period,
      from: range.from,
      to: range.to,
      settings: settings.data,
      categories: categoryList,
      platforms: CONNECTABLE_PLATFORMS.map((p) => p.id).filter((id) => present.has(id)),
      totals,
      previousTotals,
      rates: rates(totals),
      previousRates: rates(previousTotals),
      daily: dailySeries(segments, range.from, range.to),
      previousDaily: dailySeries(previousSegments, range.previousFrom, range.previousTo),
      channels,
      categoryRows,
      forecast,
      forecastCloseRate: rates(sumSegments(historySegments)).close,
      insights: buildInsights({ days: period, current: totals, previous: previousTotals, channels, categories: categoryRows, categoryName }),
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
