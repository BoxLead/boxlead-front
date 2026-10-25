import { useCallback, useDeferredValue, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ConversationResponse, LeadResponse, PlatformType, SalesStage } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { InboxIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useUrlQuery } from "../../hooks/useUrlQuery";
import { CONNECTABLE_PLATFORMS } from "../../platforms";
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
import { useInboxShortcuts } from "./useInboxShortcuts";
import "./Inbox.css";

const LIST_REFRESH_MS = 5_000;
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
  const [query, setQuery] = useUrlQuery(searchParams, setSearchParams);
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedId = searchParams.get("id");
  const channel = parseChannel(searchParams.get("channel"));
  const stage = parseStage(searchParams.get("stage"));
  const unreadOnly = searchParams.get("unread") === "1";
  const filters: InboxFilters = { channel, stage, unreadOnly, query };

  const conversations = useApiQuery<ConversationResponse[]>(CONVERSATIONS_KEY, {
    refreshInterval: LIST_REFRESH_MS,
  });
  const needsLeads = (conversations.data ?? []).some((c) => !c.leadName);
  const leads = useApiQuery<LeadResponse[]>(needsLeads ? "/leads?includePostSale=true" : null);

  const leadsById = useMemo(
    () => new Map((leads.data ?? []).map((lead) => [lead.id, lead])),
    [leads.data],
  );
  const rows = useMemo(() => toRows(conversations.data ?? [], leadsById), [conversations.data, leadsById]);
  const visible = useMemo(
    () => filterRows(rows, { channel, stage, unreadOnly, query: deferredQuery }),
    [rows, channel, stage, unreadOnly, deferredQuery],
  );
  const visibleIds = useMemo(() => visible.map((row) => row.id), [visible]);
  const channels = useMemo(() => channelsIn(rows, CONNECTABLE_PLATFORMS.map((p) => p.id)), [rows]);
  const selectedRow = rows.find((row) => row.id === selectedId);

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

  const isOpen = Boolean(selectedId);
  const backTo = linkWith({ id: null });
  const linkFor = useCallback((id: string) => linkWith({ id }), [linkWith]);
  useInboxShortcuts({ ids: visibleIds, selectedId, linkFor, backTo, searchRef });

  return (
    <div className={`inbox${isOpen ? " inbox-open" : ""}`}>
      <header className="inbox-header">
        <h1 className="page-title">Bandeja</h1>
      </header>

      <div className={`inbox-panels${isOpen ? " inbox-panels-open" : ""}`}>
        <aside className="inbox-list" aria-label="Lista de conversaciones">
          {conversations.error && !conversations.data ? (
            <div className="inbox-list-message">
              <Banner tone="danger" title="No pudimos cargar la bandeja">
                {conversations.error}
              </Banner>
            </div>
          ) : conversations.loading ? (
            <ul className="conversation-items" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="conversation-item-skeleton">
                  <span className="skeleton skeleton-circle" />
                  <span className="skeleton skeleton-lines" />
                </li>
              ))}
            </ul>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<InboxIcon />}
              title="Tu bandeja está vacía"
              hint="Cuando alguien te escriba o comente en un canal conectado, la conversación aparece acá."
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
              searchRef={searchRef}
              windowKey={`${channel}|${stage ?? ""}|${unreadOnly ? 1 : 0}|${deferredQuery}`}
              linkFor={linkFor}
              onFiltersChange={updateFilters}
            />
          )}
        </aside>

        <div className="inbox-main">
          {selectedRow ? (
            <ConversationView key={selectedRow.id} row={selectedRow} backTo={backTo} />
          ) : selectedId && !conversations.loading ? (
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
              title="Elegí una conversación"
              hint="Respondé desde acá y el mensaje sale por el canal de origen."
            />
          )}
        </div>
      </div>
    </div>
  );
}
