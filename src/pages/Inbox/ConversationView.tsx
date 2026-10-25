import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import type {
  ContextItem,
  ConversationContextResponse,
  ConversationResponse,
  MessageResponse,
  ReplyDraft,
} from "../../api/types";
import { PlanLink } from "../../components/PlanBanner/PlanLink";
import { CHOOSE_PLAN } from "../../components/PlanBanner/planNotice";
import { Banner } from "../../components/ui/Banner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/toast";
import { deleteConversation } from "../../data/conversations";
import { discardDraft, draftKey } from "../../data/drafts";
import { setQueryData } from "../../data/queryCache";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useConnectPlatform } from "../../hooks/useConnectPlatform";
import { usePlan } from "../../hooks/usePlan";
import { getPlatform } from "../../platforms";
import { ChatThread } from "./ChatThread";
import { Composer } from "./Composer";
import { ConversationHeader } from "./ConversationHeader";
import { DraftBanner } from "./DraftBanner";
import { draftDelivery, pairQuestions, type ConversationRow } from "./inboxModel";
import { OrderSummary } from "./OrderSummary";
import { TemplateDialog } from "./TemplateDialog";
import { QuestionThread } from "./QuestionThread";
import { useMissingPostRefresh } from "./useMissingPostRefresh";
import { CONVERSATIONS_KEY, messagesKey, useConversationSender } from "./useConversationSender";
import { WorkingNotice } from "./WorkingNotice";
import "./ConversationView.css";

const MESSAGES_REFRESH_MS = 10_000;

type ConversationViewProps = {
  row: ConversationRow;
  backTo: string;
};

export function ConversationView({ row, backTo }: ConversationViewProps) {
  const navigate = useNavigate();
  const platform = getPlatform(row.platform);
  const policy = platform.reply(row.salesStage);
  const messages = useApiQuery<MessageResponse[]>(messagesKey(row.id), {
    refreshInterval: MESSAGES_REFRESH_MS,
  });
  const context = useApiQuery<ConversationContextResponse>(
    platform.hasContext ? `/conversations/${row.id}/context` : null,
  );
  const draftQuery = useApiQuery<ReplyDraft | undefined>(draftKey(row.id), { refreshInterval: MESSAGES_REFRESH_MS });
  const toast = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<{ conversationId: string; draftId: string } | null>(null);
  const [busyConversationId, setBusyConversationId] = useState<string | null>(null);
  const editingDraftId = editing?.conversationId === row.id ? editing.draftId : null;
  const draftBusy = busyConversationId === row.id;
  const sender = useConversationSender(row.id, row.platform);
  const { connect, connecting } = useConnectPlatform();
  const plan = usePlan();
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
  const posts = useMemo(
    () =>
      new Map<string, ContextItem>(
        (context.data?.items ?? []).filter((i) => i.kind === "POST").map((i) => [i.externalId, i]),
      ),
    [context.data],
  );
  useMissingPostRefresh(list, posts, context.data !== undefined, context.reload);
  const orders = (context.data?.items ?? []).filter((i) => i.kind === "ORDER");
  const contextIssue = context.error ? platform.explainError(409, context.error) : null;
  const questions = policy.kind === "questions" ? pairQuestions(list) : null;
  const draft = draftQuery.data ?? null;
  const showDraft = draft !== null && draft.id !== editingDraftId;
  const delivery = draftDelivery(messages.data, draft);
  const draftLimit = delivery.kind === "comment" ? (platform.commentReply?.maxLength ?? policy.maxLength) : policy.maxLength;
  const draftTooLong = draft !== null && draftLimit !== null && draft.content.length > draftLimit;
  const nothingToAnswer = questions !== null && questions.nextToAnswer === null && list.length > 0;

  function openTemplates() {
    sender.dismissFailure();
    setTemplatesOpen(true);
  }

  function stopEditing() {
    setEditing((current) => (current?.conversationId === row.id ? null : current));
  }

  async function sendDraft(current: ReplyDraft) {
    const plan = draftDelivery(messages.data, current);
    if (plan.kind === "unavailable") {
      toast({
        tone: "danger",
        message: "No encontramos el mensaje de este borrador. Recargá la conversación antes de enviarlo.",
      });
      return;
    }
    setBusyConversationId(row.id);
    const sent =
      plan.kind === "comment"
        ? await sender.replyToComment(plan.commentId, current.content)
        : await sender.send(current.content);
    if (sent) stopEditing();
    setBusyConversationId((currentId) => (currentId === row.id ? null : currentId));
  }

  async function sendFromComposer(content: string) {
    const sent = await sender.send(content);
    if (sent) stopEditing();
    return sent;
  }

  async function dropDraft() {
    setBusyConversationId(row.id);
    try {
      await discardDraft(row.id);
      stopEditing();
      toast({ tone: "info", message: "Descartaste el borrador." });
    } catch {
      toast({ tone: "danger", message: "No pudimos descartar el borrador. Probá de nuevo." });
    } finally {
      setBusyConversationId((currentId) => (currentId === row.id ? null : currentId));
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteConversation(row.id);
      toast({ tone: "info", message: `Eliminaste la conversación con ${row.displayName}.` });
      navigate(backTo);
    } catch {
      toast({ tone: "danger", message: "No pudimos eliminar la conversación." });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="conversation-view" aria-label={`Conversación con ${row.displayName}`}>
      <ConversationHeader row={row} backTo={backTo} onDelete={() => setConfirmingDelete(true)} />

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

      <div className="conversation-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Mensajes">
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
            posts={posts}
            commentPolicy={platform.commentReply}
            onRetry={sender.retry}
            onDiscard={sender.discard}
            onReplyToComment={sender.replyToComment}
          />
        )}
      </div>

      <footer className="conversation-footer">
        {row.workingAgentName ? <WorkingNotice agentName={row.workingAgentName} /> : null}
        {sender.failure && !templatesOpen ? (
          <Banner
            tone="danger"
            title={sender.failure.title}
            action={
              sender.failure.action === "template" ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={openTemplates}>
                  Usar una plantilla
                </button>
              ) : sender.failure.action === "reconnect" ? (
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
        {plan.restricted ? (
          <Banner
            tone="warning"
            title="Necesitás un plan para responder"
            action={<PlanLink action={CHOOSE_PLAN} />}
          >
            Podés leer la conversación, pero los mensajes se envían solo con un plan activo.
          </Banner>
        ) : nothingToAnswer ? (
          <Banner tone="info" title="No hay preguntas pendientes">
            {platform.name} solo permite responder preguntas abiertas. Cuando este comprador pregunte de nuevo vas a
            poder responder desde acá.
          </Banner>
        ) : (
          <>
            {draft && showDraft ? (
              <DraftBanner
                draft={draft}
                tooLong={draftTooLong}
                busy={draftBusy}
                onSend={() => void sendDraft(draft)}
                onEdit={() => setEditing({ conversationId: row.id, draftId: draft.id })}
                onDiscard={() => void dropDraft()}
              />
            ) : null}
            {draft && editingDraftId ? (
              <div className="draft-banner-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void dropDraft()}
                  disabled={draftBusy}
                  aria-label="Descartar borrador"
                >
                  Descartar
                </button>
              </div>
            ) : null}
            <Composer
              key={`${row.id}:${editingDraftId ?? ""}`}
              policy={policy}
              label={`Responder a ${row.displayName}`}
              initialValue={draft && draft.id === editingDraftId ? draft.content : ""}
              onSend={sendFromComposer}
              onTemplates={platform.supportsTemplates ? openTemplates : undefined}
            />
          </>
        )}
      </footer>
      {platform.supportsTemplates ? (
        <TemplateDialog
          open={templatesOpen}
          conversationId={row.id}
          contactName={row.displayName}
          error={sender.failure ? (sender.failure.detail ?? sender.failure.title) : null}
          onClose={() => setTemplatesOpen(false)}
          onSend={sender.sendTemplate}
        />
      ) : null}
      <ConfirmDialog
        open={confirmingDelete}
        title={`¿Eliminar la conversación con ${row.displayName}?`}
        confirmLabel={deleting ? "Eliminando…" : "Eliminar"}
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmingDelete(false)}
      >
        <p>Se eliminan sus mensajes. El lead se conserva. Esto no se puede deshacer.</p>
      </ConfirmDialog>
    </section>
  );
}
