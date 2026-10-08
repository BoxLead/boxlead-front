import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import {
  clearQueryCache,
  fetchQuery,
  getQueryState,
  invalidateQueries,
  isStale,
  setQueryData,
  setQueryFetcher,
  setQueryResolver,
  STALE_MS,
  subscribe,
} from "./queryCache";

const fetcher = vi.fn<(key: string) => Promise<unknown>>();

beforeEach(() => {
  clearQueryCache();
  fetcher.mockReset();
  setQueryFetcher(fetcher);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("query cache", () => {
  it("shares one request between concurrent callers", async () => {
    fetcher.mockResolvedValue(["a"]);
    await Promise.all([fetchQuery("/leads"), fetchQuery("/leads")]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getQueryState("/leads")).toMatchObject({ data: ["a"], status: "success", error: null });
  });

  it("keeps the previous data when a refresh fails", async () => {
    fetcher.mockResolvedValueOnce(["a"]).mockRejectedValueOnce(new ApiError("Caído", 502));
    await fetchQuery("/leads");
    await fetchQuery("/leads");
    expect(getQueryState("/leads")).toMatchObject({ data: ["a"], status: "success", error: "Caído" });
  });

  it("reports a generic message for network errors without data", async () => {
    fetcher.mockRejectedValue(new TypeError("Failed to fetch"));
    await fetchQuery("/leads");
    expect(getQueryState("/leads")).toMatchObject({
      status: "error",
      error: "No pudimos cargar los datos. Probá de nuevo.",
    });
  });

  it("becomes stale after the stale window", async () => {
    vi.useFakeTimers();
    fetcher.mockResolvedValue([]);
    await fetchQuery("/leads");
    expect(isStale("/leads")).toBe(false);
    vi.advanceTimersByTime(STALE_MS + 1);
    expect(isStale("/leads")).toBe(true);
  });

  it("refetches watched keys that match an invalidated prefix and marks the rest stale", async () => {
    fetcher.mockResolvedValue([]);
    await fetchQuery("/conversations?platform=MELI");
    await fetchQuery("/conversations/1/messages");
    await fetchQuery("/leads");
    const unsubscribe = subscribe("/conversations?platform=MELI", () => undefined);
    fetcher.mockClear();

    await invalidateQueries("/conversations");

    expect(fetcher).toHaveBeenCalledWith("/conversations?platform=MELI");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(isStale("/conversations/1/messages")).toBe(true);
    expect(isStale("/leads")).toBe(false);
    unsubscribe();
  });

  it("notifies subscribers of optimistic updates", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe("/x", listener);
    setQueryData<string[]>("/x", (current) => [...(current ?? []), "nuevo"]);
    expect(listener).toHaveBeenCalled();
    expect(getQueryState("/x").data).toEqual(["nuevo"]);
    unsubscribe();
  });

  it("answers keys under a prefix with a local resolver instead of the API", async () => {
    const resolver = vi.fn((key: string) => Promise.resolve({ key }));
    setQueryResolver("/metrics", resolver);
    fetcher.mockResolvedValue("api");
    await Promise.all([fetchQuery("/metrics?from=a"), fetchQuery("/metrics/settings"), fetchQuery("/metricsx")]);
    setQueryResolver("/metrics", null);
    await fetchQuery("/metrics");
    expect(resolver.mock.calls.map(([key]) => key)).toEqual(["/metrics?from=a", "/metrics/settings"]);
    expect(getQueryState("/metrics?from=a").data).toEqual({ key: "/metrics?from=a" });
    expect(fetcher.mock.calls.map(([key]) => key)).toEqual(["/metricsx", "/metrics"]);
  });
});
