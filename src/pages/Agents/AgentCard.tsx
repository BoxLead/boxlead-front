import type { AgentResponse, CategoryResponse } from "../../api/types";
import { Switch } from "../../components/ui/Switch";
import { Tag } from "../../components/ui/Tag";
import { scopeLabel, type ActivityNumbers } from "../../util/agents";
import { formatNumber } from "../../util/format";

const STATS: { key: keyof ActivityNumbers; label: string }[] = [
  { key: "labeled", label: "Etiquetados" },
  { key: "sent", label: "Respondidos" },
  { key: "drafted", label: "Borradores" },
  { key: "skipped", label: "Omitidos" },
  { key: "handedOff", label: "Derivados" },
];

type AgentCardProps = {
  agent: AgentResponse;
  categories: CategoryResponse[] | undefined;
  toggling: boolean;
  activityLoading: boolean;
  activityDays: number | undefined;
  counts: ActivityNumbers | undefined;
  onToggle: (enabled: boolean) => void;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onActivity: () => void;
};

export function AgentCard({
  agent,
  categories,
  toggling,
  activityLoading,
  activityDays,
  counts,
  onToggle,
  onTest,
  onEdit,
  onDelete,
  onActivity,
}: AgentCardProps) {
  const headingId = `agent-${agent.id}`;
  return (
    <li className={`panel agent-card${agent.enabled ? "" : " agent-card-paused"}`} aria-labelledby={headingId}>
      <div className="agent-card-head">
        <h2 id={headingId} className="agent-card-name">
          {agent.name}
        </h2>
        {agent.enabled ? null : <Tag tone="warning">Pausado</Tag>}
        <Switch label={`Activar ${agent.name}`} hideLabel checked={agent.enabled} disabled={toggling} onChange={onToggle} />
      </div>
      <p className={`agent-card-instructions${agent.instructions ? "" : " agent-card-instructions-empty"}`}>
        {agent.instructions || "Sin instrucciones"}
      </p>
      <ul className="agent-scope-list" aria-label={`Reglas de ${agent.name}`}>
        {agent.scopes.map((scope) => (
          <li key={scope.id} className="agent-scope">
            {scopeLabel(scope, categories)}
          </li>
        ))}
      </ul>
      {activityLoading ? (
        <div className="skeleton agent-stats-skeleton" aria-hidden="true" />
      ) : counts && activityDays ? (
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
      <div className="agent-card-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onActivity} aria-label={`Ver actividad de ${agent.name}`}>
          Ver actividad
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onTest} aria-label={`Probar ${agent.name}`}>
          Probar
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit} aria-label={`Editar ${agent.name}`}>
          Editar
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDelete} aria-label={`Eliminar ${agent.name}`}>
          Eliminar
        </button>
      </div>
    </li>
  );
}
