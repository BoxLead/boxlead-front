import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { metricsKey, METRICS_SETTINGS_KEY, saveMetricsSettings } from "./metrics";
import { clearQueryCache, fetchQuery, getQueryState, isStale, setQueryFetcher } from "./queryCache";

vi.mock("../api/client", () => ({
  api: { put: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  clearQueryCache();
  setQueryFetcher(() => Promise.resolve({ segments: [] }));
});

describe("metrics data", () => {
  it("keys every report by range and time zone", () => {
    expect(metricsKey("2026-09-08", "2026-10-07", "America/Argentina/Buenos_Aires")).toBe(
      "/metrics?from=2026-09-08&to=2026-10-07&timezone=America%2FArgentina%2FBuenos_Aires",
    );
  });

  it("saves the assumptions with the server's answer and marks every report as stale", async () => {
    const key = metricsKey("2026-09-08", "2026-10-07", "UTC");
    await fetchQuery(key);
    expect(isStale(key)).toBe(false);
    const settings = { manualReplyMinutes: 7, businessHours: { weekdays: [0, 1], from: 9, to: 18 } };
    const saved = { ...settings, businessHours: { weekdays: [0, 1], from: 9, to: 18 } };
    vi.mocked(api.put).mockResolvedValue(saved);
    await expect(saveMetricsSettings(settings)).resolves.toBe(saved);
    expect(api.put).toHaveBeenCalledWith(METRICS_SETTINGS_KEY, settings);
    expect(getQueryState(METRICS_SETTINGS_KEY).data).toBe(saved);
    expect(isStale(key)).toBe(true);
  });
});
