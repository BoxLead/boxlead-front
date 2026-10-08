import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { formatDuration, formatNumber, formatPercent } from "../../util/format";
import { estimateMedianSeconds, handoffTotal, ratio } from "./metricsModel";
import { MetricsCard } from "./MetricsCard";
import type { MetricsView } from "./useMetricsView";
import "./AttentionCard.css";

type AttentionCardProps = {
  view: MetricsView;
};

export function AttentionCard({ view }: AttentionCardProps) {
  const { firstResponse, agent, outsideHours, agentReplies } = view.totals;
  const handed = handoffTotal(agent);
  const handled = agent ? agent.resolved + handed : 0;
  const hours = (agentReplies * view.settings.manualReplyMinutes) / 60;
  const rows: [string, string][] = [
    ...(agent ? ([["Agente", formatDuration(estimateMedianSeconds(firstResponse.agent))]] as [string, string][]) : []),
    ["Tu equipo", formatDuration(estimateMedianSeconds(firstResponse.human))],
    ...(outsideHours
      ? ([
          ["Fuera de horario", `${formatPercent(ratio(outsideHours.answeredUnder5m, outsideHours.conversations))} en 5 min`],
        ] as [string, string][])
      : []),
    ...(agent ? ([["Horas ahorradas", `≈ ${formatNumber(hours)} h`]] as [string, string][]) : []),
  ];

  return (
    <MetricsCard title="Atención">
      <div className="attention-headline">
        <div>
          <AnimatedNumber className="attention-big" value={view.rates.medianSeconds} format={formatDuration} />
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
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </MetricsCard>
  );
}
