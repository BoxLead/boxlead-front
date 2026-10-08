import { beforeEach, describe, expect, it } from "vitest";
import { metricsKey, METRICS_SETTINGS_KEY, saveMetricsSettings } from "./metrics";
import { clearQueryCache, fetchQuery, getQueryState, isStale, setQueryFetcher, setQueryResolver } from "./queryCache";

beforeEach(() => {
  clearQueryCache();
  setQueryResolver("/metrics", null);
  setQueryFetcher(() => Promise.resolve({ segments: [] }));
});

describe("metrics data", () => {
  it("keys every report by range and time zone", () => {
    expect(metricsKey("2026-09-08", "2026-10-07", "America/Argentina/Buenos_Aires")).toBe(
      "/metrics?from=2026-09-08&to=2026-10-07&timezone=America%2FArgentina%2FBuenos_Aires",
    );
  });

  it("saves the assumptions and marks every report as stale", async () => {
    const key = metricsKey("2026-09-08", "2026-10-07", "UTC");
    await fetchQuery(key);
    expect(isStale(key)).toBe(false);
    const settings = { manualReplyMinutes: 7, businessHours: null };
    await expect(saveMetricsSettings(settings)).resolves.toEqual(settings);
    expect(getQueryState(METRICS_SETTINGS_KEY).data).toEqual(settings);
    expect(isStale(key)).toBe(true);
  });
});
