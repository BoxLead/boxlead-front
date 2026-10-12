import { Link } from "react-router-dom";
import type { AgentActivityDetail, AgentResponse, CategoryResponse } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { Dialog } from "../../components/ui/Dialog";
import { agentActivityKey } from "../../data/agents";
import { useApiQuery } from "../../hooks/useApiQuery";
import { activityOutcomeLabel, activityReasonLabel, labeledLeadLabel } from "../../util/agents";
import { formatRelative } from "../../util/format";
import "./AgentActivityDialog.css";

type AgentActivityDialogProps = {
  agent: AgentResponse;
  categories: CategoryResponse[] | undefined;
  onClose: () => void;
};

export function AgentActivityDialog({ agent, categories, onClose }: AgentActivityDialogProps) {
  const detail = useApiQuery<AgentActivityDetail>(agentActivityKey(agent.id));
  const days = detail.data?.days ?? 30;
  const events = detail.data?.events ?? [];

  return (
    <Dialog open title={`Actividad de ${agent.name}`} description={`Últimos ${days} días`} onClose={onClose}>
      {detail.loading ? (
        <div className="agent-activity-skeleton" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton agent-activity-row-skeleton" />
          ))}
        </div>
      ) : detail.error ? (
        <Banner
          tone="danger"
          title="No pudimos cargar la actividad"
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void detail.reload()}>
              Reintentar
            </button>
          }
        >
          {detail.error}
        </Banner>
      ) : events.length === 0 ? (
        <p className="agent-activity-empty">Todavía no hay actividad en los últimos {days} días.</p>
      ) : (
        <ul className="agent-activity" aria-label={`Actividad de ${agent.name}`}>
          {events.map((event) => {
            const reason = activityReasonLabel(event.reason);
            const labeled = labeledLeadLabel(event.labeledCategoryId, categories);
            return (
              <li key={event.id} className="agent-activity-item">
                <div className="agent-activity-head">
                  <span className="agent-activity-outcome">{activityOutcomeLabel(event.outcome)}</span>
                  <time dateTime={event.createdAt}>{formatRelative(event.createdAt)}</time>
                </div>
                {labeled ? <p className="agent-activity-detail">{labeled}</p> : null}
                {reason ? <p className="agent-activity-detail">{reason}</p> : null}
                {event.conversationId ? (
                  <Link to={`/app/inbox?id=${event.conversationId}`}>Ver conversación</Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Dialog>
  );
}
