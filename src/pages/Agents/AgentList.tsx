import type { AgentResponse, CategoryResponse } from "../../api/types";
import { agentStatusLabel, scopeLabel, type ActivityNumbers } from "../../util/agents";
import { cx } from "../../util/classNames";
import { formatNumber } from "../../util/format";

type AgentListProps = {
  agents: AgentResponse[];
  categories: CategoryResponse[] | undefined;
  selectedId: string | null;
  activityForId: (id: string) => ActivityNumbers | undefined;
  onSelect: (id: string) => void;
};

function repliedLabel(count: number): string {
  return count === 1 ? "1 respondido" : `${formatNumber(count)} respondidos`;
}

export function AgentList({ agents, categories, selectedId, activityForId, onSelect }: AgentListProps) {
  return (
    <ul className="agent-list" aria-label="Agentes">
      {agents.map((agent) => {
        const selected = agent.id === selectedId;
        const counts = activityForId(agent.id);
        return (
          <li key={agent.id}>
            <button
              type="button"
              className={cx("agent-row", selected && "agent-row-selected")}
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(agent.id)}
            >
              <span className="agent-row-identity">
                <span className="agent-row-name">{agent.name}</span>
                <span className="agent-row-status">
                  <span
                    className={cx("agent-status-dot", agent.enabled && !agent.overPlanLimit && "agent-status-dot-on")}
                    aria-hidden="true"
                  />
                  {agentStatusLabel(agent)}
                </span>
              </span>
              {agent.instructions ? null : <span className="agent-row-note">Sin instrucciones</span>}
              <span className="agent-row-scopes">
                {agent.scopes.map((scope) => (
                  <span key={scope.id} className="agent-row-scope">
                    {scopeLabel(scope, categories)}
                  </span>
                ))}
              </span>
              {counts ? <span className="agent-row-metric">{repliedLabel(counts.sent)}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
