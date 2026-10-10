import type { AgentResponse, CategoryResponse } from "../../api/types";
import { Switch } from "../../components/ui/Switch";
import { Tag } from "../../components/ui/Tag";
import { scopeLabel } from "../../util/agents";

type AgentCardProps = {
  agent: AgentResponse;
  categories: CategoryResponse[] | undefined;
  toggling: boolean;
  onToggle: (enabled: boolean) => void;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function AgentCard({ agent, categories, toggling, onToggle, onTest, onEdit, onDelete }: AgentCardProps) {
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
      <div className="agent-card-actions">
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
