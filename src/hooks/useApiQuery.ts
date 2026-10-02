import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";

type Result<T> = {
  path: string;
  data?: T;
  error?: string;
};

const FALLBACK_ERROR = "No pudimos cargar los datos. Probá de nuevo.";

export function useApiQuery<T>(path: string | null) {
  const [result, setResult] = useState<Result<T> | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api.get<T>(path).then(
      (data) => {
        if (!cancelled) setResult({ path, data });
      },
      (e: unknown) => {
        if (!cancelled) {
          setResult({
            path,
            error: e instanceof ApiError ? e.message : FALLBACK_ERROR,
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const current = result && result.path === path ? result : null;

  return {
    data: current?.data,
    error: current?.error ?? null,
    loading: path !== null && current === null,
    reload,
  };
}
