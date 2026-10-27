import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { filterProblem, type FilterRules } from "./filterRules";

export const PAGE_PARAM = "page";

const NO_RULES: FilterRules = {};

export type ListParams = {
  page: number;
  search: string;
  active: boolean;
  problem: string | null;
  value: (key: string) => string;
  values: (key: string) => string[];
  setFilter: (key: string, value: string | readonly string[] | null) => void;
  setPage: (page: number) => void;
  clear: () => void;
};

export function pageFromUrl(raw: string | null): number {
  return Math.max(0, Math.floor(Number(raw) || 1) - 1);
}

export function useListParams(keys: readonly string[], rules: FilterRules = NO_RULES): ListParams {
  const [params, setParams] = useSearchParams();
  const page = pageFromUrl(params.get(PAGE_PARAM));

  const search = useMemo(() => {
    const query = new URLSearchParams();
    for (const key of keys) {
      for (const value of params.getAll(key)) if (value) query.append(key, value);
    }
    if (page > 0) query.set(PAGE_PARAM, String(page));
    return query.toString();
  }, [keys, params, page]);

  const problem = useMemo(() => filterProblem(rules, (key) => params.getAll(key).filter(Boolean)), [rules, params]);

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
    problem,
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
        if (target > 0) next.set(PAGE_PARAM, String(target + 1));
        else next.delete(PAGE_PARAM);
      }),
    clear: () =>
      update((next) => {
        for (const key of keys) next.delete(key);
        next.delete(PAGE_PARAM);
      }),
  };
}
