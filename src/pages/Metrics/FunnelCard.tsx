import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { formatNumber } from "../../util/format";
import { funnelSteps } from "./funnel";
import { FunnelChart } from "./charts/FunnelChart";
import { MetricsCard } from "./MetricsCard";
import type { MetricsView } from "./metricsView";
import "./FunnelCard.css";

type FunnelCardProps = {
  view: MetricsView;
};

export function FunnelCard({ view }: FunnelCardProps) {
  const { statuses } = view.totals;
  return (
    <MetricsCard
      title="Embudo"
      meta={
        <dl className="funnel-meta">
          <div>
            <dt>Perdidos</dt>
            <dd>
              <AnimatedNumber value={statuses.LOST} format={formatNumber} />
            </dd>
          </div>
          <div>
            <dt>Sin contactar</dt>
            <dd>
              <AnimatedNumber value={statuses.NEW} format={formatNumber} />
            </dd>
          </div>
        </dl>
      }
    >
      <FunnelChart steps={funnelSteps(view.totals, view.previousTotals)} />
    </MetricsCard>
  );
}
