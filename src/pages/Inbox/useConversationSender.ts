import { useCallback, useState } from "react";
import { api, ApiError } from "../../api/client";
import type {
  ConversationResponse,
  CreateMessageRequest,
  MessageResponse,
  PlatformType,
} from "../../api/types";
import { clearDraft } from "../../data/drafts";
import { invalidateQueries, setQueryData } from "../../data/queryCache";
import { getPlatform } from "../../platforms";
import type { PlatformErrorView } from "../../platforms/types";

export type PendingMessage = {
  tempId: string;
  content: string;
  createdAt: string;
  status: "sending" | "failed";
};

export const CONVERSATIONS_KEY = "/conversations";

export function messagesKey(conversationId: string): string {
  return `/conversations/${conversationId}/messages`;
}

function explain(platform: PlatformType, error: unknown): PlatformErrorView {
  if (error instanceof ApiError) {
    const view = getPlatform(platform).explainError(error.status, error.message);
    if (view) return view;
    return { title: "No se pudo enviar", detail: error.message, action: "retry" };
  }
  return {
    title: "No se pudo enviar",
    detail: "Revisá tu conexión a internet y probá de nuevo.",
    action: "retry",
  };
}

export function useConversationSender(conversationId: string, platform: PlatformType) {
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [failure, setFailure] = useState<PlatformErrorView | null>(null);

  const post = useCallback(
    async (body: CreateMessageRequest) => {
      const created = await api.post<MessageResponse>(messagesKey(conversationId), body);
      setQueryData<MessageResponse[]>(messagesKey(conversationId), (current) => [
        ...(current ?? []).filter((m) => m.id !== created.id),
        created,
      ]);
      setQueryData<ConversationResponse[]>(CONVERSATIONS_KEY, (current) =>
        (current ?? []).map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessagePreview: created.content,
                lastMessageDirection: "OUTBOUND",
                lastMessageAt: created.createdAt,
              }
            : c,
        ),
      );
      clearDraft(conversationId);
      void invalidateQueries(CONVERSATIONS_KEY);
    },
    [conversationId],
  );

  const deliver = useCallback(
    async (message: PendingMessage) => {
      setFailure(null);
      setPending((current) => [
        ...current.filter((p) => p.tempId !== message.tempId),
        { ...message, status: "sending" },
      ]);
      try {
        await post({ direction: "OUTBOUND", content: message.content });
        setPending((current) => current.filter((p) => p.tempId !== message.tempId));
        return true;
      } catch (error) {
        setFailure(explain(platform, error));
        setPending((current) =>
          current.map((p) => (p.tempId === message.tempId ? { ...p, status: "failed" } : p)),
        );
        return false;
      }
    },
    [platform, post],
  );

  const send = useCallback(
    (content: string) =>
      deliver({
        tempId: crypto.randomUUID(),
        content,
        createdAt: new Date().toISOString(),
        status: "sending",
      }),
    [deliver],
  );

  const replyToComment = useCallback(
    async (commentId: string, content: string) => {
      setFailure(null);
      try {
        await post({ direction: "OUTBOUND", kind: "COMMENT", content, replyToMessageId: commentId });
        return true;
      } catch (error) {
        setFailure(explain(platform, error));
        return false;
      }
    },
    [platform, post],
  );

  const retry = useCallback(
    (tempId: string) => {
      const message = pending.find((p) => p.tempId === tempId);
      if (message) void deliver(message);
    },
    [deliver, pending],
  );

  const discard = useCallback((tempId: string) => {
    setPending((current) => current.filter((p) => p.tempId !== tempId));
    setFailure(null);
  }, []);

  return { pending, failure, send, replyToComment, retry, discard, dismissFailure: () => setFailure(null) };
}
