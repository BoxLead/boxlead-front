import i18next from "i18next";
import { useTranslation } from "react-i18next";
import type { BillingPlan } from "../../api/types";
import { formatNumber } from "../../util/format";
import { nationalTaxesLegend, planPrice } from "../../util/planPrice";

function agentsText(agents: number | null | undefined): string | null {
  if (agents === null) return i18next.t("plans.agentsUnlimited", { ns: "auth" });
  if (!agents) return null;
  return i18next.t("plans.agents", { ns: "auth", count: agents, value: formatNumber(agents) });
}

function repliesText(plan: BillingPlan): string | null {
  const replies = plan.limits.AGENT_REPLIES_PER_PERIOD;
  if (replies === null) return i18next.t("plans.repliesUnlimited", { ns: "auth" });
  if (!replies || plan.frequencyMonths !== 1) return null;
  return i18next.t("plans.replies", { ns: "auth", value: formatNumber(replies) });
}

function limitsSummary(plan: BillingPlan): string | null {
  const parts = [agentsText(plan.limits.AGENTS_MAX), repliesText(plan)].filter(
    (part): part is string => part !== null,
  );
  if (parts.length === 0) return null;
  const text = parts.join(i18next.t("plans.and", { ns: "auth" }));
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export function PaidPlanDetails({ plan }: { plan: BillingPlan }) {
  const { t } = useTranslation("auth");
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
              {nationalTaxesLegend()} {price.withoutNationalTaxes}
            </span>
          ) : null}{" "}
          {price.reference ? (
            <span className="plan-option-fine">
              {t("plans.reference", { reference: price.reference })}
              {price.rateDay ? t("plans.rateDay", { day: price.rateDay }) : ""}.
            </span>
          ) : null}
        </>
      ) : null}{" "}
      {limits ? <span className="plan-option-limits">{limits}</span> : null}
    </>
  );
}
