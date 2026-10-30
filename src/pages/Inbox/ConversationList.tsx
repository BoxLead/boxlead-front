import i18next from "i18next";
import type { RefObject } from "react";
import type { PlatformType, SalesStage } from "../../api/types";
import { SearchIcon } from "../../components/icons/UiIcons";
import { ChoiceGroup, type Choice } from "../../components/ui/ChoiceGroup";
import { useRenderWindow } from "../../hooks/useRenderWindow";
import { getPlatform, hasStages, stageLabel } from "../../platforms";
import { ConversationItem } from "./ConversationItem";
import type { ChannelFilter, ConversationRow, InboxFilters } from "./inboxModel";
import { unreadBy } from "./inboxModel";
import "./ConversationList.css";

type ConversationListProps = {
  rows: ConversationRow[];
  visible: ConversationRow[];
  channels: PlatformType[];
  filters: InboxFilters;
  selectedId: string | null;
  searchRef?: RefObject<HTMLInputElement | null>;
  windowKey?: string;
  linkFor: (id: string) => string;
  onFiltersChange: (patch: Partial<InboxFilters>) => void;
};

const STAGES: SalesStage[] = ["PRE_SALE", "POST_SALE"];

export function ConversationList({
  rows,
  visible,
  channels,
  filters,
  selectedId,
  searchRef,
  windowKey = "",
  linkFor,
  onFiltersChange,
}: ConversationListProps) {
  const { shown, remaining, showMore, sentinelRef } = useRenderWindow(visible, windowKey);
  const unreadByChannel = unreadBy(rows, (row) => row.platform);
  const channelRows = filters.channel === "ALL" ? rows : rows.filter((row) => row.platform === filters.channel);
  const unreadByStage = unreadBy(channelRows, (row) => row.salesStage);

  const channelChoices: Choice<ChannelFilter>[] = [
    { value: "ALL", label: "Todos" },
    ...channels.map((id) => ({
      value: id,
      label: getPlatform(id).name,
      icon: getPlatform(id).logo(16),
      count: unreadByChannel[id],
    })),
  ];

  const showStages = filters.channel !== "ALL" && hasStages(filters.channel);

  return (
    <div className="conversation-list">
      <div className="conversation-list-tools">
        <label className="conversation-search">
          <SearchIcon width={18} height={18} />
          <span className="visually-hidden">Buscar conversaciones</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Buscar por nombre o mensaje"
            value={filters.query}
            aria-keyshortcuts="/"
            onChange={(event) => onFiltersChange({ query: event.target.value })}
          />
          <kbd className="conversation-search-key" aria-hidden="true">
            /
          </kbd>
        </label>
        {channels.length > 1 ? (
          <ChoiceGroup
            label="Canal"
            className="conversation-channels"
            choices={channelChoices}
            unreadLabel={(count) => i18next.t("ui.unread", { ns: "shell", count })}
            value={filters.channel}
            onChange={(channel) => onFiltersChange({ channel, stage: null })}
          />
        ) : null}
        {showStages && filters.channel !== "ALL" ? (
          <ChoiceGroup<"ALL" | SalesStage>
            label="Etapa"
            variant="segmented"
            className="conversation-stages"
            unreadLabel={(count) => i18next.t("ui.unread", { ns: "shell", count })}
            value={filters.stage ?? "ALL"}
            onChange={(stage) => onFiltersChange({ stage: stage === "ALL" ? null : stage })}
            choices={[
              { value: "ALL", label: "Todo" },
              ...STAGES.map((stage) => ({
                value: stage,
                label: stageLabel(filters.channel as PlatformType, stage),
                count: unreadByStage[stage],
              })),
            ]}
          />
        ) : null}
        <label className="conversation-unread-toggle">
          <input
            type="checkbox"
            checked={filters.unreadOnly}
            onChange={(event) => onFiltersChange({ unreadOnly: event.target.checked })}
          />
          Solo sin leer
        </label>
      </div>
      {visible.length === 0 ? (
        <p className="conversation-list-empty">
          {filters.query ? `No hay conversaciones que coincidan con “${filters.query}”.` : "No hay conversaciones con estos filtros."}
        </p>
      ) : (
        <ul className="conversation-items rise" aria-label="Conversaciones">
          {shown.map((row) => (
            <ConversationItem key={row.id} row={row} to={linkFor(row.id)} selected={row.id === selectedId} />
          ))}
          {remaining > 0 ? (
            <li className="conversation-items-more">
              <button type="button" className="btn btn-secondary btn-sm" ref={sentinelRef} onClick={showMore}>
                Mostrar más ({remaining})
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
