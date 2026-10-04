import { Link } from "react-router-dom";
import { Avatar } from "../../components/ui/Avatar";
import { Tag } from "../../components/ui/Tag";
import { getPlatform, hasStages, stageLabel } from "../../platforms";
import { formatListTime } from "../../util/format";
import type { ConversationRow } from "./inboxModel";

type ConversationItemProps = {
  row: ConversationRow;
  to: string;
  selected: boolean;
};

export function ConversationItem({ row, to, selected }: ConversationItemProps) {
  const preview = row.lastMessagePreview?.trim();
  const platformName = getPlatform(row.platform).name;

  return (
    <li>
      <Link
        to={to}
        className={`conversation-item${selected ? " conversation-item-selected" : ""}${row.unread > 0 ? " conversation-item-unread" : ""}`}
        aria-current={selected ? "true" : undefined}
      >
        <Avatar name={row.displayName} platform={row.platform} />
        <span className="conversation-item-body">
          <span className="conversation-item-top">
            <span className="conversation-item-name">{row.displayName}</span>
            <time className="conversation-item-time" dateTime={row.activityAt}>
              {formatListTime(row.activityAt)}
            </time>
          </span>
          <span className="conversation-item-preview">
            {preview ? (
              <>
                {row.lastMessageDirection === "OUTBOUND" ? <span className="conversation-item-you">Vos: </span> : null}
                {preview}
              </>
            ) : (
              <span className="conversation-item-muted">Sin mensajes todavía</span>
            )}
          </span>
          <span className="conversation-item-meta">
            <span className="visually-hidden">{platformName}. </span>
            {hasStages(row.platform) ? (
              <Tag tone={row.salesStage === "POST_SALE" ? "success" : "meli"}>
                {stageLabel(row.platform, row.salesStage)}
              </Tag>
            ) : null}
            {row.awaitingReply ? <span className="conversation-item-awaiting">Esperando respuesta</span> : null}
            {row.unread > 0 ? (
              <span className="conversation-item-unread-count">
                <span aria-hidden="true">{row.unread > 99 ? "99+" : row.unread}</span>
                <span className="visually-hidden">{row.unread} sin leer</span>
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
}
