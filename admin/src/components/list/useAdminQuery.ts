import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../api/client";
import { errorText } from "../../api/errors";

export type QueryResult<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

type Stored<T> = { key: string; result: QueryResult<T> };

const LOADING = { status: "loading" } as const;

export function useAdminQuery<T>(path: string | null, search = ""): QueryResult<T> & { reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [stored, setStored] = useState<Stored<T> | null>(null);
  const key = path ? `${path}?${search}#${attempt}` : null;

  useEffect(() => {
    if (!path || !key) return;
    const controller = new AbortController();
    adminApi
      .get<T>(path, { query: new URLSearchParams(search), signal: controller.signal })
      .then((data) => setStored({ key, result: { status: "ready", data } }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setStored({ key, result: { status: "error", message: errorText(error) } });
      });
    return () => controller.abort();
  }, [path, search, key]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const result = stored && stored.key === key ? stored.result : LOADING;
  return { ...result, reload };
}
