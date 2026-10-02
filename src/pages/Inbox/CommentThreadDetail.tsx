import type {
  CommentResponse,
  CommentThreadResponse,
  LeadResponse,
} from "../../api/types";
import { useApiQuery } from "../../hooks/useApiQuery";
import { formatShortDate } from "../../util/format";
import { ThreadPane } from "./ThreadPane";

type CommentThreadDetailProps = {
  thread: CommentThreadResponse;
  lead: LeadResponse | undefined;
  onBack: () => void;
};

export function CommentThreadDetail({
  thread,
  lead,
  onBack,
}: CommentThreadDetailProps) {
  const { data, error, loading } = useApiQuery<CommentResponse[]>(
    `/comments/threads/${thread.id}/comments`,
  );
  const comments = data ?? [];

  return (
    <ThreadPane lead={lead} platform={thread.platform} onBack={onBack}>
      <div className="thread-scroll">
        {loading ? (
          <p className="thread-status">Cargando comentarios…</p>
        ) : null}
        {error ? (
          <p className="thread-status thread-error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && comments.length === 0 ? (
          <p className="thread-status">Todavía no hay comentarios.</p>
        ) : null}
        <ul className="bubble-list" aria-live="polite">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className={`bubble${comment.parentCommentId ? " bubble-reply" : ""}`}
            >
              <div className="bubble-author">
                {comment.authorUsername ?? "Usuario desconocido"}
              </div>
              <div className="bubble-content">
                {comment.text?.trim() || (
                  <em className="bubble-empty">(sin texto)</em>
                )}
              </div>
              <time className="bubble-time" dateTime={comment.createdAt}>
                {formatShortDate(comment.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </ThreadPane>
  );
}
