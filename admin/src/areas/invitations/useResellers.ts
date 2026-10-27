import { useEffect, useState } from "react";
import { loadResellers } from "./api";
import type { ResellerOption } from "./types";

export type ResellerState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: ResellerOption[]; names: Map<string, string> };

export function useResellers(): ResellerState {
  const [state, setState] = useState<ResellerState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    loadResellers(controller.signal)
      .then((items) => setState({ status: "ready", items, names: new Map(items.map((item) => [item.id, item.displayName])) }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, []);

  return state;
}
