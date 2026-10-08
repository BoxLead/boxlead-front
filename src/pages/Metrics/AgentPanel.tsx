import { Link } from "react-router-dom";
import { formatNumber, formatPercent } from "../../util/format";
import { businessHoursLabel, HANDOFF_LABELS, HANDOFF_REASONS } from "../../util/metrics";
import { Meter } from "./charts/Meter";
import { handoffTotal, ratio } from "./metricsModel";
import { MetricsSection } from "./MetricsSection";
import type { MetricsView } from "./useMetricsView";
import "./AgentPanel.css";

type AgentPanelProps = {
  view: MetricsView;
  onEditSettings: () => void;
};

export function AgentPanel({ view, onEditSettings }: AgentPanelProps) {
  const { agent, outsideHours, agentReplies } = view.totals;
  const { manualReplyMinutes, businessHours } = view.settings;

  if (!agent) {
    return (
      <MetricsSection title="Agente de ventas">
        <p className="agent-empty">
          Cuando el agente empiece a responder vas a ver cuántas conversaciones resuelve sin ayuda, cuántas deriva y
          cuánto tiempo le ahorra a tu equipo.
        </p>
      </MetricsSection>
    );
  }

  const handed = handoffTotal(agent);
  const handled = agent.resolved + handed;
  const resolvedShare = ratio(agent.resolved, handled);
  const hours = (agentReplies * manualReplyMinutes) / 60;
  const outsideShare = outsideHours ? ratio(outsideHours.answeredUnder5m, outsideHours.conversations) : null;

  return (
    <MetricsSection
      title="Agente de ventas"
      takeaway={
        <>
          Le ahorró a tu equipo cerca de <strong>{formatNumber(hours)} horas</strong> de respuestas en este período.
        </>
      }
    >
      <dl className="agent-stats">
        <div className="agent-stat agent-stat-main">
          <dt>Resueltas sin ayuda</dt>
          <dd className="agent-stat-value">{formatPercent(resolvedShare)}</dd>
          <dd className="agent-stat-meter">
            <Meter value={resolvedShare} size="md" />
          </dd>
          <dd className="agent-stat-sub">
            {formatNumber(agent.resolved)} de {formatNumber(handled)} conversaciones
          </dd>
        </div>
        <div className="agent-stat">
          <dt>Respuestas enviadas</dt>
          <dd className="agent-stat-value">{formatNumber(agentReplies)}</dd>
          <dd className="agent-stat-sub">
            {formatPercent(ratio(agentReplies, agentReplies + view.totals.humanReplies))} de todos los mensajes
          </dd>
        </div>
        <div className="agent-stat">
          <dt>Horas ahorradas</dt>
          <dd className="agent-stat-value">≈ {formatNumber(hours)} h</dd>
          <dd className="agent-stat-sub">
            Con {manualReplyMinutes} min por respuesta.{" "}
            <button type="button" className="agent-link" onClick={onEditSettings}>
              Cambiar
            </button>
          </dd>
        </div>
        <div className="agent-stat">
          <dt>Fuera de horario</dt>
          <dd className="agent-stat-value">{outsideHours ? formatPercent(outsideShare) : "—"}</dd>
          <dd className="agent-stat-sub">
            {outsideHours ? (
              `Con respuesta en menos de 5 min, sobre ${formatNumber(outsideHours.conversations)} consultas`
            ) : (
              <button type="button" className="agent-link" onClick={onEditSettings}>
                Cargá tu horario
              </button>
            )}
          </dd>
        </div>
      </dl>

      <div className="agent-handoffs">
        <h3 className="agent-handoffs-title">Por qué derivó {formatNumber(handed)} conversaciones</h3>
        <ul>
          {HANDOFF_REASONS.map((reason) => (
            <li key={reason}>
              <div className="agent-handoff-head">
                <span>{HANDOFF_LABELS[reason]}</span>
                <strong>{formatNumber(agent.handoffs[reason])}</strong>
              </div>
              <Meter value={ratio(agent.handoffs[reason], handed)} />
            </li>
          ))}
        </ul>
        <p className="agent-note">
          Horario de atención {businessHoursLabel(businessHours).toLowerCase()}.{" "}
          <Link to="/app/inbox">Ver conversaciones</Link>
        </p>
      </div>
    </MetricsSection>
  );
}
