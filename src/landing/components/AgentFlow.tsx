import type { ReactNode } from "react";
import {
  HandoffIcon,
  MessageIcon,
  PipelineIcon,
  SparkIcon,
  TargetIcon,
} from "../icons/UiIcons";
import "./AgentFlow.css";

type Stage = {
  icon: ReactNode;
  title: string;
  description: string;
};

const stages: Stage[] = [
  {
    icon: <MessageIcon />,
    title: "Lee",
    description: "Entiende cada mensaje, en cualquier canal.",
  },
  {
    icon: <SparkIcon />,
    title: "Responde",
    description: "Contesta al instante, con la información de tu negocio.",
  },
  {
    icon: <TargetIcon />,
    title: "Califica",
    description: "Detecta quién está listo para comprar.",
  },
  {
    icon: <PipelineIcon />,
    title: "Ordena",
    description: "Suma el lead a tu pipeline, con su historial completo.",
  },
];

export function AgentFlow() {
  return (
    <section id="agente" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">El agente</span>
          <h2 className="landing-section-title">
            Lo que hace solo, con cada mensaje
          </h2>
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
                  <h3 className="agent-flow-title">{stage.title}</h3>
                  <p className="agent-flow-desc">{stage.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="agent-flow-handoff" data-reveal>
          <HandoffIcon width={18} height={18} />
          ¿Hace falta una persona? Te avisa y te deja el borrador listo.
        </p>
      </div>
    </section>
  );
}
