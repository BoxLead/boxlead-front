import { api } from "../api/client";
import type { CategoryResponse, MetricsReport, MetricsSettings } from "../api/types";
import { isoDate } from "../util/dates";
import { CATEGORIES_KEY } from "./categories";
import { buildDemoReport, DEMO_SETTINGS } from "./metricsDemo";
import { fetchQuery, getQueryState, invalidateQueries, setQueryData, setQueryResolver } from "./queryCache";

export const METRICS_KEY = "/metrics";
export const METRICS_SETTINGS_KEY = "/metrics/settings";
export const METRICS_DEMO = true;

const DEMO_LATENCY_MS = 180;

export function metricsKey(from: string, to: string, timezone: string): string {
  const params = new URLSearchParams({ from, to, timezone });
  return `${METRICS_KEY}?${params.toString()}`;
}

async function resolveDemo(key: string): Promise<MetricsReport | MetricsSettings> {
  await new Promise((resolve) => setTimeout(resolve, DEMO_LATENCY_MS));
  const settings = getQueryState<MetricsSettings>(METRICS_SETTINGS_KEY).data ?? DEMO_SETTINGS;
  if (key === METRICS_SETTINGS_KEY) return settings;
  const params = new URLSearchParams(key.slice(key.indexOf("?") + 1));
  await fetchQuery(CATEGORIES_KEY);
  return buildDemoReport({
    from: params.get("from") ?? isoDate(new Date()),
    to: params.get("to") ?? isoDate(new Date()),
    today: isoDate(new Date()),
    timezone: params.get("timezone") ?? "UTC",
    categories: getQueryState<CategoryResponse[]>(CATEGORIES_KEY).data ?? [],
    settings,
  });
}

if (METRICS_DEMO) setQueryResolver(METRICS_KEY, resolveDemo);

export async function saveMetricsSettings(settings: MetricsSettings): Promise<MetricsSettings> {
  const saved = METRICS_DEMO ? settings : await api.put<MetricsSettings>(METRICS_SETTINGS_KEY, settings);
  setQueryData<MetricsSettings>(METRICS_SETTINGS_KEY, () => saved);
  await invalidateQueries(`${METRICS_KEY}?`);
  return saved;
}
