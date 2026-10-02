import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type {
  CommentThreadResponse,
  ConversationResponse,
  LeadResponse,
} from "../../api/types";
import { ArrowLeftIcon } from "../../components/icons/UiIcons";
import { Loading } from "../../components/Loading";
import { PlatformBadge } from "../../components/PlatformBadge/PlatformBadge";
import { StatusBadge } from "../../components/StatusBadge/StatusBadge";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { formatShortDate } from "../../util/format";
import { leadDisplayName } from "../../util/labels";
import "./LeadDetail.css";

export function LeadDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const lead = useApiQuery<LeadResponse>(leadId ? `/leads/${leadId}` : null);
  const allConversations =
    useApiQuery<ConversationResponse[]>("/conversations");
  const allThreads = useApiQuery<CommentThreadResponse[]>("/comments/threads");
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useDocumentTitle(lead.data ? leadDisplayName(lead.data) : "Lead");

  const conversations = (allConversations.data ?? []).filter(
    (c) => c.leadId === leadId,
  );
  const threads = (allThreads.data ?? []).filter((t) => t.leadId === leadId);

  async function handleStartConversation() {
    if (!lead.data) return;
    setStarting(true);
    setActionError(null);
    try {
      await api.post<ConversationResponse>("/conversations", {
        leadId: lead.data.id,
        platform: lead.data.platform,
      });
      allConversations.reload();
    } catch (e) {
      setActionError(
        e instanceof ApiError
          ? e.message
          : "No pudimos iniciar la conversación.",
      );
    } finally {
      setStarting(false);
    }
  }

  const backLink = (
    <Link to="/app/leads" className="lead-detail-back">
      <ArrowLeftIcon width={16} height={16} />
      Leads
    </Link>
  );

  if (lead.loading) {
    return (
      <div className="page">
        {backLink}
        <Loading inline />
      </div>
    );
  }

  if (!lead.data) {
    return (
      <div className="page">
        {backLink}
        <div className="page-banner" role="alert">
          {lead.error ?? "No encontramos este lead."}
        </div>
      </div>
    );
  }

  const error = actionError ?? allConversations.error ?? allThreads.error;

  return (
    <div className="page">
      {backLink}
      <header className="page-header lead-detail-header">
        <h1 className="page-title">{leadDisplayName(lead.data)}</h1>
        <div className="lead-detail-tags">
          <PlatformBadge platform={lead.data.platform} />
          <StatusBadge status={lead.data.status} />
        </div>
      </header>

      {error ? (
        <div className="page-banner" role="alert">
          {error}
        </div>
      ) : null}

      <div className="lead-detail-grid">
        <section className="panel lead-detail-card">
          <h2 className="panel-title">Contacto</h2>
          <dl className="lead-detail-dl">
            <div>
              <dt>Email</dt>
              <dd>
                {lead.data.email?.trim() ? (
                  <a href={`mailto:${lead.data.email.trim()}`}>
                    {lead.data.email.trim()}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>
                {lead.data.phone?.trim() ? (
                  <a href={`tel:${lead.data.phone.trim()}`}>
                    {lead.data.phone.trim()}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>Creado</dt>
              <dd>{formatShortDate(lead.data.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel lead-detail-card">
          <div className="lead-detail-card-head">
            <h2 className="panel-title">Conversaciones</h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={starting}
              onClick={() => void handleStartConversation()}
            >
              {starting ? "Iniciando…" : "Nueva conversación"}
            </button>
          </div>
          {conversations.length === 0 ? (
            <p className="lead-detail-empty">
              Todavía no hay conversaciones con este lead.
            </p>
          ) : (
            <ul className="lead-detail-list">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/app/inbox?id=${c.id}`}
                    className="lead-detail-link"
                  >
                    <PlatformBadge platform={c.platform} />
                    <span className="lead-detail-link-meta">
                      {c.status === "OPEN" ? "Abierta" : "Cerrada"} ·{" "}
                      {formatShortDate(c.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel lead-detail-card">
          <h2 className="panel-title">Comentarios</h2>
          {threads.length === 0 ? (
            <p className="lead-detail-empty">
              Este lead no comentó en tus publicaciones.
            </p>
          ) : (
            <ul className="lead-detail-list">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/app/inbox?tab=comments&id=${t.id}`}
                    className="lead-detail-link"
                  >
                    <PlatformBadge platform={t.platform} />
                    <span className="lead-detail-link-meta">
                      {t.mediaProductType ?? "Publicación"} ·{" "}
                      {formatShortDate(t.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
