import type { ReactNode } from "react";
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

function cardState(plan: BillingPlan, { summary, busy, onBuy, onChange }: PlanListProps): CardState {
  if (summary.plan?.source === "TEAM") return { action: null };
  if (plan.contactOnly) {
    return {
      action: (
        <a className="btn btn-secondary" href={ENTERPRISE_CONTACT}>
          Escribinos
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
          {resuming ? "Retomar el pago" : `Contratar ${plan.name}`}
        </button>
      ),
    };
  }

  if (code === currentCode) {
    return { badge: "Tu plan", action: null };
  }
  if (code === subscription.pendingPlanCode) {
    return { badge: `Desde el ${longDate(subscription.currentPeriodEnd)}`, action: null };
  }

  const hint = subscription.cancelAtPeriodEnd
    ? `Podés volver a contratar después del ${longDate(subscription.currentPeriodEnd)}.`
    : subscription.status !== "ACTIVE"
      ? "Regularizá el pago para cambiar de plan."
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
        Cambiar a {plan.name}
      </button>
    ),
  };
}

export function PlanList(props: PlanListProps) {
  const { plans, summary } = props;
  const visible = plans.filter((plan) => !plan.inviteOnly);
  const currentCode = summary.plan?.code;

  return (
    <ul className="plan-list" aria-label="Planes">
      {visible.map((plan) => {
        const state = cardState(plan, props);
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
