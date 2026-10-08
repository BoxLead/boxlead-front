import { useEffect, useMemo, useRef } from "react";
import type { ContextItem, MessageResponse } from "../../api/types";

export function missingPostRefs(messages: MessageResponse[], posts: Map<string, ContextItem>): string[] {
  const missing = new Set<string>();
  for (const message of messages) {
    if (message.kind === "COMMENT" && message.contextRef && !posts.has(message.contextRef)) {
      missing.add(message.contextRef);
    }
  }
  return [...missing];
}

export function useMissingPostRefresh(
  messages: MessageResponse[],
  posts: Map<string, ContextItem>,
  loaded: boolean,
  reload: () => Promise<unknown>,
) {
  const requested = useRef(new Set<string>());
  const missing = useMemo(() => missingPostRefs(messages, posts), [messages, posts]);

  useEffect(() => {
    if (!loaded) return;
    const fresh = missing.filter((ref) => !requested.current.has(ref));
    if (fresh.length === 0) return;
    for (const ref of fresh) requested.current.add(ref);
    void reload();
  }, [loaded, missing, reload]);
}
