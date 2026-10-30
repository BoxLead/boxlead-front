import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("metrics");
  const { statuses } = view.totals;
  return (
    <MetricsCard
      title={t("funnel.title")}
      meta={
        <dl className="funnel-meta">
          <div>
            <dt>{t("funnel.lost")}</dt>
            <dd>
              <AnimatedNumber value={statuses.LOST} format={formatNumber} />
            </dd>
          </div>
          <div>
            <dt>{t("funnel.notContacted")}</dt>
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
