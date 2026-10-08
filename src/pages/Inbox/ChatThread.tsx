import type { ContextItem, MessageResponse } from "../../api/types";
import type { CommentReplyPolicy } from "../../platforms/types";
import { CommentEvent } from "./CommentEvent";
import { answeredCommentIds, groupByDay } from "./inboxModel";
import { MessageBubble } from "./MessageBubble";
import { PendingBubble } from "./PendingBubble";
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
  const answered = answeredCommentIds(messages);

  return (
    <div className="chat-thread">
      {groupByDay(items).map((group) => (
        <section key={group.day} className="chat-day" aria-label={group.label}>
          <p className="chat-day-label">
            <span>{group.label}</span>
          </p>
          <ol className="bubble-list">
            {group.items.map((item) => {
              if (item.kind === "pending") {
                return <PendingBubble key={item.id} pending={item.pending} onRetry={onRetry} onDiscard={onDiscard} />;
              }
              const { message } = item;
              if (message.kind === "COMMENT") {
                return (
                  <CommentEvent
                    key={item.id}
                    message={message}
                    contactName={contactName}
                    post={message.contextRef ? posts.get(message.contextRef) : undefined}
                    policy={commentPolicy}
                    answered={message.externalMessageId !== null && answered.has(message.externalMessageId)}
                    onReply={onReplyToComment}
                  />
                );
              }
              return <MessageBubble key={item.id} message={message} contactName={contactName} />;
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
