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
  const next = thread.nextToAnswer;
  const sending = pending.at(-1);

  return (
    <div className="question-thread">
      {groupByListing(thread.entries).map((group) => {
        const listing = group.ref ? listings.get(group.ref) : undefined;
        return (
          <section key={group.ref ?? "sin-publicacion"} className="question-group" aria-label={listing?.title ?? "Preguntas"}>
            {listing ? (
              <ListingSummary item={listing} status={statusOf(listing)} compact />
            ) : group.ref ? (
              <p className="question-group-ref">Publicación {group.ref}</p>
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
                      <span className="question-label">Pregunta</span>
                      <time dateTime={entry.question.createdAt}>{formatRelative(entry.question.createdAt)}</time>
                      {entry.answer ? null : isNext ? (
                        <Tag tone="meli">Se responde ahora</Tag>
                      ) : (
                        <Tag tone="warning">Pendiente</Tag>
                      )}
                    </div>
                    <p className="question-text">{entry.question.content || "Pregunta sin texto"}</p>
                    {entry.answer ? (
                      <div className="question-answer">
                        <span className="question-answer-label">
                          {entry.answer.agentName ? answeredByLabel(entry.answer.agentName) : "Tu respuesta"} ·{" "}
                          <time dateTime={entry.answer.createdAt}>{formatRelative(entry.answer.createdAt)}</time>
                        </span>
                        <p>{entry.answer.content}</p>
                      </div>
                    ) : isNext && sending ? (
                      <div className={`question-answer question-answer-pending${sending.status === "failed" ? " question-answer-failed" : ""}`}>
                        <span className="question-answer-label">
                          {sending.status === "sending" ? "Publicando respuesta…" : "No se publicó la respuesta"}
                        </span>
                        <p>{sending.content}</p>
                        {sending.status === "failed" ? (
                          <span className="bubble-failed-actions">
                            <button type="button" onClick={() => onRetry(sending.tempId)}>
                              Reintentar
                            </button>
                            <button type="button" onClick={() => onDiscard(sending.tempId)}>
                              Descartar
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
