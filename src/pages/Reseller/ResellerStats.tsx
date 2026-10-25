import type { ReferralStats } from "../../api/types";
import { formatNumber } from "../../util/format";

type ResellerStatsProps = {
  stats: ReferralStats;
};

export function ResellerStats({ stats }: ResellerStatsProps) {
  const items = [
    { label: "Clics en 30 días", value: stats.clicksLast30Days },
    { label: "Registros", value: stats.registrations },
    { label: "Clientes activos", value: stats.activeCustomers },
  ];

  return (
    <dl className="reseller-stats" aria-label="Resumen">
      {items.map((item) => (
        <div key={item.label} className="panel reseller-stat">
          <dt>{item.label}</dt>
          <dd>{formatNumber(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
