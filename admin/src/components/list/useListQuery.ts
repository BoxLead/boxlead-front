import type { AdminPage } from "../../api/types";
import { useAdminQuery } from "./useAdminQuery";
import { useListParams } from "./useListParams";

export function useListQuery<T>(path: string, filterKeys: readonly string[]) {
  const params = useListParams(filterKeys);
  const query = useAdminQuery<AdminPage<T>>(path, params.search);
  return { params, query };
}
