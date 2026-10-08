import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { formatDuration, formatNumber, formatPercent } from "../../util/format";
import { answeredBuckets, estimateMedianSeconds, handoffTotal, ratio } from "./metricsModel";
import { MetricsCard } from "./MetricsCard";
import type { MetricsView } from "./metricsView";
import "./AttentionCard.css";

type AttentionCardProps = {
  view: MetricsView;
};

type Row = {
  label: string;
  value: string;
};

export function AttentionCard({ view }: AttentionCardProps) {
  const { firstResponse, agent, outsideHours, agentReplies } = view.totals;
  const handled = agent ? agent.resolved + handoffTotal(agent) : 0;
  const rows: Row[] = [];
  if (agent) rows.push({ label: "Agente", value: formatDuration(estimateMedianSeconds(firstResponse.agent)) });
  rows.push({ label: "Tu equipo", value: formatDuration(estimateMedianSeconds(firstResponse.human)) });
  if (outsideHours) {
    rows.push({
      label: "Fuera de horario",
      value: `${formatPercent(ratio(outsideHours.answeredUnder5m, outsideHours.conversations))} en 5 min`,
    });
  }
  if (agent) {
    rows.push({
      label: "Horas ahorradas",
      value: `≈ ${formatNumber((agentReplies * view.settings.manualReplyMinutes) / 60)} h`,
    });
  }

  return (
    <MetricsCard title="Atención">
      <div className="attention-headline">
        <div>
          <AnimatedNumber
            className="attention-big"
            value={estimateMedianSeconds(answeredBuckets(firstResponse))}
            format={formatDuration}
          />
          <span className="attention-caption">Primera respuesta</span>
        </div>
        {agent ? (
          <div>
            <AnimatedNumber className="attention-big" value={ratio(agent.resolved, handled)} format={formatPercent} />
            <span className="attention-caption">Resueltas por el agente</span>
          </div>
        ) : null}
      </div>
      <dl className="attention-rows">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </MetricsCard>
  );
}
