import { useTranslation } from "react-i18next";
import type { MessageResponse } from "../../api/types";
import { answeredByLabel } from "../../util/agents";
import { formatTime } from "../../util/format";

type MessageBubbleProps = {
  message: MessageResponse;
  contactName: string;
};

export function MessageBubble({ message, contactName }: MessageBubbleProps) {
  const { t } = useTranslation("inbox");
  const outbound = message.direction === "OUTBOUND";
  return (
    <li className={`bubble${outbound ? " bubble-outbound" : ""}`}>
      <span className="visually-hidden">{outbound ? t("you") : contactName}: </span>
      {outbound && message.agentName ? <span className="bubble-agent">{answeredByLabel(message.agentName)}</span> : null}
      <span className={`bubble-content${message.content ? "" : " bubble-empty"}`}>
        {message.content || t("message.empty")}
      </span>
      <time className="bubble-time" dateTime={message.createdAt}>
        {formatTime(message.createdAt)}
      </time>
    </li>
  );
}
