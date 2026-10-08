import type { PendingMessage } from "./useConversationSender";

type PendingBubbleProps = {
  pending: PendingMessage;
  onRetry: (tempId: string) => void;
  onDiscard: (tempId: string) => void;
};

export function PendingBubble({ pending, onRetry, onDiscard }: PendingBubbleProps) {
  return (
    <li className={`bubble bubble-outbound bubble-pending${pending.status === "failed" ? " bubble-failed" : ""}`}>
      <span className="bubble-content">{pending.content}</span>
      {pending.status === "sending" ? (
        <span className="bubble-time">Enviando…</span>
      ) : (
        <span className="bubble-failed-actions">
          <span>No se envió.</span>
          <button type="button" onClick={() => onRetry(pending.tempId)}>
            Reintentar
          </button>
          <button type="button" onClick={() => onDiscard(pending.tempId)}>
            Descartar
          </button>
        </span>
      )}
    </li>
  );
}
