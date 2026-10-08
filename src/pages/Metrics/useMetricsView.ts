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

const HISTORY_DAYS = 84;

export function useMetricsView(period: MetricsPeriod, filters: MetricsFilters) {
  const today = isoDate(new Date());
  const timezone = localTimezone();
  const range = useMemo(() => periodRange(period, today), [period, today]);
  const historyTo = addDays(today, -1);

  const current = useApiQuery<MetricsReport>(metricsKey(range.from, range.to, timezone));
  const previous = useApiQuery<MetricsReport>(metricsKey(range.previousFrom, range.previousTo, timezone));
  const history = useApiQuery<MetricsReport>(metricsKey(addDays(historyTo, -(HISTORY_DAYS - 1)), historyTo, timezone));
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
            history: history.data,
            settings: settings.data,
            categories: categories.data ?? [],
          })
        : null,
    [period, platform, category, range, current.data, previous.data, history.data, settings.data, categories.data],
  );

  const [shown, setShown] = useState<MetricsView | null>(null);
  if (view && view !== shown) setShown(view);
  const visible = view ?? shown;
  const error = view ? null : (current.error ?? previous.error ?? settings.error);

  return {
    view: visible,
    updating: !view && !error && visible !== null,
    loading: !visible && !error,
    error,
    reload: () => Promise.all([current.reload(), previous.reload(), history.reload(), settings.reload()]),
  };
}
