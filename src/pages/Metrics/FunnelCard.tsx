import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { formatNumber, formatPercent } from "../../util/format";
import { Meter } from "./charts/Meter";
import { funnelSteps } from "./metricsModel";
import { MetricsCard } from "./MetricsCard";
import type { MetricsView } from "./useMetricsView";
import "./FunnelCard.css";

type FunnelCardProps = {
  view: MetricsView;
};

export function FunnelCard({ view }: FunnelCardProps) {
  const steps = funnelSteps(view.totals);
  return (
    <MetricsCard title="Embudo" meta="Leads del período">
      <ol className="funnel-list">
        {steps.map((step) => (
          <li key={step.key} className="funnel-row">
            <span className="funnel-label">{step.label}</span>
            <AnimatedNumber className="funnel-value" value={step.value} format={formatNumber} />
            <span className="funnel-rate">{step.fromPrevious === null ? "" : formatPercent(step.fromPrevious)}</span>
            <span className="funnel-bar">
              <Meter value={step.fromStart} size="md" />
            </span>
          </li>
        ))}
      </ol>
      <dl className="funnel-foot">
        <div>
          <dt>Perdidos</dt>
          <dd>
            <AnimatedNumber value={view.totals.statuses.LOST} format={formatNumber} />
          </dd>
        </div>
        <div>
          <dt>Sin contactar</dt>
          <dd>
            <AnimatedNumber value={view.totals.statuses.NEW} format={formatNumber} />
          </dd>
        </div>
      </dl>
    </MetricsCard>
  );
}
