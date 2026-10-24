import { useEffect, useRef, useState } from "react";
import type { AgentResponse, CategoryResponse } from "../../api/types";
import type { Choice } from "../../components/ui/ChoiceGroup";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { Switch } from "../../components/ui/Switch";
import type { PlaygroundTarget } from "../../data/agentPlayground";
import { AGENT_NAME_MAX, type ActivityNumbers } from "../../util/agents";
import { AgentActivity } from "./AgentActivity";
import { AgentForm, type AgentDraftSnapshot } from "./AgentForm";
import { Playground } from "./Playground";

export type AgentTab = "config" | "test" | "activity";

type AgentWorkspaceProps = {
  agent: AgentResponse | null;
  categories: CategoryResponse[] | undefined;
  tab: AgentTab;
  dirty: boolean;
  toggling: boolean;
  counts: ActivityNumbers | undefined;
  activityDays: number | undefined;
  onTabChange: (tab: AgentTab) => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (saved: AgentResponse, created: boolean) => void;
  onDiscardNew: () => void;
};

export function AgentWorkspace({
  agent,
  categories,
  tab,
  dirty,
  toggling,
  counts,
  activityDays,
  onTabChange,
  onToggle,
  onDelete,
  onBack,
  onDirtyChange,
  onSaved,
  onDiscardNew,
}: AgentWorkspaceProps) {
  const [snapshot, setSnapshot] = useState<AgentDraftSnapshot>({
    name: agent?.name ?? "",
    instructions: agent?.instructions ?? "",
  });
  const trimmed = snapshot.name.trim();
  const canTest = trimmed.length > 0 && snapshot.name.length <= AGENT_NAME_MAX;
  const shownTab = tab === "activity" && !agent ? "config" : tab === "test" && !canTest ? "config" : tab;
  const title = trimmed || agent?.name || "Nuevo agente";
  const target: PlaygroundTarget =
    agent && !dirty
      ? { agentId: agent.id }
      : { agent: { name: trimmed, instructions: snapshot.instructions.trim() } };

  const onTabChangeRef = useRef(onTabChange);
  useEffect(() => {
    onTabChangeRef.current = onTabChange;
  });
  useEffect(() => {
    if (tab === "test" && !canTest) onTabChangeRef.current("config");
    if (tab === "activity" && !agent) onTabChangeRef.current("config");
  }, [tab, canTest, agent]);

  const tabs: Choice<AgentTab>[] = [
    { value: "config", label: "Configuración" },
    { value: "test", label: "Probar", disabled: !canTest },
  ];
  if (agent) tabs.push({ value: "activity", label: "Actividad" });

  return (
    <section className="agent-workspace" aria-label="Detalle del agente">
      <header className="agent-workspace-head">
        <button type="button" className="btn btn-secondary btn-sm agent-back" onClick={onBack}>
          Volver
        </button>
        <div className="agent-workspace-identity">
          <div className="agent-workspace-title">
            <h2>{title}</h2>
            {agent ? (
              <span className="agent-row-status">
                <span className={`agent-status-dot${agent.enabled ? " agent-status-dot-on" : ""}`} aria-hidden="true" />
                {agent.enabled ? "Activo" : "Pausado"}
              </span>
            ) : null}
          </div>
          {agent ? (
            <div className="agent-workspace-tools">
              <Switch
                label={`Activar ${agent.name}`}
                checked={agent.enabled}
                disabled={toggling}
                onChange={onToggle}
              />
              <button type="button" className="btn btn-secondary btn-sm" aria-label={`Eliminar ${agent.name}`} onClick={onDelete}>
                Eliminar
              </button>
            </div>
          ) : null}
        </div>
        <ChoiceGroup label="Secciones del agente" variant="segmented" choices={tabs} value={shownTab} onChange={onTabChange} />
      </header>
      <div className="agent-workspace-body">
        <div className="agent-pane" hidden={shownTab !== "config"}>
          <AgentForm
            agent={agent}
            categories={categories}
            onSaved={onSaved}
            onDiscardNew={onDiscardNew}
            onDirtyChange={onDirtyChange}
            onSnapshot={(next) =>
              setSnapshot((current) =>
                current.name === next.name && current.instructions === next.instructions ? current : next,
              )
            }
          />
        </div>
        <div className="agent-pane" hidden={shownTab !== "test"}>
          <Playground key={agent && !dirty ? "saved" : "draft"} agentName={title} target={target} categories={categories} />
        </div>
        {shownTab === "activity" && agent ? (
          <div className="agent-pane">
            <AgentActivity agent={agent} categories={categories} counts={counts} activityDays={activityDays} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
