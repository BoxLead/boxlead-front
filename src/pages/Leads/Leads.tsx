import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CategoryResponse, LeadResponse, LeadStatus, PlatformType } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { CategorySelect } from "../../components/CategorySelect/CategorySelect";
import { SearchIcon, UsersIcon } from "../../components/icons/UiIcons";
import { StatusSelect } from "../../components/StatusSelect/StatusSelect";
import { Avatar } from "../../components/ui/Avatar";
import { Banner } from "../../components/ui/Banner";
import { ChoiceGroup, type Choice } from "../../components/ui/ChoiceGroup";
import { Tag } from "../../components/ui/Tag";
import { CATEGORIES_KEY } from "../../data/categories";
import { ALL_LEADS_KEY } from "../../data/leads";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { CONNECTABLE_PLATFORMS, getPlatform } from "../../platforms";
import { UNCATEGORIZED } from "../../util/categories";
import { formatRelative } from "../../util/format";
import { LEAD_STATUSES, leadDisplayName, leadStatusLabel } from "../../util/labels";
import { filterLeads, statusCounts, type LeadFilters } from "./leadsModel";
import "./Leads.css";

function parseStatus(value: string | null): LeadStatus | null {
  return LEAD_STATUSES.includes(value as LeadStatus) ? (value as LeadStatus) : null;
}

function parseChannel(value: string | null): PlatformType | "ALL" {
  return CONNECTABLE_PLATFORMS.some((p) => p.id === value) ? (value as PlatformType) : "ALL";
}

export function Leads() {
  useDocumentTitle("Leads");

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const leads = useApiQuery<LeadResponse[]>(ALL_LEADS_KEY);
  const categories = useApiQuery<CategoryResponse[]>(CATEGORIES_KEY);
  const categoryList = categories.data ?? [];
  const filters: LeadFilters = {
    status: parseStatus(searchParams.get("status")),
    channel: parseChannel(searchParams.get("channel")),
    includeBuyers: searchParams.get("buyers") === "1",
    category: searchParams.get("category"),
    query,
  };

  const all = useMemo(() => leads.data ?? [], [leads.data]);
  const scoped = filterLeads(all, { ...filters, status: null });
  const visible = filterLeads(all, filters);
  const counts = statusCounts(scoped);
  const buyers = all.filter((lead) => lead.postSaleOnly).length;
  const channels = CONNECTABLE_PLATFORMS.filter((p) => all.some((lead) => lead.platform === p.id));

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  const channelChoices: Choice<PlatformType | "ALL">[] = [
    { value: "ALL", label: "Todos los canales" },
    ...channels.map((p) => ({ value: p.id, label: p.name, icon: p.logo(16) })),
  ];

  return (
    <div className="page leads-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-header-desc">Todas las personas que te consultaron, en un solo lugar y con su estado.</p>
        </div>
      </header>

      <div className="leads-funnel" role="group" aria-label="Filtrar por estado">
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
          <span className="visually-hidden">Buscar leads</span>
          <input
            type="search"
            placeholder="Buscar por nombre, email o teléfono"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {channels.length > 1 ? (
          <ChoiceGroup
            label="Canal"
            choices={channelChoices}
            value={filters.channel}
            onChange={(channel) => setParam("channel", channel === "ALL" ? null : channel)}
          />
        ) : null}
        {categoryList.length > 0 ? (
          <label className="leads-category-filter">
            <span className="visually-hidden">Filtrar por categoría</span>
            <select
              className="select"
              value={filters.category ?? ""}
              onChange={(event) => setParam("category", event.target.value || null)}
            >
              <option value="">Todas las categorías</option>
              {categoryList.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              <option value={UNCATEGORIZED}>Sin categoría</option>
            </select>
          </label>
        ) : null}
        {buyers > 0 ? (
          <label className="leads-buyers-toggle">
            <input
              type="checkbox"
              checked={filters.includeBuyers}
              onChange={(event) => setParam("buyers", event.target.checked ? "1" : null)}
            />
            Incluir compradores sin consulta previa ({buyers})
          </label>
        ) : null}
      </div>

      {leads.error && !leads.data ? (
        <Banner
          tone="danger"
          title="No pudimos cargar los leads"
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void leads.reload()}>
              Reintentar
            </button>
          }
        >
          {leads.error}
        </Banner>
      ) : leads.loading ? (
        <div className="leads-skeleton" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((row) => (
            <div className="leads-skeleton-row skeleton" key={row} />
          ))}
        </div>
      ) : all.length === 0 ? (
        <div className="panel leads-empty">
          <EmptyState
            icon={<UsersIcon />}
            title="Todavía no hay leads"
            hint="Se crean solos cuando alguien te escribe por un canal conectado."
            action={
              <Link to="/app/connections" className="btn btn-secondary btn-sm">
                Conectar un canal
              </Link>
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="panel leads-empty">
          <EmptyState
            icon={<SearchIcon />}
            title="No hay leads con estos filtros"
            action={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setQuery("");
                  setSearchParams({}, { replace: true });
                }}
              >
                Limpiar filtros
              </button>
            }
          />
        </div>
      ) : (
        <div className="panel leads-table-wrap">
          <table className="leads-table">
            <caption className="visually-hidden">
              {visible.length === 1 ? "1 lead" : `${visible.length} leads`}
            </caption>
            <thead>
              <tr>
                <th scope="col">Contacto</th>
                <th scope="col">Estado</th>
                <th scope="col">Categoría</th>
                <th scope="col">Datos</th>
                <th scope="col">Primer contacto</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => {
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
                            {lead.postSaleOnly ? <Tag tone="success">Comprador</Tag> : null}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusSelect lead={lead} />
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
                        <span className="leads-cell-muted">Sin datos</span>
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
        </div>
      )}
    </div>
  );
}
