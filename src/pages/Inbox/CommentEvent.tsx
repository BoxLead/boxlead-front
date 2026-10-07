import { useState } from "react";
import type { ContextItem, MessageResponse } from "../../api/types";
import { ExternalLinkIcon } from "../../components/icons/UiIcons";
import type { CommentReplyPolicy, ReplyPolicy } from "../../platforms/types";
import { formatTime } from "../../util/format";
import { Composer } from "./Composer";

const DEFAULT_POST_LABEL = "una publicación";
const REPLY_HINT = "Tu respuesta se publica como respuesta a este comentario.";

type CommentEventProps = {
  message: MessageResponse;
  contactName: string;
  post: ContextItem | undefined;
  policy: CommentReplyPolicy | undefined;
  answered: boolean;
  onReply: (commentId: string, content: string) => Promise<boolean>;
};

export function CommentEvent({ message, contactName, post, policy, answered, onReply }: CommentEventProps) {
  const [replying, setReplying] = useState(false);
  const outbound = message.direction === "OUTBOUND";
  const postLabel = policy?.postLabel(post?.status ?? null) ?? DEFAULT_POST_LABEL;
  const postTitle = post?.title ?? "Ver publicación";
  const replyPolicy: ReplyPolicy | null = policy
    ? { kind: "chat", maxLength: policy.maxLength, placeholder: policy.placeholder, hint: REPLY_HINT }
    : null;
  const canReply = !outbound && replyPolicy !== null && !answered;

  async function reply(content: string) {
    const ok = await onReply(message.id, content);
    if (ok) setReplying(false);
    return ok;
  }

  return (
    <li className={`comment-event${outbound ? " comment-event-outbound" : ""}`}>
      <p className="comment-event-title">
        <span className="visually-hidden">{outbound ? "Vos" : contactName}: </span>
        {outbound ? `Respondiste en público en ${postLabel}` : `Comentó en ${postLabel}`}
      </p>
      {post && (post.url || post.imageUrl || post.title) ? (
        <p className="comment-event-post">
          {post.imageUrl ? (
            <img
              className="comment-event-image"
              src={post.imageUrl}
              alt=""
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : null}
          {post.url ? (
            <a className="comment-event-link" href={post.url} target="_blank" rel="noopener noreferrer">
              <span className="comment-event-link-text">{postTitle}</span>
              <ExternalLinkIcon width={14} height={14} />
              <span className="visually-hidden"> (pestaña nueva)</span>
            </a>
          ) : (
            <span className="comment-event-link-text">{postTitle}</span>
          )}
        </p>
      ) : null}
      <blockquote className={`comment-event-text${message.content ? "" : " bubble-empty"}`}>
        {message.content || "Comentario sin texto"}
      </blockquote>
      <div className="comment-event-bar">
        {answered ? <span className="comment-event-state">Respondido en público</span> : null}
        {canReply && !replying ? (
          <button type="button" className="comment-event-action" onClick={() => setReplying(true)}>
            Responder en público
          </button>
        ) : null}
        <time className="comment-event-time" dateTime={message.createdAt}>
          {formatTime(message.createdAt)}
        </time>
      </div>
      {canReply && replying && replyPolicy ? (
        <div className="comment-event-reply">
          <Composer policy={replyPolicy} label={`Responder en público a ${contactName}`} onSend={reply} />
          <button type="button" className="comment-event-action" onClick={() => setReplying(false)}>
            Cancelar
          </button>
        </div>
      ) : null}
    </li>
  );
}
