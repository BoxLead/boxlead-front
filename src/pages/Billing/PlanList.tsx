import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { BillingPlan, BillingSummary, PaidPlanCode } from "../../api/types";
import { paidPlanCode } from "../../util/checkout";
import { ENTERPRISE_CONTACT } from "./billingLabels";
import { longDate } from "./dates";
import { PlanCard } from "./PlanCard";

type PlanListProps = {
  plans: BillingPlan[];
  summary: BillingSummary;
  busy: boolean;
  onBuy: (plan: BillingPlan) => void;
  onChange: (plan: BillingPlan) => void;
};

type CardState = {
  badge?: string;
  hint?: string;
  action: ReactNode;
};

function cardState(t: TFunction<"billing">, plan: BillingPlan, { summary, busy, onBuy, onChange }: PlanListProps): CardState {
  if (summary.plan?.source === "TEAM") return { action: null };
  if (plan.contactOnly) {
    return {
      action: (
        <a className="btn btn-secondary" href={ENTERPRISE_CONTACT}>
          {t("plans.contact")}
        </a>
      ),
    };
  }
  const code = paidPlanCode(plan.code);
  const { subscription, checkout } = summary;
  const currentCode: PaidPlanCode | null = summary.plan?.source === "SUBSCRIPTION" ? paidPlanCode(summary.plan.code) : null;

  if (!subscription || !currentCode) {
    const resuming = checkout?.planCode === code;
    return {
      action: (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onBuy(plan)}>
          {resuming ? t("plans.resume") : t("plans.buy", { plan: plan.name })}
        </button>
      ),
    };
  }

  if (code === currentCode) {
    return { badge: t("plans.current"), action: null };
  }
  if (code === subscription.pendingPlanCode) {
    return { badge: t("plans.from", { date: longDate(subscription.currentPeriodEnd) }), action: null };
  }

  const hint = subscription.cancelAtPeriodEnd
    ? t("plans.rebuyAfter", { date: longDate(subscription.currentPeriodEnd) })
    : subscription.status !== "ACTIVE"
      ? t("plans.settleFirst")
      : undefined;
  return {
    hint,
    action: (
      <button
        type="button"
        className="btn btn-secondary"
        disabled={busy || hint !== undefined}
        onClick={() => onChange(plan)}
      >
        {t("plans.switchTo", { plan: plan.name })}
      </button>
    ),
  };
}

export function PlanList(props: PlanListProps) {
  const { t } = useTranslation("billing");
  const { plans, summary } = props;
  const visible = plans.filter((plan) => !plan.inviteOnly);
  const currentCode = summary.plan?.code;

  return (
    <ul className="plan-list" aria-label={t("plans.title")}>
      {visible.map((plan) => {
        const state = cardState(t, plan, props);
        return (
          <PlanCard
            key={plan.code}
            plan={plan}
            current={plan.code === currentCode}
            badge={state.badge}
            hint={state.hint}
            action={state.action}
          />
        );
      })}
    </ul>
  );
}
