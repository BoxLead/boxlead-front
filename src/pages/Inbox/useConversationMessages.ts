import { useEffect } from "react";
import { api } from "../../api/client";
import type { MessageResponse } from "../../api/types";
import { getQueryState, setQueryData } from "../../data/queryCache";
import { useApiQuery } from "../../hooks/useApiQuery";
import { messagesKey } from "./useConversationSender";

export const MESSAGES_REFRESH_MS = 10_000;
const OVERLAP_MS = 2_000;

export function mergeMessages(current: MessageResponse[], incoming: MessageResponse[]): MessageResponse[] {
  const known = new Set(current.map((message) => message.id));
  const added = incoming.filter((message) => !known.has(message.id));
  if (added.length === 0) return current;
  return [...current, ...added].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function newerThan(messages: MessageResponse[]): string | null {
  const last = messages.at(-1);
  if (!last) return null;
  const time = new Date(last.createdAt).getTime();
  if (Number.isNaN(time)) return null;
  return new Date(time - OVERLAP_MS).toISOString();
}

export async function pollNewerMessages(conversationId: string): Promise<void> {
  const key = messagesKey(conversationId);
  const current = getQueryState<MessageResponse[]>(key).data;
  const after = current ? newerThan(current) : null;
  if (!current || after === null) return;
  const incoming = await api.get<MessageResponse[]>(`${key}?after=${encodeURIComponent(after)}`);
  const latest = getQueryState<MessageResponse[]>(key).data ?? [];
  const merged = mergeMessages(latest, incoming);
  if (merged !== latest) setQueryData<MessageResponse[]>(key, () => merged);
}

export function useConversationMessages(conversationId: string) {
  const query = useApiQuery<MessageResponse[]>(messagesKey(conversationId));

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void pollNewerMessages(conversationId).catch(() => undefined);
    }, MESSAGES_REFRESH_MS);
    return () => clearInterval(timer);
  }, [conversationId]);

  return query;
}
