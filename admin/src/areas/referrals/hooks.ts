import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../api/client";
import { AdminApiError, errorText } from "../../api/errors";
import { useAdmin } from "../../session/session";

export function useReferralRoles() {
  const me = useAdmin();
  const owner = me.roles.includes("OWNER");
  return { owner, finance: owner || me.roles.includes("FINANCE") };
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
