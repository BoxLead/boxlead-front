import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("metrics");
  const { firstResponse, agent, outsideHours, agentReplies } = view.totals;
  const handled = agent ? agent.resolved + handoffTotal(agent) : 0;
  const rows: Row[] = [];
  if (agent) rows.push({ label: t("attention.agent"), value: formatDuration(estimateMedianSeconds(firstResponse.agent)) });
  rows.push({ label: t("attention.team"), value: formatDuration(estimateMedianSeconds(firstResponse.human)) });
  if (outsideHours) {
    rows.push({
      label: t("attention.outsideHours"),
      value: t("attention.outsideHoursValue", {
        share: formatPercent(ratio(outsideHours.answeredUnder5m, outsideHours.conversations)),
      }),
    });
  }
  if (agent) {
    rows.push({
      label: t("attention.hoursSaved"),
      value: t("attention.hoursSavedValue", { value: formatNumber((agentReplies * view.settings.manualReplyMinutes) / 60) }),
    });
  }

  return (
    <MetricsCard title={t("attention.title")}>
      <div className="attention-headline">
        <div>
          <AnimatedNumber
            className="attention-big"
            value={estimateMedianSeconds(answeredBuckets(firstResponse))}
            format={formatDuration}
          />
          <span className="attention-caption">{t("attention.firstResponse")}</span>
        </div>
        {agent ? (
          <div>
            <AnimatedNumber className="attention-big" value={ratio(agent.resolved, handled)} format={formatPercent} />
            <span className="attention-caption">{t("attention.resolved")}</span>
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
