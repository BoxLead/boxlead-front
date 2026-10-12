import type { CategoryResponse, MetricsReport, MetricsSettings } from "../api/types";
import { isoDate } from "../util/dates";
import { CATEGORIES_KEY } from "./categories";
import { METRICS_SETTINGS_KEY } from "./metrics";
import { buildDemoReport, DEMO_SETTINGS } from "./metricsDemo";
import { fetchQuery, getQueryState } from "./queryCache";

const LATENCY_MS = 180;

export async function resolveDemoMetrics(key: string): Promise<MetricsReport | MetricsSettings> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  const settings = getQueryState<MetricsSettings>(METRICS_SETTINGS_KEY).data ?? DEMO_SETTINGS;
  if (key === METRICS_SETTINGS_KEY) return settings;
  const params = new URLSearchParams(key.slice(key.indexOf("?") + 1));
  const today = isoDate(new Date());
  await fetchQuery(CATEGORIES_KEY);
  return buildDemoReport({
    from: params.get("from") ?? today,
    to: params.get("to") ?? today,
    today,
    timezone: params.get("timezone") ?? "UTC",
    categories: getQueryState<CategoryResponse[]>(CATEGORIES_KEY).data ?? [],
    settings,
  });
}
