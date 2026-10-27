import type { AdminPage } from "../../api/types";
import type { FilterRules } from "./filterRules";
import { useAdminQuery, type QueryResult } from "./useAdminQuery";
import { useListParams } from "./useListParams";

export type ListQueryResult<T> = (QueryResult<T> | { status: "invalid"; message: string }) & { reload: () => void };

export function useListQuery<T>(path: string, filterKeys: readonly string[], rules?: FilterRules) {
  const params = useListParams(filterKeys, rules);
  const loaded = useAdminQuery<AdminPage<T>>(params.problem ? null : path, params.search);
  const query: ListQueryResult<AdminPage<T>> = params.problem ? { status: "invalid", message: params.problem, reload: loaded.reload } : loaded;
  return { params, query };
}
