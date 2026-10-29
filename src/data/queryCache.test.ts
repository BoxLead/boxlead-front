import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import {
  clearQueryCache,
  discardQueryData,
  fetchQuery,
  getQueryState,
  invalidateQueries,
  isStale,
  onQueryError,
  setQueryData,
  setQueryFetcher,
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
  setQueryFetcher(null);
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

  it("drops a response that arrives after a newer write", async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    fetcher.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const pending = fetchQuery("/conversations/1/draft");
    setQueryData<string | undefined>("/conversations/1/draft", () => undefined);
    resolveFetch({ id: "draft-1", content: "hola" });
    await pending;
    expect(getQueryState("/conversations/1/draft")).toMatchObject({ data: undefined, fetching: false });
  });

  it("notifies subscribers of optimistic updates", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe("/x", listener);
    setQueryData<string[]>("/x", (current) => [...(current ?? []), "nuevo"]);
    expect(listener).toHaveBeenCalled();
    expect(getQueryState("/x").data).toEqual(["nuevo"]);
    unsubscribe();
  });
});

describe("structural sharing", () => {
  it("keeps the previous reference when a poll returns the same data", async () => {
    fetcher.mockResolvedValueOnce([{ id: "a", unread: 1, tags: ["x"] }]);
    await fetchQuery("/same");
    const first = getQueryState("/same").data;
    fetcher.mockResolvedValueOnce([{ id: "a", unread: 1, tags: ["x"] }]);
    await fetchQuery("/same");
    expect(getQueryState("/same").data).toBe(first);
  });

  it("replaces the data when something changed", async () => {
    fetcher.mockResolvedValueOnce([{ id: "a", unread: 1 }]);
    await fetchQuery("/changed");
    const first = getQueryState("/changed").data;
    fetcher.mockResolvedValueOnce([{ id: "a", unread: 2 }]);
    await fetchQuery("/changed");
    expect(getQueryState("/changed").data).not.toBe(first);
    expect(getQueryState("/changed").data).toEqual([{ id: "a", unread: 2 }]);
  });
});

describe("errors", () => {
  it("keeps the status of a failed request and tells the error listeners", async () => {
    const listener = vi.fn();
    const stop = onQueryError(listener);
    fetcher.mockResolvedValueOnce({ plan: "STARTER" });
    await fetchQuery("/billing/summary");
    const failure = new ApiError("Not found", 404);
    fetcher.mockRejectedValueOnce(failure);
    await fetchQuery("/billing/summary");
    expect(getQueryState("/billing/summary")).toMatchObject({ data: { plan: "STARTER" }, errorStatus: 404, status: "success" });
    expect(listener).toHaveBeenCalledWith("/billing/summary", failure);
    stop();
  });

  it("drops the stored data on demand so nobody reads an old answer", async () => {
    fetcher.mockResolvedValueOnce({ plan: "STARTER" });
    await fetchQuery("/billing/summary");
    fetcher.mockRejectedValueOnce(new ApiError("Not found", 404));
    await fetchQuery("/billing/summary");
    discardQueryData("/billing/summary");
    expect(getQueryState("/billing/summary")).toMatchObject({ data: undefined, status: "error" });
    expect(isStale("/billing/summary")).toBe(true);
    fetcher.mockResolvedValueOnce({ plan: "BUSINESS" });
    await fetchQuery("/billing/summary");
    expect(getQueryState("/billing/summary")).toMatchObject({ data: { plan: "BUSINESS" }, errorStatus: null });
  });
});
