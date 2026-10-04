import { Link } from "react-router-dom";
import type { CommentResponse, CommentThreadResponse } from "../../api/types";
import { ArrowLeftIcon } from "../../components/icons/UiIcons";
import { Avatar } from "../../components/ui/Avatar";
import { Banner } from "../../components/ui/Banner";
import { Tag } from "../../components/ui/Tag";
import { useApiQuery } from "../../hooks/useApiQuery";
import { getPlatform } from "../../platforms";
import { formatRelative } from "../../util/format";
import { mediaLabel, nestComments } from "./commentsModel";
import "./ConversationView.css";

type CommentThreadViewProps = {
  thread: CommentThreadResponse;
  name: string;
  backTo: string;
};

function Comment({ comment }: { comment: CommentResponse }) {
  const author = comment.authorUsername ?? "Usuario de Instagram";
  return (
    <div className="comment">
      <Avatar name={author} size="sm" />
      <div className="comment-body">
        <p className="comment-meta">
          <strong>{author}</strong>
          <time dateTime={comment.createdAt}>{formatRelative(comment.createdAt)}</time>
        </p>
        <p className="comment-text">{comment.text?.trim() || "Comentario sin texto"}</p>
      </div>
    </div>
  );
}

export function CommentThreadView({ thread, name, backTo }: CommentThreadViewProps) {
  const comments = useApiQuery<CommentResponse[]>(`/comments/threads/${thread.id}/comments`, {
    refreshInterval: 30_000,
  });
  const platform = getPlatform(thread.platform);

  return (
    <section className="conversation-view" aria-label={`Comentarios de ${name}`}>
      <header className="conversation-header">
        <Link to={backTo} className="conversation-back" aria-label="Volver a la lista">
          <ArrowLeftIcon />
        </Link>
        <Avatar name={name} platform={thread.platform} />
        <div className="conversation-header-text">
          <h2 className="conversation-header-name">{name}</h2>
          <p className="conversation-header-meta">
            <span>Comentó en {mediaLabel(thread.mediaProductType)}</span>
            <Tag>{platform.name}</Tag>
          </p>
        </div>
        <Link to={`/app/leads/${thread.leadId}`} className="btn btn-secondary btn-sm conversation-lead-link">
          Ver lead
        </Link>
      </header>
      <div className="conversation-scroll">
        {comments.loading ? (
          <div className="conversation-skeleton" aria-hidden="true">
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : comments.error && !comments.data ? (
          <Banner tone="danger" title="No pudimos cargar los comentarios">
            {comments.error}
          </Banner>
        ) : (comments.data ?? []).length === 0 ? (
          <p className="conversation-empty">Todavía no hay comentarios.</p>
        ) : (
          <ol className="comment-list">
            {nestComments(comments.data ?? []).map((node) => (
              <li key={node.comment.id}>
                <Comment comment={node.comment} />
                {node.replies.length > 0 ? (
                  <ol className="comment-replies">
                    {node.replies.map((reply) => (
                      <li key={reply.id}>
                        <Comment comment={reply} />
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
      <footer className="conversation-footer">
        <Banner tone="info" title="Los comentarios se responden desde Instagram">
          Para seguir la charla en privado, escribile por mensaje directo cuando te contacte.
        </Banner>
      </footer>
    </section>
  );
}
