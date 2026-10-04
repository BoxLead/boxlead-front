import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type {
  CommentThreadResponse,
  ConversationResponse,
  LeadResponse,
} from "../../api/types";
import { ArrowLeftIcon, ChatIcon, ExternalLinkIcon } from "../../components/icons/UiIcons";
import { StatusSelect } from "../../components/StatusSelect/StatusSelect";
import { Avatar } from "../../components/ui/Avatar";
import { Banner } from "../../components/ui/Banner";
import { Tag } from "../../components/ui/Tag";
import { invalidateQueries } from "../../data/queryCache";
import { leadKey } from "../../data/leads";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { getPlatform, hasStages, stageLabel } from "../../platforms";
import { formatDate, formatRelative } from "../../util/format";
import { leadDisplayName } from "../../util/labels";
import "./LeadDetail.css";

export function LeadDetail() {
  const { leadId = "" } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const lead = useApiQuery<LeadResponse>(leadId ? leadKey(leadId) : null);
  const conversations = useApiQuery<ConversationResponse[]>(
    leadId ? `/conversations?leadId=${encodeURIComponent(leadId)}` : null,
  );
  const threads = useApiQuery<CommentThreadResponse[]>(
    leadId ? `/comments/threads?leadId=${encodeURIComponent(leadId)}` : null,
  );
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useDocumentTitle(lead.data ? leadDisplayName(lead.data) : "Lead");

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
        <div className="lead-detail-skeleton" aria-hidden="true">
          <div className="skeleton lead-detail-skeleton-head" />
          <div className="skeleton lead-detail-skeleton-card" />
          <div className="skeleton lead-detail-skeleton-card" />
        </div>
      </div>
    );
  }

  if (!lead.data) {
    return (
      <div className="page">
        {backLink}
        <Banner tone="danger" title="No encontramos este lead">
          {lead.error ?? "Puede que se haya eliminado o que el enlace sea de otra cuenta."}
        </Banner>
      </div>
    );
  }

  const current = lead.data;
  const platform = getPlatform(current.platform);
  const name = leadDisplayName(current);
  const contactFields = platform.contactFields(current);
  const ownConversations = (conversations.data ?? [])
    .filter((c) => c.leadId === current.id)
    .sort((a, b) => (b.lastMessageAt ?? b.updatedAt).localeCompare(a.lastMessageAt ?? a.updatedAt));
  const ownThreads = (threads.data ?? []).filter((t) => t.leadId === current.id);

  async function startConversation() {
    setStarting(true);
    setActionError(null);
    try {
      const created = await api.post<ConversationResponse>("/conversations", {
        leadId: current.id,
        platform: current.platform,
      });
      await invalidateQueries("/conversations");
      navigate(`/app/inbox?id=${created.id}`);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "No pudimos iniciar la conversación.");
      setStarting(false);
    }
  }

  return (
    <div className="page lead-detail">
      {backLink}
      <header className="lead-detail-header">
        <Avatar name={name} platform={current.platform} size="lg" />
        <div className="lead-detail-identity">
          <h1 className="page-title">{name}</h1>
          <p className="lead-detail-sub">
            <span>{platform.name}</span>
            {hasStages(current.platform) ? (
              current.postSaleOnly ? (
                <Tag tone="success">Comprador</Tag>
              ) : (
                <Tag tone="meli">Hizo preguntas</Tag>
              )
            ) : null}
            <span>Desde {formatDate(current.createdAt)}</span>
          </p>
        </div>
        <StatusSelect lead={current} size="md" />
      </header>

      {actionError ? (
        <Banner tone="danger" title="No pudimos iniciar la conversación" className="lead-detail-banner">
          {actionError}
        </Banner>
      ) : null}

      <div className="lead-detail-grid">
        <section className="panel lead-detail-card" aria-labelledby="lead-contact">
          <h2 className="panel-title" id="lead-contact">
            Contacto
          </h2>
          {contactFields.length === 0 ? (
            <p className="lead-detail-muted">
              {platform.name} todavía no compartió datos de contacto de esta persona.
            </p>
          ) : (
            <dl className="lead-detail-dl">
              {contactFields.map((field) => (
                <div key={field.label}>
                  <dt>{field.label}</dt>
                  <dd>
                    {field.href ? (
                      <a
                        href={field.href}
                        {...(field.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {field.value}
                        {field.href.startsWith("https://") ? <ExternalLinkIcon width={14} height={14} /> : null}
                      </a>
                    ) : (
                      field.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="panel lead-detail-card" aria-labelledby="lead-conversations">
          <div className="lead-detail-card-head">
            <h2 className="panel-title" id="lead-conversations">
              Conversaciones
            </h2>
            {platform.canStartConversation && ownConversations.length === 0 && conversations.data ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={starting}
                onClick={() => void startConversation()}
              >
                {starting ? "Abriendo…" : "Nueva conversación"}
              </button>
            ) : null}
          </div>
          {conversations.loading ? (
            <div className="skeleton lead-detail-skeleton-row" aria-hidden="true" />
          ) : ownConversations.length === 0 ? (
            <p className="lead-detail-muted">Todavía no hay conversaciones con esta persona.</p>
          ) : (
            <ul className="lead-detail-list">
              {ownConversations.map((conversation) => (
                <li key={conversation.id}>
                  <Link to={`/app/inbox?id=${conversation.id}`} className="lead-detail-conversation">
                    <ChatIcon width={18} height={18} />
                    <span className="lead-detail-conversation-body">
                      <span className="lead-detail-conversation-top">
                        {hasStages(conversation.platform) ? (
                          <Tag tone={conversation.salesStage === "POST_SALE" ? "success" : "meli"}>
                            {stageLabel(conversation.platform, conversation.salesStage)}
                          </Tag>
                        ) : (
                          <span>{getPlatform(conversation.platform).name}</span>
                        )}
                        <time dateTime={conversation.lastMessageAt ?? conversation.updatedAt}>
                          {formatRelative(conversation.lastMessageAt ?? conversation.updatedAt)}
                        </time>
                      </span>
                      {conversation.lastMessagePreview ? (
                        <span className="lead-detail-conversation-preview">
                          {conversation.lastMessageDirection === "OUTBOUND" ? "Vos: " : ""}
                          {conversation.lastMessagePreview}
                        </span>
                      ) : null}
                    </span>
                    {conversation.unreadCount ? (
                      <span className="lead-detail-unread">{conversation.unreadCount} sin leer</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {ownThreads.length > 0 ? (
          <section className="panel lead-detail-card" aria-labelledby="lead-comments">
            <h2 className="panel-title" id="lead-comments">
              Comentarios
            </h2>
            <ul className="lead-detail-list">
              {ownThreads.map((thread) => (
                <li key={thread.id}>
                  <Link to={`/app/inbox?view=comments&id=${thread.id}`} className="lead-detail-conversation">
                    <ChatIcon width={18} height={18} />
                    <span className="lead-detail-conversation-body">
                      <span className="lead-detail-conversation-top">
                        <span>Comentarios en {getPlatform(thread.platform).name}</span>
                        <time dateTime={thread.updatedAt}>{formatRelative(thread.updatedAt)}</time>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
