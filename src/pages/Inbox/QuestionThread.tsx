import { useTranslation } from "react-i18next";
import type { ContextItem } from "../../api/types";
import { QuestionIcon } from "../../components/icons/UiIcons";
import { Tag } from "../../components/ui/Tag";
import type { ContextStatus } from "../../platforms/types";
import { answeredByLabel } from "../../util/agents";
import { formatRelative } from "../../util/format";
import type { QuestionEntry, QuestionThread as Thread } from "./inboxModel";
import { ListingSummary } from "./ListingSummary";
import type { PendingMessage } from "./useConversationSender";

type QuestionThreadProps = {
  thread: Thread;
  listings: Map<string, ContextItem>;
  statusOf: (item: ContextItem) => ContextStatus | null;
  pending: PendingMessage[];
  onRetry: (tempId: string) => void;
  onDiscard: (tempId: string) => void;
};

type Group = { ref: string | null; entries: QuestionEntry[] };

function groupByListing(entries: QuestionEntry[]): Group[] {
  const groups: Group[] = [];
  for (const entry of entries) {
    const group = groups.find((g) => g.ref === entry.contextRef);
    if (group) group.entries.push(entry);
    else groups.push({ ref: entry.contextRef, entries: [entry] });
  }
  return groups;
}

export function QuestionThread({ thread, listings, statusOf, pending, onRetry, onDiscard }: QuestionThreadProps) {
  const { t } = useTranslation("inbox");
  const next = thread.nextToAnswer;
  const sending = pending.at(-1);

  return (
    <div className="question-thread">
      {groupByListing(thread.entries).map((group) => {
        const listing = group.ref ? listings.get(group.ref) : undefined;
        return (
          <section key={group.ref ?? "sin-publicacion"} className="question-group" aria-label={listing?.title ?? t("questions.group")}>
            {listing ? (
              <ListingSummary item={listing} status={statusOf(listing)} compact />
            ) : group.ref ? (
              <p className="question-group-ref">{t("listing.fallbackTitle", { id: group.ref })}</p>
            ) : null}
            <ol className="question-list">
              {group.entries.map((entry) => {
                const isNext = entry === next;
                return (
                  <li
                    key={entry.question.id}
                    className={`question${entry.answer ? "" : " question-pending"}${isNext ? " question-next" : ""}`}
                  >
                    <div className="question-head">
                      <QuestionIcon width={16} height={16} />
                      <span className="question-label">{t("questions.question")}</span>
                      <time dateTime={entry.question.createdAt}>{formatRelative(entry.question.createdAt)}</time>
                      {entry.answer ? null : isNext ? (
                        <Tag tone="meli">{t("questions.next")}</Tag>
                      ) : (
                        <Tag tone="warning">{t("questions.pending")}</Tag>
                      )}
                    </div>
                    <p className="question-text">{entry.question.content || t("questions.noText")}</p>
                    {entry.answer ? (
                      <div className="question-answer">
                        <span className="question-answer-label">
                          {entry.answer.agentName ? answeredByLabel(entry.answer.agentName) : t("questions.yourAnswer")} ·{" "}
                          <time dateTime={entry.answer.createdAt}>{formatRelative(entry.answer.createdAt)}</time>
                        </span>
                        <p>{entry.answer.content}</p>
                      </div>
                    ) : isNext && sending ? (
                      <div className={`question-answer question-answer-pending${sending.status === "failed" ? " question-answer-failed" : ""}`}>
                        <span className="question-answer-label">
                          {sending.status === "sending" ? t("questions.publishing") : t("questions.failed")}
                        </span>
                        <p>{sending.content}</p>
                        {sending.status === "failed" ? (
                          <span className="bubble-failed-actions">
                            <button type="button" onClick={() => onRetry(sending.tempId)}>
                              {t("actions.retry")}
                            </button>
                            <button type="button" onClick={() => onDiscard(sending.tempId)}>
                              {t("actions.discard")}
                            </button>
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
