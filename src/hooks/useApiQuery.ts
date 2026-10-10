import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  fetchQuery,
  getQueryState,
  isStale,
  subscribe,
  type QueryState,
} from "../data/queryCache";

type Options = {
  refreshInterval?: number;
};

const NO_KEY: QueryState<never> = {
  data: undefined,
  error: null,
  status: "idle",
  fetching: false,
  fetchedAt: 0,
};

const noop = () => undefined;

export function useApiQuery<T>(key: string | null, options: Options = {}) {
  const { refreshInterval } = options;

  const subscribeToKey = useCallback(
    (listener: () => void) => (key ? subscribe(key, listener) : noop),
    [key],
  );
  const state = useSyncExternalStore(subscribeToKey, () =>
    key ? getQueryState<T>(key) : NO_KEY,
  );

  useEffect(() => {
    if (key && isStale(key)) void fetchQuery(key);
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible" && isStale(key)) {
        void fetchQuery(key);
      }
    };
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    const timer = refreshInterval
      ? setInterval(() => {
          if (document.visibilityState === "visible") void fetchQuery(key);
        }, refreshInterval)
      : null;
    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
      if (timer) clearInterval(timer);
    };
  }, [key, refreshInterval]);

  const reload = useCallback(
    () => (key ? fetchQuery(key) : Promise.resolve()),
    [key],
  );

  return {
    data: state.data,
    error: state.error,
    loading: key !== null && state.data === undefined && state.status !== "error" && state.status !== "success",
    refreshing: state.fetching && state.data !== undefined,
    reload,
  };
}
