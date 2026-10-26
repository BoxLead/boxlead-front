import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export const PAGE_PARAM = "page";

export type ListParams = {
  page: number;
  search: string;
  active: boolean;
  value: (key: string) => string;
  values: (key: string) => string[];
  setFilter: (key: string, value: string | readonly string[] | null) => void;
  setPage: (page: number) => void;
  clear: () => void;
};

export function useListParams(keys: readonly string[]): ListParams {
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Math.floor(Number(params.get(PAGE_PARAM)) || 0));

  const search = useMemo(() => {
    const query = new URLSearchParams();
    for (const key of keys) {
      for (const value of params.getAll(key)) if (value) query.append(key, value);
    }
    if (page > 0) query.set(PAGE_PARAM, String(page));
    return query.toString();
  }, [keys, params, page]);

  const update = useCallback(
    (change: (next: URLSearchParams) => void) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        change(next);
        return next;
      });
    },
    [setParams],
  );

  return {
    page,
    search,
    active: keys.some((key) => params.getAll(key).some(Boolean)),
    value: (key) => params.get(key) ?? "",
    values: (key) => params.getAll(key).filter(Boolean),
    setFilter: (key, value) =>
      update((next) => {
        next.delete(key);
        next.delete(PAGE_PARAM);
        const list = value === null ? [] : typeof value === "string" ? [value] : value;
        for (const item of list) if (item) next.append(key, item);
      }),
    setPage: (target) =>
      update((next) => {
        if (target > 0) next.set(PAGE_PARAM, String(target));
        else next.delete(PAGE_PARAM);
      }),
    clear: () =>
      update((next) => {
        for (const key of keys) next.delete(key);
        next.delete(PAGE_PARAM);
      }),
  };
}
