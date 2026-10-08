import { api } from "../api/client";
import type { MetricsSettings } from "../api/types";
import { invalidateQueries, setQueryData, setQueryResolver } from "./queryCache";

const METRICS_KEY = "/metrics";
export const METRICS_SETTINGS_KEY = "/metrics/settings";
export const METRICS_DEMO = true;

export function metricsKey(from: string, to: string, timezone: string): string {
  return `${METRICS_KEY}?${new URLSearchParams({ from, to, timezone }).toString()}`;
}

if (METRICS_DEMO) {
  setQueryResolver(METRICS_KEY, async (key) => (await import("./metricsDemoResolver")).resolveDemoMetrics(key));
}

export async function saveMetricsSettings(settings: MetricsSettings): Promise<MetricsSettings> {
  const saved = METRICS_DEMO ? settings : await api.put<MetricsSettings>(METRICS_SETTINGS_KEY, settings);
  setQueryData<MetricsSettings>(METRICS_SETTINGS_KEY, () => saved);
  await invalidateQueries(`${METRICS_KEY}?`);
  return saved;
}
