import i18next from "i18next";
import { agentApi, api, ApiError } from "../api/client";

export type QueryState<T> = {
  data: T | undefined;
  error: string | null;
  errorStatus: number | null;
  status: "idle" | "loading" | "success" | "error";
  fetching: boolean;
  fetchedAt: number;
};

type Entry = {
  state: QueryState<unknown>;
  listeners: Set<() => void>;
  inflight: Promise<void> | null;
  gcTimer: ReturnType<typeof setTimeout> | null;
  generation: number;
};

export const STALE_MS = 10_000;
const GC_MS = 5 * 60_000;

const IDLE: QueryState<unknown> = {
  data: undefined,
  error: null,
  errorStatus: null,
  status: "idle",
  fetching: false,
  fetchedAt: 0,
};

const entries = new Map<string, Entry>();
export const AGENT_KEY_PREFIX = "agent:";

function defaultFetcher(key: string): Promise<unknown> {
  return key.startsWith(AGENT_KEY_PREFIX)
    ? agentApi.get<unknown>(key.slice(AGENT_KEY_PREFIX.length))
    : api.get<unknown>(key);
}

let fetcher: (key: string) => Promise<unknown> = defaultFetcher;

type ErrorListener = (key: string, error: unknown) => void;
const errorListeners = new Set<ErrorListener>();

export function onQueryError(listener: ErrorListener): () => void {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

function entryFor(key: string): Entry {
  let entry = entries.get(key);
  if (!entry) {
    entry = { state: IDLE, listeners: new Set(), inflight: null, gcTimer: null, generation: 0 };
    entries.set(key, entry);
  }
  return entry;
}

function update(entry: Entry, patch: Partial<QueryState<unknown>>) {
  entry.state = { ...entry.state, ...patch };
  entry.listeners.forEach((listener) => listener());
}

export function sameData(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) return true;
  if (typeof previous !== "object" || typeof next !== "object" || previous === null || next === null) return false;
  if (Array.isArray(previous) !== Array.isArray(next)) return false;
  if (Array.isArray(previous) && Array.isArray(next)) {
    return previous.length === next.length && previous.every((item, index) => sameData(item, next[index]));
  }
  const left = previous as Record<string, unknown>;
  const right = next as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => key in right && sameData(left[key], right[key]));
}

function keepStable(previous: unknown, next: unknown): unknown {
  return previous !== undefined && sameData(previous, next) ? previous : next;
}

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : i18next.t("apiErrors.loadFailed");
}

export function getQueryState<T>(key: string): QueryState<T> {
  return (entries.get(key)?.state ?? IDLE) as QueryState<T>;
}

export function fetchQuery(key: string): Promise<void> {
  const entry = entryFor(key);
  if (entry.inflight) return entry.inflight;
  update(entry, {
    fetching: true,
    status: entry.state.status === "idle" ? "loading" : entry.state.status,
  });
  const generation = entry.generation;
  const run = fetcher(key).then(
    (data) => {
      if (entry.generation !== generation) {
        update(entry, { fetching: false });
        return;
      }
      update(entry, {
        data: keepStable(entry.state.data, data),
        error: null,
        errorStatus: null,
        status: "success",
        fetching: false,
        fetchedAt: Date.now(),
      });
    },
    (error: unknown) => {
      if (entry.generation !== generation) {
        update(entry, { fetching: false });
        return;
      }
      const hasData = entry.state.data !== undefined;
      update(entry, {
        error: messageOf(error),
        errorStatus: error instanceof ApiError ? error.status : null,
        status: hasData ? "success" : "error",
        fetching: false,
        fetchedAt: Date.now(),
      });
      errorListeners.forEach((listener) => listener(key, error));
    },
  );
  entry.inflight = run.finally(() => {
    entry.inflight = null;
  });
  return entry.inflight;
}

export function prefetchQuery(key: string): void {
  if (isStale(key)) void fetchQuery(key);
}

export function isStale(key: string, now = Date.now()): boolean {
  const state = getQueryState(key);
  return state.status === "idle" || state.status === "error" || now - state.fetchedAt > STALE_MS;
}

export function subscribe(key: string, listener: () => void): () => void {
  const entry = entryFor(key);
  if (entry.gcTimer) {
    clearTimeout(entry.gcTimer);
    entry.gcTimer = null;
  }
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0) {
      entry.gcTimer = setTimeout(() => {
        if (entry.listeners.size === 0 && !entry.inflight) entries.delete(key);
      }, GC_MS);
    }
  };
}

export function setQueryData<T>(key: string, updater: (current: T | undefined) => T) {
  const entry = entryFor(key);
  entry.generation += 1;
  update(entry, {
    data: updater(entry.state.data as T | undefined),
    status: "success",
    error: null,
    errorStatus: null,
  });
}

export function discardQueryData(key: string) {
  const entry = entries.get(key);
  if (!entry || entry.state.data === undefined) return;
  entry.generation += 1;
  update(entry, { data: undefined, status: entry.state.error ? "error" : "idle", fetchedAt: 0 });
}

export function invalidateQueries(prefix: string): Promise<void[]> {
  const pending: Promise<void>[] = [];
  entries.forEach((entry, key) => {
    if (!key.startsWith(prefix)) return;
    if (entry.listeners.size > 0) {
      pending.push(fetchQuery(key));
    } else {
      entry.state = { ...entry.state, fetchedAt: 0 };
    }
  });
  return Promise.all(pending);
}

export function activeKeys(): string[] {
  return [...entries.entries()]
    .filter(([, entry]) => entry.listeners.size > 0)
    .map(([key]) => key);
}

export function clearQueryCache() {
  entries.forEach((entry) => {
    if (entry.gcTimer) clearTimeout(entry.gcTimer);
  });
  entries.clear();
}

export function setQueryFetcher(next: ((key: string) => Promise<unknown>) | null) {
  fetcher = next ?? defaultFetcher;
}
