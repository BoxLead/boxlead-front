import type { MessageResponse } from "../../api/types";
import { formatTime } from "../../util/format";

type MessageBubbleProps = {
  message: MessageResponse;
  contactName: string;
};

export function MessageBubble({ message, contactName }: MessageBubbleProps) {
  const outbound = message.direction === "OUTBOUND";
  return (
    <li className={`bubble${outbound ? " bubble-outbound" : ""}`}>
      <span className="visually-hidden">{outbound ? "Vos" : contactName}: </span>
      <span className={`bubble-content${message.content ? "" : " bubble-empty"}`}>
        {message.content || "Mensaje sin texto (adjunto o tipo no soportado)"}
      </span>
      <time className="bubble-time" dateTime={message.createdAt}>
        {formatTime(message.createdAt)}
      </time>
    </li>
  );
}
