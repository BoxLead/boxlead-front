import { agentApi, api, ApiError } from "../api/client";

export type QueryState<T> = {
  data: T | undefined;
  error: string | null;
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

export const FALLBACK_ERROR = "No pudimos cargar los datos. Probá de nuevo.";
export const STALE_MS = 10_000;
const GC_MS = 5 * 60_000;

const IDLE: QueryState<unknown> = {
  data: undefined,
  error: null,
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
const resolvers = new Map<string, (key: string) => Promise<unknown>>();

function resolve(key: string): Promise<unknown> {
  for (const [prefix, resolver] of resolvers) {
    if (key === prefix || key.startsWith(`${prefix}?`) || key.startsWith(`${prefix}/`)) return resolver(key);
  }
  return fetcher(key);
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

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : FALLBACK_ERROR;
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
  const run = resolve(key).then(
    (data) => {
      if (entry.generation !== generation) {
        update(entry, { fetching: false });
        return;
      }
      update(entry, {
        data,
        error: null,
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
        status: hasData ? "success" : "error",
        fetching: false,
        fetchedAt: Date.now(),
      });
    },
  );
  entry.inflight = run.finally(() => {
    entry.inflight = null;
  });
  return entry.inflight;
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
  });
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

export function setQueryResolver(prefix: string, resolver: ((key: string) => Promise<unknown>) | null) {
  if (resolver) resolvers.set(prefix, resolver);
  else resolvers.delete(prefix);
}
