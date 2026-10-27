import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../api/client";
import { AdminApiError, errorText } from "../../api/errors";
import type { AdminPage } from "../../api/types";
import { useAdmin } from "../../session/session";
import { shortId } from "./labels";
import type { Reseller } from "./types";

const MAX_PAGES = 20;

export function useReferralRoles() {
  const me = useAdmin();
  const owner = me.roles.includes("OWNER");
  return { owner, finance: owner || me.roles.includes("FINANCE") };
}

async function loadAll(signal: AbortSignal): Promise<Reseller[]> {
  const found: Reseller[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = page > 0 ? new URLSearchParams({ page: String(page) }) : undefined;
    const result = await adminApi.get<AdminPage<Reseller>>("/admin/resellers", { query, signal });
    found.push(...result.items);
    if ((page + 1) * result.size >= result.totalItems || result.items.length === 0) break;
  }
  return found;
}

export type ResellerDirectory = {
  resellers: Reseller[];
  loaded: boolean;
  nameOf: (id: string) => string;
};

export function useResellerDirectory(): ResellerDirectory {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadAll(controller.signal)
      .then((list) => {
        setResellers(list);
        setLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, []);

  const nameOf = useCallback(
    (id: string) => resellers.find((reseller) => reseller.id === id)?.displayName ?? `Revendedor ${shortId(id)}`,
    [resellers],
  );

  return { resellers, loaded, nameOf };
}

export type DetailResult<T> =
  | { status: "loading" }
  | { status: "error"; message: string; notFound: boolean }
  | { status: "ready"; data: T };

type Stored<T> = { key: string; result: DetailResult<T> };

const LOADING = { status: "loading" } as const;

export function useDetailQuery<T>(path: string, search = ""): DetailResult<T> & { reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [stored, setStored] = useState<Stored<T> | null>(null);
  const key = `${path}?${search}#${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    adminApi
      .get<T>(path, { query: new URLSearchParams(search), signal: controller.signal })
      .then((data) => setStored({ key, result: { status: "ready", data } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const notFound = error instanceof AdminApiError && error.status === 404;
        setStored({ key, result: { status: "error", message: errorText(error), notFound } });
      });
    return () => controller.abort();
  }, [path, search, key]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const result = stored && stored.key === key ? stored.result : LOADING;
  return { ...result, reload };
}
