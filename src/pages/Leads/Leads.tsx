import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LeadResponse, LeadStatus } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { UsersIcon } from "../../components/icons/UiIcons";
import { PlatformBadge } from "../../components/PlatformBadge/PlatformBadge";
import { StatusBadge } from "../../components/StatusBadge/StatusBadge";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { formatShortDate } from "../../util/format";
import {
  LEAD_STATUSES,
  leadDisplayName,
  leadStatusLabel,
} from "../../util/labels";
import "./Leads.css";

type StatusFilter = LeadStatus | "";

export function Leads() {
  useDocumentTitle("Leads");

  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("");
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const { data, error, loading } = useApiQuery<LeadResponse[]>(
    `/leads${query}`,
  );
  const leads = data ?? [];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-header-desc">
            Las personas que te escribieron por tus canales conectados.
          </p>
        </div>
      </header>

      <div
        className="leads-filters"
        role="group"
        aria-label="Filtrar por estado"
      >
        {(["", ...LEAD_STATUSES] as StatusFilter[]).map((option) => (
          <button
            key={option || "all"}
            type="button"
            className={`leads-filter${status === option ? " leads-filter-active" : ""}`}
            aria-pressed={status === option}
            onClick={() => setStatus(option)}
          >
            {option ? leadStatusLabel(option) : "Todos"}
          </button>
        ))}
      </div>

      {error ? (
        <div className="page-banner" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="leads-skeleton" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((row) => (
            <div className="leads-skeleton-row skeleton" key={row} />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="panel leads-empty">
          <EmptyState
            icon={<UsersIcon />}
            title={
              status ? "No hay leads en este estado" : "Todavía no hay leads"
            }
            hint="Los leads se crean solos cuando alguien te escribe por un canal conectado."
            action={
              status ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setStatus("")}
                >
                  Ver todos
                </button>
              ) : (
                <Link
                  to="/app/connections"
                  className="btn btn-secondary btn-sm"
                >
                  Conectar un canal
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="panel leads-table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Canal</th>
                <th>Estado</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="leads-row"
                  onClick={() => navigate(`/app/leads/${lead.id}`)}
                >
                  <td data-label="Nombre">
                    <Link
                      to={`/app/leads/${lead.id}`}
                      className="leads-name"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {leadDisplayName(lead)}
                    </Link>
                  </td>
                  <td data-label="Canal">
                    <PlatformBadge platform={lead.platform} />
                  </td>
                  <td data-label="Estado">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td data-label="Email">{lead.email?.trim() || "—"}</td>
                  <td data-label="Teléfono">{lead.phone?.trim() || "—"}</td>
                  <td data-label="Creado" className="leads-cell-muted">
                    {formatShortDate(lead.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
