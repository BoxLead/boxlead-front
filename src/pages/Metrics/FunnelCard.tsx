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
            <span className="funnel-value">{formatNumber(step.value)}</span>
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
          <dd>{formatNumber(view.totals.statuses.LOST)}</dd>
        </div>
        <div>
          <dt>Sin contactar</dt>
          <dd>{formatNumber(view.totals.statuses.NEW)}</dd>
        </div>
      </dl>
    </MetricsCard>
  );
}
