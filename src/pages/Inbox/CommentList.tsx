import { Link } from "react-router-dom";
import type { CommentThreadResponse } from "../../api/types";
import { Avatar } from "../../components/ui/Avatar";
import { formatListTime } from "../../util/format";
import { mediaLabel } from "./commentsModel";
import "./ConversationList.css";

type CommentListProps = {
  threads: CommentThreadResponse[];
  nameOf: (thread: CommentThreadResponse) => string;
  selectedId: string | null;
  linkFor: (id: string) => string;
};

export function CommentList({ threads, nameOf, selectedId, linkFor }: CommentListProps) {
  return (
    <ul className="conversation-items" aria-label="Comentarios">
      {threads.map((thread) => {
        const name = nameOf(thread);
        const selected = thread.id === selectedId;
        return (
          <li key={thread.id}>
            <Link
              to={linkFor(thread.id)}
              className={`conversation-item${selected ? " conversation-item-selected" : ""}`}
              aria-current={selected ? "true" : undefined}
            >
              <Avatar name={name} platform={thread.platform} />
              <span className="conversation-item-body">
                <span className="conversation-item-top">
                  <span className="conversation-item-name">{name}</span>
                  <time className="conversation-item-time" dateTime={thread.updatedAt}>
                    {formatListTime(thread.updatedAt)}
                  </time>
                </span>
                <span className="conversation-item-preview">Comentó en {mediaLabel(thread.mediaProductType)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
