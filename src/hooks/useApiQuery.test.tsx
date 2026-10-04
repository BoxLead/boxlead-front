import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearQueryCache, setQueryFetcher } from "../data/queryCache";
import { useApiQuery } from "./useApiQuery";

const fetcher = vi.fn<(key: string) => Promise<unknown>>();

beforeEach(() => {
  clearQueryCache();
  fetcher.mockReset();
  setQueryFetcher(fetcher);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useApiQuery", () => {
  it("loads, then exposes the data", async () => {
    fetcher.mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useApiQuery<{ id: number }>("/leads/1"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ id: 1 }));
    expect(result.current.loading).toBe(false);
  });

  it("does nothing without a key", () => {
    const { result } = renderHook(() => useApiQuery(null));
    expect(result.current.loading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("serves two components from one request", async () => {
    fetcher.mockResolvedValue([]);
    renderHook(() => {
      useApiQuery("/conversations");
      useApiQuery("/conversations");
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  });

  it("polls while the page is visible", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetcher.mockResolvedValue([]);
    renderHook(() => useApiQuery("/conversations", { refreshInterval: 1000 }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not poll while the page is hidden", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetcher.mockResolvedValue([]);
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    renderHook(() => useApiQuery("/conversations", { refreshInterval: 1000 }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
  });
});
