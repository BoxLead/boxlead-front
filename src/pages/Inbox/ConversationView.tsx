import { useEffect, useMemo, useRef } from "react";
import { api } from "../../api/client";
import type {
  ContextItem,
  ConversationContextResponse,
  ConversationResponse,
  MessageResponse,
} from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { setQueryData } from "../../data/queryCache";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useConnectPlatform } from "../../hooks/useConnectPlatform";
import { getPlatform } from "../../platforms";
import { ChatThread } from "./ChatThread";
import { Composer } from "./Composer";
import { ConversationHeader } from "./ConversationHeader";
import { pairQuestions, type ConversationRow } from "./inboxModel";
import { OrderSummary } from "./OrderSummary";
import { QuestionThread } from "./QuestionThread";
import { CONVERSATIONS_KEY, messagesKey, useConversationSender } from "./useConversationSender";
import "./ConversationView.css";

const MESSAGES_REFRESH_MS = 10_000;

type ConversationViewProps = {
  row: ConversationRow;
  backTo: string;
};

export function ConversationView({ row, backTo }: ConversationViewProps) {
  const platform = getPlatform(row.platform);
  const policy = platform.reply(row.salesStage);
  const messages = useApiQuery<MessageResponse[]>(messagesKey(row.id), {
    refreshInterval: MESSAGES_REFRESH_MS,
  });
  const context = useApiQuery<ConversationContextResponse>(
    platform.hasContext ? `/conversations/${row.id}/context` : null,
  );
  const sender = useConversationSender(row.id, row.platform);
  const { connect, connecting } = useConnectPlatform();
  const scrollRef = useRef<HTMLDivElement>(null);
  const list = useMemo(() => messages.data ?? [], [messages.data]);
  const unread = row.unread;

  useEffect(() => {
    if (unread === 0) return;
    api.post(`/conversations/${row.id}/read`).then(
      () =>
        setQueryData<ConversationResponse[]>(CONVERSATIONS_KEY, (current) =>
          (current ?? []).map((c) => (c.id === row.id ? { ...c, unreadCount: 0, lastReadAt: new Date().toISOString() } : c)),
        ),
      () => undefined,
    );
  }, [row.id, unread, list.length]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [row.id, list.length, sender.pending.length]);

  const listings = useMemo(
    () =>
      new Map<string, ContextItem>(
        (context.data?.items ?? []).filter((i) => i.kind === "LISTING").map((i) => [i.externalId, i]),
      ),
    [context.data],
  );
  const orders = (context.data?.items ?? []).filter((i) => i.kind === "ORDER");
  const contextIssue = context.error ? platform.explainError(409, context.error) : null;
  const questions = policy.kind === "questions" ? pairQuestions(list) : null;
  const nothingToAnswer = questions !== null && questions.nextToAnswer === null && list.length > 0;

  return (
    <section className="conversation-view" aria-label={`Conversación con ${row.displayName}`}>
      <ConversationHeader row={row} backTo={backTo} />

      {contextIssue?.action === "reconnect" && !sender.failure ? (
        <div className="conversation-context">
          <Banner
            tone="warning"
            title={contextIssue.title}
            action={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={connecting !== null}
                onClick={() => void connect(row.platform)}
              >
                Reconectar
              </button>
            }
          >
            {contextIssue.detail}
          </Banner>
        </div>
      ) : null}

      {orders.length > 0 ? (
        <div className="conversation-context">
          {orders.map((order) => (
            <OrderSummary key={order.externalId} order={order} status={platform.contextStatus("ORDER", order.status)} />
          ))}
        </div>
      ) : null}

      <div className="conversation-scroll" ref={scrollRef}>
        {messages.loading ? (
          <div className="conversation-skeleton" aria-hidden="true">
            <div className="skeleton" />
            <div className="skeleton skeleton-right" />
            <div className="skeleton" />
          </div>
        ) : messages.error && !messages.data ? (
          <Banner
            tone="danger"
            title="No pudimos cargar los mensajes"
            action={
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void messages.reload()}>
                Reintentar
              </button>
            }
          >
            {messages.error}
          </Banner>
        ) : list.length === 0 && sender.pending.length === 0 ? (
          <p className="conversation-empty">Todavía no hay mensajes en esta conversación.</p>
        ) : questions ? (
          <QuestionThread
            thread={questions}
            listings={listings}
            statusOf={(item) => platform.contextStatus("LISTING", item.status)}
            pending={sender.pending}
            onRetry={sender.retry}
            onDiscard={sender.discard}
          />
        ) : (
          <ChatThread
            messages={list}
            pending={sender.pending}
            contactName={row.displayName}
            onRetry={sender.retry}
            onDiscard={sender.discard}
          />
        )}
      </div>

      <footer className="conversation-footer">
        {sender.failure ? (
          <Banner
            tone="danger"
            title={sender.failure.title}
            action={
              sender.failure.action === "reconnect" ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={connecting !== null}
                  onClick={() => void connect(row.platform)}
                >
                  Reconectar {platform.name}
                </button>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" onClick={sender.dismissFailure}>
                  Entendido
                </button>
              )
            }
          >
            {sender.failure.detail}
          </Banner>
        ) : null}
        {nothingToAnswer ? (
          <Banner tone="info" title="No hay preguntas pendientes">
            {platform.name} solo permite responder preguntas abiertas. Cuando este comprador pregunte de nuevo vas a
            poder responder desde acá.
          </Banner>
        ) : (
          <Composer
            key={row.id}
            policy={policy}
            label={`Responder a ${row.displayName}`}
            onSend={sender.send}
          />
        )}
      </footer>
    </section>
  );
}
