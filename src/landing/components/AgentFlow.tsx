import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  HandoffIcon,
  MessageIcon,
  PipelineIcon,
  SparkIcon,
  TargetIcon,
} from "../../components/icons/UiIcons";
import "./AgentFlow.css";

const ICONS: ReactNode[] = [<MessageIcon key="read" />, <SparkIcon key="reply" />, <TargetIcon key="qualify" />, <PipelineIcon key="organize" />];

export function AgentFlow() {
  const { t } = useTranslation("landing");
  const stages = t("agentFlow.stages", { returnObjects: true }).map((stage, index) => ({ ...stage, icon: ICONS[index] }));
  return (
    <section id="agente" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">{t("agentFlow.label")}</span>
          <h2 className="landing-section-title">{t("agentFlow.title")}</h2>
        </div>

        <div className="agent-flow-wrap">
          <span className="agent-flow-line" aria-hidden="true" />
          <ol className="agent-flow">
            {stages.map((stage, index) => (
              <li
                className="agent-flow-stage"
                key={stage.title}
                data-reveal={index}
              >
                <span className="landing-icon-tile agent-flow-icon">
                  {stage.icon}
                </span>
                <div>
                  <span className="agent-flow-index" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <h3 className="agent-flow-title">{stage.title}</h3>
                  <p className="agent-flow-desc">{stage.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="agent-flow-handoff" data-reveal>
          <HandoffIcon width={18} height={18} />
          {t("agentFlow.handoff")}
        </p>
      </div>
    </section>
  );
}
