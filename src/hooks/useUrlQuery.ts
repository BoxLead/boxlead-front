import { useEffect, useState } from "react";
import type { SetURLSearchParams } from "react-router-dom";

export const QUERY_PARAM = "q";
const WRITE_DELAY_MS = 300;

export function useUrlQuery(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  param = QUERY_PARAM,
): [string, (value: string) => void] {
  const [query, setQuery] = useState(() => searchParams.get(param) ?? "");

  useEffect(() => {
    const current = searchParams.get(param) ?? "";
    if (current === query.trim()) return;
    const timer = window.setTimeout(() => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (query.trim()) next.set(param, query.trim());
          else next.delete(param);
          return next;
        },
        { replace: true },
      );
    }, WRITE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query, param, searchParams, setSearchParams]);

  return [query, setQuery];
}
