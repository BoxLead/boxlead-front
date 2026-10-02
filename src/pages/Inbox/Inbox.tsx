import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type {
  CommentThreadResponse,
  ConversationResponse,
  LeadResponse,
} from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { InboxIcon, MessageIcon } from "../../components/icons/UiIcons";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { truncate } from "../../util/format";
import { leadDisplayName } from "../../util/labels";
import { CommentThreadDetail } from "./CommentThreadDetail";
import { MessageThread } from "./MessageThread";
import {
  ThreadList,
  ThreadListSkeleton,
  type ThreadListItem,
} from "./ThreadList";
import "./Inbox.css";

type InboxTab = "messages" | "comments";

const TABS: { id: InboxTab; label: string }[] = [
  { id: "messages", label: "Mensajes" },
  { id: "comments", label: "Comentarios" },
];

function byMostRecent<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function Inbox() {
  useDocumentTitle("Bandeja");

  const [searchParams, setSearchParams] = useSearchParams();
  const tab: InboxTab =
    searchParams.get("tab") === "comments" ? "comments" : "messages";
  const selectedId = searchParams.get("id");

  const conversations = useApiQuery<ConversationResponse[]>("/conversations");
  const threads = useApiQuery<CommentThreadResponse[]>("/comments/threads");
  const leads = useApiQuery<LeadResponse[]>("/leads");

  const leadsById = useMemo(() => {
    const map = new Map<string, LeadResponse>();
    for (const lead of leads.data ?? []) map.set(lead.id, lead);
    return map;
  }, [leads.data]);

  const items = useMemo<ThreadListItem[]>(() => {
    if (tab === "messages") {
      return byMostRecent(conversations.data ?? []).map((c) => ({
        id: c.id,
        platform: c.platform,
        title: leadDisplayName(leadsById.get(c.leadId)),
        subtitle: c.status === "OPEN" ? "Conversación abierta" : "Cerrada",
        updatedAt: c.updatedAt,
      }));
    }
    return byMostRecent(threads.data ?? []).map((t) => ({
      id: t.id,
      platform: t.platform,
      title: leadDisplayName(leadsById.get(t.leadId)),
      subtitle: `${t.mediaProductType ?? "Publicación"} · ${truncate(t.externalMediaId, 18)}`,
      updatedAt: t.updatedAt,
    }));
  }, [tab, conversations.data, threads.data, leadsById]);

  const active = tab === "messages" ? conversations : threads;
  const error = active.error ?? leads.error;
  const selectedConversation =
    tab === "messages"
      ? conversations.data?.find((c) => c.id === selectedId)
      : undefined;
  const selectedThread =
    tab === "comments"
      ? threads.data?.find((t) => t.id === selectedId)
      : undefined;
  const hasSelection = Boolean(selectedConversation ?? selectedThread);

  function selectTab(next: InboxTab) {
    setSearchParams(next === "messages" ? {} : { tab: next });
  }

  function select(id: string | null) {
    const next: Record<string, string> = {};
    if (tab === "comments") next.tab = tab;
    if (id) next.id = id;
    setSearchParams(next);
  }

  return (
    <div className="page-inbox">
      <header className="inbox-header">
        <h1 className="page-title">Bandeja</h1>
        <nav className="inbox-tabs" aria-label="Secciones de la bandeja">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`inbox-tab${tab === id ? " inbox-tab-active" : ""}`}
              aria-pressed={tab === id}
              onClick={() => selectTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {error ? (
        <div className="page-banner inbox-banner" role="alert">
          {error}
        </div>
      ) : null}

      <div
        className={`inbox-panels${hasSelection ? " inbox-panels-open" : ""}`}
      >
        <aside className="inbox-list">
          {active.loading ? (
            <ThreadListSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<InboxIcon />}
              title={
                tab === "messages"
                  ? "Todavía no hay conversaciones"
                  : "Todavía no hay comentarios"
              }
              hint="Cuando tus clientes escriban por un canal conectado, van a aparecer acá."
              action={
                <Link
                  to="/app/connections"
                  className="btn btn-secondary btn-sm"
                >
                  Conectar un canal
                </Link>
              }
            />
          ) : (
            <ThreadList
              items={items}
              selectedId={selectedId}
              onSelect={select}
              label={tab === "messages" ? "Conversaciones" : "Comentarios"}
            />
          )}
        </aside>

        <section className="inbox-main">
          {selectedConversation ? (
            <MessageThread
              key={selectedConversation.id}
              conversation={selectedConversation}
              lead={leadsById.get(selectedConversation.leadId)}
              onBack={() => select(null)}
              onSent={conversations.reload}
            />
          ) : selectedThread ? (
            <CommentThreadDetail
              key={selectedThread.id}
              thread={selectedThread}
              lead={leadsById.get(selectedThread.leadId)}
              onBack={() => select(null)}
            />
          ) : (
            <EmptyState
              icon={<MessageIcon />}
              title="Elegí una conversación"
              hint="Seleccioná un elemento de la lista para leerlo y responder."
            />
          )}
        </section>
      </div>
    </div>
  );
}
