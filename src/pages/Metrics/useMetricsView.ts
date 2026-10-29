import { useMemo, useState } from "react";
import type { CategoryResponse, MetricsReport, MetricsSettings } from "../../api/types";
import { CATEGORIES_KEY } from "../../data/categories";
import { METRICS_SETTINGS_KEY, metricsKey } from "../../data/metrics";
import { useApiQuery } from "../../hooks/useApiQuery";
import { addDays, isoDate, localTimezone } from "../../util/dates";
import type { MetricsPeriod } from "../../util/metrics";
import type { MetricsFilters } from "./metricsModel";
import { periodRange } from "./metricsModel";
import { buildMetricsView, type MetricsView } from "./metricsView";
import { FORECAST_HISTORY_DAYS } from "./planPeriods";

type Options = {
  enabled?: boolean;
  forecast?: boolean;
};

export function useMetricsView(period: MetricsPeriod, filters: MetricsFilters, options: Options = {}) {
  const { enabled = true, forecast = true } = options;
  const today = isoDate(new Date());
  const timezone = localTimezone();
  const range = useMemo(() => periodRange(period, today), [period, today]);
  const historyTo = addDays(today, -1);

  const historyFrom = addDays(historyTo, -(FORECAST_HISTORY_DAYS - 1));
  const current = useApiQuery<MetricsReport>(enabled ? metricsKey(range.from, range.to, timezone) : null);
  const previous = useApiQuery<MetricsReport>(enabled ? metricsKey(range.previousFrom, range.previousTo, timezone) : null);
  const history = useApiQuery<MetricsReport>(enabled && forecast ? metricsKey(historyFrom, historyTo, timezone) : null);
  const settings = useApiQuery<MetricsSettings>(METRICS_SETTINGS_KEY);
  const categories = useApiQuery<CategoryResponse[]>(CATEGORIES_KEY);

  const { platform, category } = filters;
  const view = useMemo(
    () =>
      current.data && previous.data && settings.data
        ? buildMetricsView({
            period,
            filters: { platform, category },
            range,
            current: current.data,
            previous: previous.data,
            history: forecast ? history.data : undefined,
            settings: settings.data,
            categories: categories.data,
          })
        : null,
    [period, platform, category, range, current.data, previous.data, forecast, history.data, settings.data, categories.data],
  );

  const [shown, setShown] = useState<MetricsView | null>(null);
  if (view && view !== shown) setShown(view);
  const visible = view ?? shown;
  const planLimited = current.errorStatus === 402 || previous.errorStatus === 402;
  const error = view || planLimited ? null : (current.error ?? previous.error ?? settings.error);

  return {
    view: visible,
    updating: !view && !error && !planLimited && visible !== null,
    loading: !visible && !error && !planLimited,
    error,
    planLimited: !view && planLimited,
    reload: () => Promise.all([current.reload(), previous.reload(), history.reload(), settings.reload()]),
  };
}
