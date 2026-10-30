import type { TFunction } from "i18next";
import { Trans, useTranslation } from "react-i18next";
import type { BillingSummary, PaidPlanCode, SubscriptionSummary } from "../../api/types";
import { Tag } from "../../components/ui/Tag";
import { currentPlan } from "../../data/billing";
import { isCheckoutUrl } from "../../util/checkout";
import { formatNumber } from "../../util/format";
import { formatMinor } from "../../util/planPrice";
import { subscriptionStatus } from "./billingLabels";
import { longDate } from "./dates";

function teamChargeNote(t: TFunction<"billing">, subscription: SubscriptionSummary): string {
  if (subscription.cancelAtPeriodEnd) return t("current.teamCanceled", { date: longDate(subscription.currentPeriodEnd) });
  if (subscription.status === "PAUSED") return t("current.teamPaused");
  return t("current.teamCharged");
}

type CurrentPlanProps = {
  summary: BillingSummary;
  planName: (code: PaidPlanCode) => string;
  busy: boolean;
  onCancel: () => void;
  onKeep: () => void;
};

function usageLabel(t: TFunction<"billing">, used: number, limit: number | null): string {
  if (limit === null) return t("current.usageUnlimited", { used: formatNumber(used) });
  return t("current.usage", { used: formatNumber(used), limit: formatNumber(limit) });
}

function usageRatio(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0;
  return Math.min(1, used / limit);
}

export function CurrentPlan({ summary, planName, busy, onCancel, onKeep }: CurrentPlanProps) {
  const { t } = useTranslation("billing");
  const { usage, limits } = summary;
  const plan = currentPlan(summary);
  const team = plan?.source === "TEAM";
  const subscription = summary.subscription;
  const demo = team ? null : summary.demo;
  const status = subscription ? subscriptionStatus(subscription.status) : null;
  const canCancel =
    subscription !== null &&
    (subscription.status === "ACTIVE" || subscription.status === "PAST_DUE") &&
    !subscription.cancelAtPeriodEnd;
  const paymentUrl =
    subscription?.updatePaymentUrl && isCheckoutUrl(subscription.updatePaymentUrl) ? subscription.updatePaymentUrl : null;
  const ratio = usageRatio(usage.agentReplies.used, usage.agentReplies.limit);

  return (
    <section className="panel billing-card" aria-labelledby="billing-current-title">
      <h2 id="billing-current-title" className="panel-title">
        {t("current.title")}
      </h2>

      {team ? (
        <div className="billing-current-head">
          <p className="billing-current-name">{t("current.team")}</p>
          <Tag tone="accent">{t("current.free")}</Tag>
        </div>
      ) : plan ? (
        <div className="billing-current-head">
          <p className="billing-current-name">{plan.name ?? t("current.title")}</p>
          {status ? <Tag tone={status.tone}>{status.label}</Tag> : null}
          {plan.source === "DEMO" ? <Tag tone="accent">{t("current.demo")}</Tag> : null}
        </div>
      ) : (
        <div className="billing-current-head">
          <p className="billing-current-name">{t("current.none")}</p>
        </div>
      )}

      <div className="billing-current-lines">
        {!plan ? <p>{t("current.choose")}</p> : null}
        {team ? (
          <p>{t("current.teamText")}</p>
        ) : null}
        {team && subscription && status ? (
          <p>
            <Trans
              t={t}
              i18nKey="current.teamOwnPlan"
              values={{ status: status.label, note: teamChargeNote(t, subscription) }}
              components={{ strong: <strong /> }}
            />
          </p>
        ) : null}
        {demo ? <p>{t("current.demoEnds", { date: longDate(demo.endsAt) })}</p> : null}
        {subscription && !subscription.cancelAtPeriodEnd && subscription.status === "ACTIVE" ? (
          <p>
            <Trans
              t={t}
              i18nKey="current.nextCharge"
              values={{ amount: formatMinor(subscription.price), date: longDate(subscription.currentPeriodEnd) }}
              components={{ strong: <strong /> }}
            />
          </p>
        ) : null}
        {subscription?.cancelAtPeriodEnd && !team ? (
          <p>{t("current.canceled", { date: longDate(subscription.currentPeriodEnd) })}</p>
        ) : null}
        {subscription?.status === "PAST_DUE" ? (
          <p>
            {subscription.graceUntil && !team
              ? t("current.pastDueGrace", { date: longDate(subscription.graceUntil) })
              : t("current.pastDue")}
          </p>
        ) : null}
        {summary.access === "RESTRICTED" && (subscription?.status === "SUSPENDED" || subscription?.status === "PAUSED") ? (
          <p>{t("current.restricted")}</p>
        ) : null}
        {subscription?.pendingPlanCode ? (
          <p>
            {t("change.pending", { plan: planName(subscription.pendingPlanCode), date: longDate(subscription.currentPeriodEnd) })}
          </p>
        ) : null}
      </div>

      {plan ? (
        <div className="billing-usage">
          <div className="billing-usage-head">
            <span>{t("current.replies")}</span>
            <span>{usageLabel(t, usage.agentReplies.used, usage.agentReplies.limit)}</span>
          </div>
          {usage.agentReplies.limit !== null && usage.agentReplies.limit > 0 ? (
            <meter
              className="billing-meter"
              min={0}
              max={1}
              low={0.8}
              high={0.95}
              optimum={0}
              value={ratio}
              aria-label={t("current.meter")}
            />
          ) : null}
          <p className="billing-usage-hint">{t("current.resets", { date: longDate(usage.periodEnd) })}</p>
          {limits.AGENTS_MAX !== undefined || limits.METRICS_HISTORY_DAYS !== undefined ? (
            <ul className="billing-limits">
              {limits.AGENTS_MAX !== undefined ? (
                <li>
                  {limits.AGENTS_MAX === null
                    ? t("limits.agentsUnlimited")
                    : t("limits.agents", { count: limits.AGENTS_MAX, value: limits.AGENTS_MAX })}
                </li>
              ) : null}
              {limits.METRICS_HISTORY_DAYS !== undefined && limits.METRICS_HISTORY_DAYS !== null ? (
                <li>{t("limits.metrics", { count: limits.METRICS_HISTORY_DAYS, value: limits.METRICS_HISTORY_DAYS })}</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {paymentUrl || canCancel || (subscription?.pendingPlanCode && !team) ? (
        <div className="billing-card-actions">
          {paymentUrl ? (
            <a className="btn btn-primary btn-sm" href={paymentUrl} rel="noopener noreferrer">
              {t("current.updatePayment")}
            </a>
          ) : null}
          {subscription?.pendingPlanCode && plan && !team ? (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onKeep}>
              {t("current.keep", { plan: plan.name ?? t("yourPlan") })}
            </button>
          ) : null}
          {canCancel ? (
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={onCancel}>
              {t("cancelPlan.confirm")}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
