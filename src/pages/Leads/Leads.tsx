import { useDeferredValue, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import type { CategoryResponse, LeadResponse, LeadStatus, LeadTemperature, PlatformType } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { CategorySelect } from "../../components/CategorySelect/CategorySelect";
import { SearchIcon } from "../../components/icons/UiIcons";
import { StatusSelect } from "../../components/StatusSelect/StatusSelect";
import { TemperatureSelect } from "../../components/TemperatureSelect/TemperatureSelect";
import { Avatar } from "../../components/ui/Avatar";
import { Banner } from "../../components/ui/Banner";
import { ChoiceGroup, type Choice } from "../../components/ui/ChoiceGroup";
import { Tag } from "../../components/ui/Tag";
import { CATEGORIES_KEY } from "../../data/categories";
import { ALL_LEADS_KEY } from "../../data/leads";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useRenderWindow } from "../../hooks/useRenderWindow";
import { useUrlQuery } from "../../hooks/useUrlQuery";
import { CONNECTABLE_PLATFORMS, getPlatform } from "../../platforms";
import { UNCATEGORIZED } from "../../util/categories";
import { formatRelative } from "../../util/format";
import {
  LEAD_STATUSES,
  LEAD_TEMPERATURES,
  leadDisplayName,
  leadStatusLabel,
  leadTemperatureLabel,
} from "../../util/labels";
import { UNEVALUATED, filterLeads, statusCounts, type LeadFilters } from "./leadsModel";
import "./Leads.css";

function parseStatus(value: string | null): LeadStatus | null {
  return LEAD_STATUSES.includes(value as LeadStatus) ? (value as LeadStatus) : null;
}

function parseTemperature(value: string | null): LeadFilters["temperature"] {
  if (value === UNEVALUATED) return UNEVALUATED;
  return LEAD_TEMPERATURES.includes(value as LeadTemperature) ? (value as LeadTemperature) : null;
}

function parseChannel(value: string | null): PlatformType | "ALL" {
  return CONNECTABLE_PLATFORMS.some((p) => p.id === value) ? (value as PlatformType) : "ALL";
}

export function Leads() {
  const { t } = useTranslation("leads");
  useDocumentTitle(t("title"));

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useUrlQuery(searchParams, setSearchParams);
  const deferredQuery = useDeferredValue(query);
  const leads = useApiQuery<LeadResponse[]>(ALL_LEADS_KEY);
  const categories = useApiQuery<CategoryResponse[]>(CATEGORIES_KEY);
  const categoryList = categories.data ?? [];
  const filters: LeadFilters = useMemo(
    () => ({
      status: parseStatus(searchParams.get("status")),
      channel: parseChannel(searchParams.get("channel")),
      includeBuyers: searchParams.get("buyers") === "1",
      category: searchParams.get("category"),
      temperature: parseTemperature(searchParams.get("temperature")),
      query: deferredQuery,
    }),
    [searchParams, deferredQuery],
  );

  const all = useMemo(() => leads.data ?? [], [leads.data]);
  const scoped = useMemo(() => filterLeads(all, { ...filters, status: null }), [all, filters]);
  const visible = useMemo(() => filterLeads(all, filters), [all, filters]);
  const counts = useMemo(() => statusCounts(scoped), [scoped]);
  const buyers = useMemo(() => all.filter((lead) => lead.postSaleOnly).length, [all]);
  const channels = useMemo(() => CONNECTABLE_PLATFORMS.filter((p) => all.some((lead) => lead.platform === p.id)), [all]);
  const windowKey = `${searchParams.toString()}|${deferredQuery}`;
  const { shown, remaining, showMore, sentinelRef } = useRenderWindow(visible, windowKey);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  const channelChoices: Choice<PlatformType | "ALL">[] = [
    { value: "ALL", label: t("list.allChannels") },
    ...channels.map((p) => ({ value: p.id, label: p.name, icon: p.logo(16) })),
  ];

  return (
    <div className="page leads-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-header-desc">{t("list.description")}</p>
        </div>
      </header>

      <div className="leads-funnel" role="group" aria-label={t("list.statusFilter")}>
        {LEAD_STATUSES.map((status) => {
          const active = filters.status === status;
          return (
            <button
              key={status}
              type="button"
              className={`leads-funnel-step leads-funnel-${status.toLowerCase()}${active ? " leads-funnel-active" : ""}`}
              aria-pressed={active}
              onClick={() => setParam("status", active ? null : status)}
            >
              <span className="leads-funnel-count">{leads.data ? counts[status] : "–"}</span>
              <span className="leads-funnel-label">{leadStatusLabel(status)}</span>
            </button>
          );
        })}
      </div>

      <div className="leads-toolbar">
        <label className="leads-search">
          <SearchIcon width={18} height={18} />
          <span className="visually-hidden">{t("list.search")}</span>
          <input
            type="search"
            placeholder={t("list.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {leads.loading ? (
          <div className="leads-toolbar-placeholder" aria-hidden="true">
            <span className="skeleton leads-chip-skeleton" />
            <span className="skeleton leads-chip-skeleton" />
            <span className="skeleton leads-chip-skeleton" />
          </div>
        ) : channels.length > 1 ? (
          <ChoiceGroup
            label={t("list.channel")}
            choices={channelChoices}
            value={filters.channel}
            onChange={(channel) => setParam("channel", channel === "ALL" ? null : channel)}
          />
        ) : null}
        <label className="leads-category-filter">
          <span className="visually-hidden">{t("list.categoryFilter")}</span>
          <select
            className="select"
            value={filters.category ?? ""}
            disabled={!categories.data}
            onChange={(event) => setParam("category", event.target.value || null)}
          >
            <option value="">{t("list.allCategories")}</option>
            {categoryList.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value={UNCATEGORIZED}>{t("list.uncategorized")}</option>
          </select>
        </label>
        <label className="leads-temperature-filter">
          <span className="visually-hidden">{t("list.temperatureFilter")}</span>
          <select
            className="select"
            value={filters.temperature ?? ""}
            onChange={(event) => setParam("temperature", event.target.value || null)}
          >
            <option value="">{t("list.allTemperatures")}</option>
            {LEAD_TEMPERATURES.map((temperature) => (
              <option key={temperature} value={temperature}>
                {leadTemperatureLabel(temperature)}
              </option>
            ))}
            <option value={UNEVALUATED}>{t("list.unevaluated")}</option>
          </select>
        </label>
        {leads.loading ? (
          <span className="skeleton leads-toggle-skeleton" aria-hidden="true" />
        ) : buyers > 0 ? (
          <label className="leads-buyers-toggle">
            <input
              type="checkbox"
              checked={filters.includeBuyers}
              onChange={(event) => setParam("buyers", event.target.checked ? "1" : null)}
            />
            {t("list.includeBuyers", { value: buyers })}
          </label>
        ) : null}
      </div>

      {leads.error && !leads.data ? (
        <Banner
          tone="danger"
          title={t("list.loadError")}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void leads.reload()}>
              {t("list.retry")}
            </button>
          }
        >
          {leads.error}
        </Banner>
      ) : leads.loading ? (
        <div className="panel leads-table-wrap leads-skeleton" aria-hidden="true">
          <div className="leads-skeleton-head">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
            <div className="leads-skeleton-row" key={row}>
              <span className="skeleton leads-skeleton-avatar" />
              <span className="skeleton leads-skeleton-name" />
              <span className="skeleton leads-skeleton-pill" />
              <span className="skeleton leads-skeleton-pill" />
            </div>
          ))}
        </div>
      ) : all.length === 0 ? (
        <div className="panel leads-empty">
          <EmptyState
            illustration="leads"
            title={t("list.emptyTitle")}
            hint={t("list.emptyHint")}
            action={
              <Link to="/app/connections" className="btn btn-secondary btn-sm">
                {t("list.connect")}
              </Link>
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="panel leads-empty">
          <EmptyState
            illustration="search"
            title={t("list.noMatches")}
            action={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setQuery("");
                  setSearchParams({}, { replace: true });
                }}
              >
                {t("list.clearFilters")}
              </button>
            }
          />
        </div>
      ) : (
        <div className="panel leads-table-wrap rise">
          <table className="leads-table">
            <caption className="visually-hidden">
              {t("list.caption", { count: visible.length })}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t("list.contact")}</th>
                <th scope="col">{t("list.status")}</th>
                <th scope="col">{t("list.temperature")}</th>
                <th scope="col">{t("list.category")}</th>
                <th scope="col">{t("list.details")}</th>
                <th scope="col">{t("list.firstContact")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((lead) => {
                const name = leadDisplayName(lead);
                const platform = getPlatform(lead.platform);
                return (
                  <tr key={lead.id} className="leads-row">
                    <td>
                      <div className="leads-person">
                        <Avatar name={name} platform={lead.platform} size="sm" />
                        <div className="leads-person-text">
                          <Link to={`/app/leads/${lead.id}`} className="leads-name">
                            {name}
                          </Link>
                          <span className="leads-person-meta">
                            {platform.name}
                            {lead.postSaleOnly ? <Tag tone="success">{t("buyer")}</Tag> : null}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusSelect lead={lead} />
                    </td>
                    <td>
                      <TemperatureSelect lead={lead} />
                    </td>
                    <td>
                      <CategorySelect lead={lead} categories={categoryList} />
                    </td>
                    <td className="leads-contact">
                      {lead.email || lead.phone ? (
                        <>
                          {lead.email ? <span>{lead.email}</span> : null}
                          {lead.phone ? <span>{lead.phone}</span> : null}
                        </>
                      ) : (
                        <span className="leads-cell-muted">{t("list.noDetails")}</span>
                      )}
                    </td>
                    <td className="leads-cell-muted">
                      <time dateTime={lead.createdAt}>{formatRelative(lead.createdAt)}</time>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {remaining > 0 ? (
            <div className="leads-table-more">
              <button type="button" className="btn btn-secondary btn-sm" ref={sentinelRef} onClick={showMore}>
                {t("list.showMore", { value: remaining })}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
