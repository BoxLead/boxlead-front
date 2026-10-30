import { useTranslation } from "react-i18next";
import type { ReferralStats } from "../../api/types";
import { formatNumber } from "../../util/format";

type ResellerStatsProps = {
  stats: ReferralStats;
};

export function ResellerStats({ stats }: ResellerStatsProps) {
  const { t } = useTranslation("billing");
  const items = [
    { label: t("reseller.clicks"), value: stats.clicksLast30Days },
    { label: t("reseller.registrations"), value: stats.registrations },
    { label: t("reseller.activeCustomers"), value: stats.activeCustomers },
  ];

  return (
    <dl className="reseller-stats" aria-label={t("reseller.summary")}>
      {items.map((item) => (
        <div key={item.label} className="panel reseller-stat">
          <dt>{item.label}</dt>
          <dd>{formatNumber(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
