import { Link } from "react-router-dom";
import type { AgentActivityDetail, AgentResponse, CategoryResponse } from "../../api/types";
import { Banner } from "../../components/ui/Banner";
import { agentActivityKey } from "../../data/agents";
import { useApiQuery } from "../../hooks/useApiQuery";
import { activityOutcomeLabel, activityReasonLabel, labeledLeadLabel, type ActivityNumbers } from "../../util/agents";
import { formatNumber, formatRelative } from "../../util/format";

const STATS: { key: keyof ActivityNumbers; label: string }[] = [
  { key: "labeled", label: "Etiquetados" },
  { key: "sent", label: "Respondidos" },
  { key: "drafted", label: "Borradores" },
  { key: "skipped", label: "Omitidos" },
  { key: "handedOff", label: "Derivados" },
];

type AgentActivityProps = {
  agent: AgentResponse;
  categories: CategoryResponse[] | undefined;
  counts: ActivityNumbers | undefined;
  activityDays: number | undefined;
};

export function AgentActivity({ agent, categories, counts, activityDays }: AgentActivityProps) {
  const detail = useApiQuery<AgentActivityDetail>(agentActivityKey(agent.id));
  const days = detail.data?.days ?? activityDays ?? 30;
  const events = detail.data?.events ?? [];

  return (
    <div className="agent-activity-panel">
      {counts && activityDays ? (
        <section className="agent-stats" aria-label={`Actividad de ${agent.name}, últimos ${activityDays} días`}>
          <p className="agent-stats-period">Últimos {activityDays} días</p>
          <dl className="agent-stats-grid">
            {STATS.map((stat) => (
              <div key={stat.key} className="agent-stat">
                <dt>{stat.label}</dt>
                <dd>{formatNumber(counts[stat.key])}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
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
                {event.conversationId ? <Link to={`/app/inbox?id=${event.conversationId}`}>Ver conversación</Link> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
