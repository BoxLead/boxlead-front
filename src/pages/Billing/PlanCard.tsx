import type { ReactNode } from "react";
import type { BillingPlan } from "../../api/types";
import { Tag } from "../../components/ui/Tag";
import { cx } from "../../util/classNames";
import { SUPPORT_EMAIL } from "../../util/company";
import { formatNumber } from "../../util/format";
import { planPrice } from "../../util/planPrice";
import { PlanPriceBlock } from "./PlanPriceBlock";

type PlanCardProps = {
  plan: BillingPlan;
  current: boolean;
  badge?: string;
  hint?: string;
  action: ReactNode;
};

function limitLines(plan: BillingPlan): string[] {
  const { AGENTS_MAX, AGENT_REPLIES_PER_PERIOD, METRICS_HISTORY_DAYS } = plan.limits;
  const lines: string[] = [];
  if (AGENTS_MAX !== undefined) lines.push(AGENTS_MAX === null ? "Agentes sin límite" : `Hasta ${formatNumber(AGENTS_MAX)} agentes`);
  if (AGENT_REPLIES_PER_PERIOD !== undefined) {
    lines.push(
      AGENT_REPLIES_PER_PERIOD === null
        ? "Respuestas de agentes sin límite"
        : `${formatNumber(AGENT_REPLIES_PER_PERIOD)} respuestas de agentes por mes`,
    );
  }
  if (METRICS_HISTORY_DAYS !== undefined && METRICS_HISTORY_DAYS !== null) {
    lines.push(`Métricas de los últimos ${formatNumber(METRICS_HISTORY_DAYS)} días`);
  }
  return lines;
}

export function PlanCard({ plan, current, badge, hint, action }: PlanCardProps) {
  const price = planPrice(plan);
  const lines = limitLines(plan);

  return (
    <li className={cx("panel plan-card", current && "plan-card-current")}>
      <div className="plan-card-head">
        <h3 className="plan-card-name">
          {plan.name}
        </h3>
        {badge ? <Tag tone="accent">{badge}</Tag> : null}
      </div>
      {price ? (
        <PlanPriceBlock price={price} includesVat={plan.priceIncludesVat === true} />
      ) : plan.contactOnly ? (
        <div className="plan-price">
          <p className="plan-price-charge">
            <strong>A medida</strong>
          </p>
          <p className="plan-price-note">Lo armamos con vos. Escribinos a {SUPPORT_EMAIL}.</p>
        </div>
      ) : null}
      {lines.length > 0 ? (
        <ul className="plan-card-limits">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <div className="plan-card-action">
        {action}
        {hint ? <p className="plan-card-hint">{hint}</p> : null}
      </div>
    </li>
  );
}

