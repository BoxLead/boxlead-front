import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, toApiError } from "../api/client";
import { BILLING_SUMMARY_KEY } from "./billing";
import { clearQueryCache, fetchQuery, getQueryState, setQueryFetcher } from "./queryCache";
import { onSessionRefresh } from "./session";

const fetcher = vi.fn<(key: string) => Promise<unknown>>();
const refresh = vi.fn();
let stop: () => void = () => undefined;

beforeEach(() => {
  clearQueryCache();
  fetcher.mockReset();
  refresh.mockReset();
  setQueryFetcher(fetcher);
  stop = onSessionRefresh(refresh);
});

afterEach(() => {
  stop();
  setQueryFetcher(null);
});

describe("session refresh", () => {
  it("drops the stored summary and reads the session again when the summary answers 404", async () => {
    fetcher.mockResolvedValueOnce({ access: "RESTRICTED" });
    await fetchQuery(BILLING_SUMMARY_KEY);
    fetcher.mockRejectedValueOnce(new ApiError("Not found", 404));
    await fetchQuery(BILLING_SUMMARY_KEY);
    expect(getQueryState(BILLING_SUMMARY_KEY).data).toBeUndefined();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the summary on other failures", async () => {
    fetcher.mockResolvedValueOnce({ access: "FULL" });
    await fetchQuery(BILLING_SUMMARY_KEY);
    fetcher.mockRejectedValueOnce(new ApiError("Down", 503));
    await fetchQuery(BILLING_SUMMARY_KEY);
    fetcher.mockRejectedValueOnce(new ApiError("Not found", 404));
    await fetchQuery("/leads/x");
    expect(getQueryState(BILLING_SUMMARY_KEY).data).toEqual({ access: "FULL" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reads the session again after a plan error", () => {
    toApiError(402, { code: "PLAN_REQUIRED" }, "/conversations/c-1/messages");
    expect(refresh).toHaveBeenCalledTimes(1);
    toApiError(402, { code: "SOMETHING_ELSE" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
