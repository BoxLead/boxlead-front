import { api } from "../api/client";
import type { MetricsSettings } from "../api/types";
import { invalidateQueries, setQueryData } from "./queryCache";

const METRICS_KEY = "/metrics";
export const METRICS_SETTINGS_KEY = "/metrics/settings";

export function metricsKey(from: string, to: string, timezone: string): string {
  return `${METRICS_KEY}?${new URLSearchParams({ from, to, timezone }).toString()}`;
}

export async function saveMetricsSettings(settings: MetricsSettings): Promise<MetricsSettings> {
  const saved = await api.put<MetricsSettings>(METRICS_SETTINGS_KEY, settings);
  setQueryData<MetricsSettings>(METRICS_SETTINGS_KEY, () => saved);
  await invalidateQueries(`${METRICS_KEY}?`);
  return saved;
}
