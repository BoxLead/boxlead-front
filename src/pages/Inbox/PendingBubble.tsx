import { useTranslation } from "react-i18next";
import type { PendingMessage } from "./useConversationSender";

type PendingBubbleProps = {
  pending: PendingMessage;
  onRetry: (tempId: string) => void;
  onDiscard: (tempId: string) => void;
};

export function PendingBubble({ pending, onRetry, onDiscard }: PendingBubbleProps) {
  const { t } = useTranslation("inbox");
  return (
    <li className={`bubble bubble-outbound bubble-pending${pending.status === "failed" ? " bubble-failed" : ""}`}>
      <span className="bubble-content">{pending.content}</span>
      {pending.status === "sending" ? (
        <span className="bubble-time">{t("actions.sending")}</span>
      ) : (
        <span className="bubble-failed-actions">
          <span>{t("pending.failed")}</span>
          <button type="button" onClick={() => onRetry(pending.tempId)}>
            {t("actions.retry")}
          </button>
          <button type="button" onClick={() => onDiscard(pending.tempId)}>
            {t("actions.discard")}
          </button>
        </span>
      )}
    </li>
  );
}
