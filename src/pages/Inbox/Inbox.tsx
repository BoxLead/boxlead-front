import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type {
  CommentThreadResponse,
  ConversationResponse,
  LeadResponse,
  PlatformType,
  SalesStage,
} from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ChatIcon, InboxIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { CONNECTABLE_PLATFORMS } from "../../platforms";
import { leadDisplayName } from "../../util/labels";
import { CommentList } from "./CommentList";
import { CommentThreadView } from "./CommentThreadView";
import { ConversationList } from "./ConversationList";
import { ConversationView } from "./ConversationView";
import {
  channelsIn,
  filterRows,
  toRows,
  type ChannelFilter,
  type InboxFilters,
} from "./inboxModel";
import { CONVERSATIONS_KEY } from "./useConversationSender";
import "./Inbox.css";

type View = "conversations" | "comments";

const LIST_REFRESH_MS = 15_000;
const STAGES: SalesStage[] = ["PRE_SALE", "POST_SALE"];

function parseChannel(value: string | null): ChannelFilter {
  return CONNECTABLE_PLATFORMS.some((p) => p.id === value) ? (value as PlatformType) : "ALL";
}

function parseStage(value: string | null): SalesStage | null {
  return STAGES.includes(value as SalesStage) ? (value as SalesStage) : null;
}

export function Inbox() {
  useDocumentTitle("Bandeja");

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const view: View = searchParams.get("view") === "comments" ? "comments" : "conversations";
  const selectedId = searchParams.get("id");
  const filters: InboxFilters = {
    channel: parseChannel(searchParams.get("channel")),
    stage: parseStage(searchParams.get("stage")),
    unreadOnly: searchParams.get("unread") === "1",
    query,
  };

  const conversations = useApiQuery<ConversationResponse[]>(CONVERSATIONS_KEY, {
    refreshInterval: LIST_REFRESH_MS,
  });
  const threads = useApiQuery<CommentThreadResponse[]>("/comments/threads", {
    refreshInterval: view === "comments" ? LIST_REFRESH_MS * 2 : undefined,
  });
  const needsLeads =
    (conversations.data ?? []).some((c) => !c.leadName) || (threads.data ?? []).length > 0;
  const leads = useApiQuery<LeadResponse[]>(needsLeads ? "/leads?includePostSale=true" : null);

  const leadsById = useMemo(
    () => new Map((leads.data ?? []).map((lead) => [lead.id, lead])),
    [leads.data],
  );
  const rows = useMemo(() => toRows(conversations.data ?? [], leadsById), [conversations.data, leadsById]);
  const visible = filterRows(rows, filters);
  const channels = channelsIn(rows, CONNECTABLE_PLATFORMS.map((p) => p.id));
  const totalUnread = rows.reduce((sum, row) => sum + row.unread, 0);
  const selectedRow = view === "conversations" ? rows.find((row) => row.id === selectedId) : undefined;
  const threadList = threads.data ?? [];
  const selectedThread = view === "comments" ? threadList.find((t) => t.id === selectedId) : undefined;

  const linkWith = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const search = params.toString();
      return `/app/inbox${search ? `?${search}` : ""}`;
    },
    [searchParams],
  );

  function updateFilters(patch: Partial<InboxFilters>) {
    if (patch.query !== undefined) setQuery(patch.query);
    const next = new URLSearchParams(searchParams);
    if (patch.channel !== undefined) {
      if (patch.channel === "ALL") next.delete("channel");
      else next.set("channel", patch.channel);
    }
    if (patch.stage !== undefined) {
      if (patch.stage) next.set("stage", patch.stage);
      else next.delete("stage");
    }
    if (patch.unreadOnly !== undefined) {
      if (patch.unreadOnly) next.set("unread", "1");
      else next.delete("unread");
    }
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }

  const nameOfThread = (thread: CommentThreadResponse) => {
    const lead = leadsById.get(thread.leadId);
    return lead ? leadDisplayName(lead) : "Usuario de Instagram";
  };

  const listError = view === "conversations" ? conversations.error : threads.error;
  const listLoading = view === "conversations" ? conversations.loading : threads.loading;
  const isOpen = Boolean(selectedId);
  const backTo = linkWith({ id: null });

  return (
    <div className={`inbox${isOpen ? " inbox-open" : ""}`}>
      <header className="inbox-header">
        <h1 className="page-title">Bandeja</h1>
        <ChoiceGroup<View>
          label="Vista"
          variant="segmented"
          value={view}
          onChange={(next) => setSearchParams(next === "comments" ? { view: "comments" } : {}, { replace: true })}
          choices={[
            { value: "conversations", label: "Conversaciones", count: totalUnread },
            { value: "comments", label: "Comentarios" },
          ]}
        />
      </header>

      <div className={`inbox-panels${isOpen ? " inbox-panels-open" : ""}`}>
        <aside className="inbox-list" aria-label={view === "comments" ? "Lista de comentarios" : "Lista de conversaciones"}>
          {listError && !(view === "conversations" ? conversations.data : threads.data) ? (
            <div className="inbox-list-message">
              <Banner tone="danger" title="No pudimos cargar la bandeja">
                {listError}
              </Banner>
            </div>
          ) : listLoading ? (
            <ul className="conversation-items" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="conversation-item-skeleton">
                  <span className="skeleton skeleton-circle" />
                  <span className="skeleton skeleton-lines" />
                </li>
              ))}
            </ul>
          ) : view === "conversations" ? (
            rows.length === 0 ? (
              <EmptyState
                icon={<InboxIcon />}
                title="Tu bandeja está vacía"
                hint="Cuando alguien te escriba por un canal conectado, la conversación aparece acá."
                action={
                  <Link to="/app/connections" className="btn btn-secondary btn-sm">
                    Conectar un canal
                  </Link>
                }
              />
            ) : (
              <ConversationList
                rows={rows}
                visible={visible}
                channels={channels}
                filters={filters}
                selectedId={selectedId}
                linkFor={(id) => linkWith({ id })}
                onFiltersChange={updateFilters}
              />
            )
          ) : threadList.length === 0 ? (
            <EmptyState
              icon={<ChatIcon />}
              title="Sin comentarios por ahora"
              hint="Los comentarios en tus publicaciones y reels de Instagram aparecen acá."
            />
          ) : (
            <CommentList
              threads={[...threadList].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))}
              nameOf={nameOfThread}
              selectedId={selectedId}
              linkFor={(id) => linkWith({ id })}
            />
          )}
        </aside>

        <div className="inbox-main">
          {selectedRow ? (
            <ConversationView key={selectedRow.id} row={selectedRow} backTo={backTo} />
          ) : selectedThread ? (
            <CommentThreadView
              key={selectedThread.id}
              thread={selectedThread}
              name={nameOfThread(selectedThread)}
              backTo={backTo}
            />
          ) : selectedId && !listLoading ? (
            <EmptyState
              icon={<InboxIcon />}
              title="No encontramos esta conversación"
              hint="Puede que se haya eliminado o que el enlace sea de otra cuenta."
              action={
                <Link to={backTo} className="btn btn-secondary btn-sm">
                  Volver a la bandeja
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<InboxIcon />}
              title={view === "comments" ? "Elegí un comentario" : "Elegí una conversación"}
              hint={
                view === "comments"
                  ? "Vas a ver el hilo completo de comentarios."
                  : "Respondé desde acá y el mensaje sale por el canal de origen."
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
