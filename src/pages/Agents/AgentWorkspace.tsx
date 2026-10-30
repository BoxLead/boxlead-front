import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AgentResponse, CategoryResponse } from "../../api/types";
import type { Choice } from "../../components/ui/ChoiceGroup";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { Switch } from "../../components/ui/Switch";
import type { PlaygroundTarget } from "../../data/agentPlayground";
import { AGENT_NAME_MAX, agentStatusLabel, type ActivityNumbers } from "../../util/agents";
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
  restricted?: boolean;
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
  restricted = false,
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
  const { t } = useTranslation("agents");
  const [snapshot, setSnapshot] = useState<AgentDraftSnapshot>({
    name: agent?.name ?? "",
    instructions: agent?.instructions ?? "",
  });
  const trimmed = snapshot.name.trim();
  const canTest = trimmed.length > 0 && snapshot.name.length <= AGENT_NAME_MAX;
  const shownTab = tab === "activity" && !agent ? "config" : tab === "test" && !canTest ? "config" : tab;
  const title = trimmed || agent?.name || t("workspace.newAgent");
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
    { value: "config", label: t("workspace.tabConfig") },
    { value: "test", label: t("workspace.tabTest"), disabled: !canTest },
  ];
  if (agent) tabs.push({ value: "activity", label: t("workspace.tabActivity") });

  return (
    <section className="agent-workspace" aria-label={t("workspace.label")}>
      <header className="agent-workspace-head">
        <button type="button" className="btn btn-secondary btn-sm agent-back" onClick={onBack}>
          {t("workspace.back")}
        </button>
        <div className="agent-workspace-identity">
          <div className="agent-workspace-title">
            <h2>{title}</h2>
            {agent ? (
              <span className="agent-row-status">
                <span className={`agent-status-dot${agent.enabled && !agent.overPlanLimit ? " agent-status-dot-on" : ""}`} aria-hidden="true" />
                {agentStatusLabel(agent)}
              </span>
            ) : null}
          </div>
          {agent ? (
            <div className="agent-workspace-tools">
              <Switch
                label={t("workspace.enable", { name: agent.name })}
                checked={agent.enabled}
                disabled={toggling || (restricted && !agent.enabled)}
                onChange={onToggle}
              />
              <button type="button" className="btn btn-secondary btn-sm" aria-label={t("workspace.deleteLabel", { name: agent.name })} onClick={onDelete}>
                {t("workspace.delete")}
              </button>
            </div>
          ) : null}
        </div>
        <ChoiceGroup label={t("workspace.tabsLabel")} variant="segmented" choices={tabs} value={shownTab} onChange={onTabChange} />
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
          <Playground
            key={agent && !dirty ? "saved" : "draft"}
            agentName={title}
            target={target}
            categories={categories}
            restricted={restricted}
          />
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
