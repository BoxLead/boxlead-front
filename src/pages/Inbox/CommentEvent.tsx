import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ContextItem, MessageResponse } from "../../api/types";
import { ExternalLinkIcon } from "../../components/icons/UiIcons";
import type { CommentReplyPolicy, ReplyPolicy } from "../../platforms/types";
import { answeredByLabel } from "../../util/agents";
import { formatTime } from "../../util/format";
import { safeExternalUrl } from "../../util/links";
import { Composer } from "./Composer";

type CommentEventProps = {
  message: MessageResponse;
  contactName: string;
  post: ContextItem | undefined;
  policy: CommentReplyPolicy | undefined;
  answered: boolean;
  onReply: (commentId: string, content: string) => Promise<boolean>;
};

export function CommentEvent({ message, contactName, post, policy, answered, onReply }: CommentEventProps) {
  const { t } = useTranslation("inbox");
  const [replying, setReplying] = useState(false);
  const outbound = message.direction === "OUTBOUND";
  const postLabel = policy?.postLabel(post?.status ?? null) ?? t("comment.defaultPost");
  const postTitle = post?.title ?? t("comment.viewPost");
  const postUrl = safeExternalUrl(post?.url);
  const replyPolicy: ReplyPolicy | null = policy
    ? { kind: "chat", maxLength: policy.maxLength, placeholder: policy.placeholder, hint: t("comment.replyHint") }
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
        <span className="visually-hidden">
          {outbound ? (message.agentName ? answeredByLabel(message.agentName) : t("you")) : contactName}:{" "}
        </span>
        {outbound
          ? message.agentName
            ? t("comment.agentPublic", { answered: answeredByLabel(message.agentName), post: postLabel })
            : t("comment.youPublic", { post: postLabel })
          : t("comment.commented", { post: postLabel })}
      </p>
      {post && (postUrl || post.imageUrl || post.title) ? (
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
          {postUrl ? (
            <a className="comment-event-link" href={postUrl} target="_blank" rel="noopener noreferrer">
              <span className="comment-event-link-text">{postTitle}</span>
              <ExternalLinkIcon width={14} height={14} />
              <span className="visually-hidden">{` ${t("comment.newTab")}`}</span>
            </a>
          ) : (
            <span className="comment-event-link-text">{postTitle}</span>
          )}
        </p>
      ) : null}
      <blockquote className={`comment-event-text${message.content ? "" : " bubble-empty"}`}>
        {message.content || t("comment.noText")}
      </blockquote>
      <div className="comment-event-bar">
        {answered ? <span className="comment-event-state">{t("comment.answered")}</span> : null}
        {canReply && !replying ? (
          <button type="button" className="comment-event-action" onClick={() => setReplying(true)}>
            {t("comment.reply")}
          </button>
        ) : null}
        <time className="comment-event-time" dateTime={message.createdAt}>
          {formatTime(message.createdAt)}
        </time>
      </div>
      {canReply && replying && replyPolicy ? (
        <div className="comment-event-reply">
          <Composer policy={replyPolicy} label={t("comment.replyTo", { name: contactName })} onSend={reply} />
          <button type="button" className="comment-event-action" onClick={() => setReplying(false)}>
            {t("actions.cancel")}
          </button>
        </div>
      ) : null}
    </li>
  );
}
