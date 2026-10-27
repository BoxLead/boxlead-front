import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { adminApi } from "../api/client";
import { errorText } from "../api/errors";
import type { AdminPage } from "../api/types";
import type { Reseller } from "../areas/referrals/types";
import { ResellerDirectoryContext, type DirectoryState, type DirectoryValue } from "./resellerDirectory";

const MAX_PAGES = 20;

async function loadAll(signal: AbortSignal): Promise<Reseller[]> {
  const found: Reseller[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ page: String(page) });
    const result = await adminApi.get<AdminPage<Reseller>>("/admin/resellers", { query, signal });
    found.push(...result.items);
    if (result.items.length === 0 || found.length >= result.totalItems) break;
  }
  return found;
}

export function ResellerDirectoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DirectoryState>({ status: "idle" });
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    setState({ status: "loading" });
    loadAll(controller.signal)
      .then((resellers) => {
        if (!controller.signal.aborted) setState({ status: "ready", resellers });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "error", message: errorText(error) });
      })
      .finally(() => {
        if (inFlight.current === controller) inFlight.current = null;
      });
  }, []);

  const invalidate = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    setState({ status: "idle" });
  }, []);

  useEffect(() => () => inFlight.current?.abort(), []);

  const value = useMemo<DirectoryValue>(() => ({ state, load, invalidate }), [state, load, invalidate]);
  return <ResellerDirectoryContext.Provider value={value}>{children}</ResellerDirectoryContext.Provider>;
}
