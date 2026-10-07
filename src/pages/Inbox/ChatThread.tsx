import type { ContextItem, MessageResponse } from "../../api/types";
import type { CommentReplyPolicy } from "../../platforms/types";
import { formatTime } from "../../util/format";
import { CommentEvent } from "./CommentEvent";
import { groupByDay } from "./inboxModel";
import type { PendingMessage } from "./useConversationSender";

type ChatThreadProps = {
  messages: MessageResponse[];
  pending: PendingMessage[];
  contactName: string;
  posts: Map<string, ContextItem>;
  commentPolicy?: CommentReplyPolicy;
  onRetry: (tempId: string) => void;
  onDiscard: (tempId: string) => void;
  onReplyToComment: (commentId: string, content: string) => Promise<boolean>;
};

type Item =
  | { kind: "message"; id: string; createdAt: string; message: MessageResponse }
  | { kind: "pending"; id: string; createdAt: string; pending: PendingMessage };

export function ChatThread({
  messages,
  pending,
  contactName,
  posts,
  commentPolicy,
  onRetry,
  onDiscard,
  onReplyToComment,
}: ChatThreadProps) {
  const items: Item[] = [
    ...messages.map((message) => ({ kind: "message" as const, id: message.id, createdAt: message.createdAt, message })),
    ...pending.map((p) => ({ kind: "pending" as const, id: p.tempId, createdAt: p.createdAt, pending: p })),
  ];
  const answeredComments = new Set(
    messages
      .filter((m) => m.kind === "COMMENT" && m.direction === "OUTBOUND" && m.replyToExternalId)
      .map((m) => m.replyToExternalId),
  );

  return (
    <div className="chat-thread">
      {groupByDay(items).map((group) => (
        <section key={group.day} className="chat-day" aria-label={group.label}>
          <p className="chat-day-label">
            <span>{group.label}</span>
          </p>
          <ol className="bubble-list">
            {group.items.map((item) =>
              item.kind === "message" && item.message.kind === "COMMENT" ? (
                <CommentEvent
                  key={item.id}
                  message={item.message}
                  contactName={contactName}
                  post={item.message.contextRef ? posts.get(item.message.contextRef) : undefined}
                  policy={commentPolicy}
                  answered={answeredComments.has(item.message.externalMessageId)}
                  onReply={onReplyToComment}
                />
              ) : item.kind === "message" ? (
                <li
                  key={item.id}
                  className={`bubble${item.message.direction === "OUTBOUND" ? " bubble-outbound" : ""}`}
                >
                  <span className="visually-hidden">
                    {item.message.direction === "OUTBOUND" ? "Vos" : contactName}:{" "}
                  </span>
                  <span className={`bubble-content${item.message.content ? "" : " bubble-empty"}`}>
                    {item.message.content || "Mensaje sin texto (adjunto o tipo no soportado)"}
                  </span>
                  <time className="bubble-time" dateTime={item.createdAt}>
                    {formatTime(item.createdAt)}
                  </time>
                </li>
              ) : (
                <li
                  key={item.id}
                  className={`bubble bubble-outbound bubble-pending${item.pending.status === "failed" ? " bubble-failed" : ""}`}
                >
                  <span className="bubble-content">{item.pending.content}</span>
                  {item.pending.status === "sending" ? (
                    <span className="bubble-time">Enviando…</span>
                  ) : (
                    <span className="bubble-failed-actions">
                      <span>No se envió.</span>
                      <button type="button" onClick={() => onRetry(item.id)}>
                        Reintentar
                      </button>
                      <button type="button" onClick={() => onDiscard(item.id)}>
                        Descartar
                      </button>
                    </span>
                  )}
                </li>
              ),
            )}
          </ol>
        </section>
      ))}
    </div>
  );
}
