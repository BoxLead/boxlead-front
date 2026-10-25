import type { BillingPlan } from "../../api/types";
import { formatNumber } from "../../util/format";
import { NATIONAL_TAXES_LEGEND, planPrice } from "../../util/planPrice";

function agentsText(agents: number | null | undefined): string | null {
  if (agents === null) return "agentes sin tope";
  if (!agents) return null;
  return `hasta ${formatNumber(agents)} ${agents === 1 ? "agente" : "agentes"}`;
}

function repliesText(plan: BillingPlan): string | null {
  const replies = plan.limits.AGENT_REPLIES_PER_PERIOD;
  if (replies === null) return "respuestas sin tope";
  if (!replies || plan.frequencyMonths !== 1) return null;
  return `${formatNumber(replies)} respuestas por mes`;
}

function limitsSummary(plan: BillingPlan): string | null {
  const parts = [agentsText(plan.limits.AGENTS_MAX), repliesText(plan)].filter(
    (part): part is string => part !== null,
  );
  if (parts.length === 0) return null;
  const text = parts.join(" y ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export function PaidPlanDetails({ plan }: { plan: BillingPlan }) {
  const price = planPrice(plan);
  const limits = limitsSummary(plan);
  return (
    <>
      {price ? (
        <>
          <span className="plan-option-price">
            <span className="plan-option-amount">{price.amount}</span>{" "}
            {price.period ? <span className="plan-option-period">{price.period}</span> : null}
          </span>{" "}
          {price.withoutNationalTaxes ? (
            <span className="plan-option-fine">
              {NATIONAL_TAXES_LEGEND} {price.withoutNationalTaxes}
            </span>
          ) : null}{" "}
          {price.reference ? (
            <span className="plan-option-fine">
              Referencia {price.reference}. Se cobra en pesos al dólar oficial vendedor del Banco Nación
              {price.rateDay ? `, cotización del ${price.rateDay}` : ""}.
            </span>
          ) : null}
        </>
      ) : null}{" "}
      {limits ? <span className="plan-option-limits">{limits}</span> : null}
    </>
  );
}
