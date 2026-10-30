import i18next, { type TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import type { BillingPlan, BillingSummary, PaidPlanCode } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { CardIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../context/auth";
import { BILLING_SUMMARY_KEY, isTeamPlan } from "../../data/billing";
import { invalidateQueries } from "../../data/queryCache";
import { PLANS_PATH } from "../../data/plans";
import { cancelSubscription, changePlan } from "../../data/subscription";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { paidPlanCode } from "../../util/checkout";
import { SUPPORT_EMAIL } from "../../util/company";
import { planPrice } from "../../util/planPrice";
import { billingErrorMessage, cancelRequested, PLAN_RANK, rateNote } from "./billingLabels";
import { CheckoutDialog } from "./CheckoutDialog";
import { CheckoutNotice } from "./CheckoutNotice";
import { CurrentPlan } from "./CurrentPlan";
import { longDate } from "./dates";
import { Payments } from "./Payments";
import { PlanList } from "./PlanList";
import { ProfileSection } from "./ProfileSection";
import "./Billing.css";

const PLAN_NAMES: Record<PaidPlanCode, string> = { STARTER: "Starter", BUSINESS: "Business" };

type Change = { plan: BillingPlan; code: PaidPlanCode };

function changeResult(t: TFunction<"billing">, summary: BillingSummary, target: string): string {
  if (summary.plan?.code === target) return t("change.now", { plan: summary.plan.name });
  if (summary.subscription?.pendingPlanCode === target) {
    return t("change.pending", {
      plan: PLAN_NAMES[summary.subscription.pendingPlanCode],
      date: longDate(summary.subscription.currentPeriodEnd),
    });
  }
  return t("change.saved");
}

export function Billing() {
  const { t } = useTranslation("billing");
  useDocumentTitle(t("title"));

  const toast = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const summary = useApiQuery<BillingSummary>(BILLING_SUMMARY_KEY);
  const plans = useApiQuery<BillingPlan[]>(PLANS_PATH);
  const [buying, setBuying] = useState<PaidPlanCode | null>(null);
  const [change, setChange] = useState<Change | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  const data = summary.data;
  const planList = plans.data ?? [];
  const planName = (code: PaidPlanCode) => planList.find((plan) => plan.code === code)?.name ?? PLAN_NAMES[code];
  const team = isTeamPlan(data);
  const requested = paidPlanCode(searchParams.get("checkout"));
  const checkoutCode = team ? null : (buying ?? (requested && data && !data.subscription ? requested : null));
  const checkoutPlan = checkoutCode ? planList.find((plan) => plan.code === checkoutCode && !plan.contactOnly) : undefined;
  const currentCode = data?.plan?.source === "SUBSCRIPTION" ? paidPlanCode(data.plan.code) : null;

  function closeCheckout() {
    setBuying(null);
    if (!searchParams.has("checkout")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    setSearchParams(next, { replace: true });
  }

  async function run(action: () => Promise<BillingSummary>, success: (result: BillingSummary) => string, fallback: string) {
    setBusy(true);
    try {
      const result = await action();
      toast({ message: success(result) });
      return true;
    } catch (error) {
      toast({ tone: "danger", message: billingErrorMessage(error, fallback) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmChange() {
    if (!change) return;
    const target = change.code;
    const done = await run(() => changePlan(target), (result) => changeResult(t, result, target), t("change.failed"));
    if (done) setChange(null);
  }

  async function keepPlan() {
    if (!currentCode) return;
    await run(() => changePlan(currentCode), () => t("change.kept", { plan: planName(currentCode) }), t("change.keepFailed"));
  }

  async function cancel() {
    setBusy(true);
    try {
      const result = await cancelSubscription();
      toast({
        message: result.subscription?.cancelAtPeriodEnd
          ? team
            ? t("cancelPlan.teamDone", { date: longDate(result.subscription.currentPeriodEnd) })
            : t("cancelPlan.done", { date: longDate(result.subscription.currentPeriodEnd) })
          : cancelRequested(),
      });
      setConfirmCancel(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 502) {
        toast({ message: cancelRequested() });
        setConfirmCancel(false);
        void invalidateQueries(BILLING_SUMMARY_KEY);
      } else {
        toast({ tone: "danger", message: billingErrorMessage(error, t("cancelPlan.failed")) });
      }
    } finally {
      setBusy(false);
    }
  }

  const upgrade = change && currentCode ? PLAN_RANK[change.code] > PLAN_RANK[currentCode] : false;
  const changePrice = change ? planPrice(change.plan) : null;
  const changeLabel = changePrice ? `${changePrice.amount} ${changePrice.period}` : t("change.newPlanPrice");
  const changeNote = changePrice ? rateNote(changePrice.rateDay) : null;

  return (
    <div className="page billing-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-header-desc">{t("description")}</p>
        </div>
      </header>

      {summary.error && !data ? (
        <Banner
          tone="danger"
          title={t("loadFailed")}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void summary.reload()}>
              {t("retry")}
            </button>
          }
        >
          {summary.error}
        </Banner>
      ) : !data ? (
        <div className="billing-layout" aria-hidden="true">
          <div className="panel skeleton billing-card-skeleton" />
          <div className="billing-plan-skeletons">
            {[0, 1, 2].map((index) => (
              <div key={index} className="panel skeleton billing-plan-skeleton" />
            ))}
          </div>
        </div>
      ) : (
        <div className="billing-layout">
          {data.checkout && !team ? (
            <CheckoutNotice
              checkout={data.checkout}
              planName={planName(data.checkout.planCode)}
              onResume={() => setBuying(data.checkout?.planCode ?? null)}
            />
          ) : null}

          <CurrentPlan
            summary={data}
            planName={planName}
            busy={busy}
            onCancel={() => setConfirmCancel(true)}
            onKeep={() => void keepPlan()}
          />

          {team ? null : (
            <section className="billing-section" aria-labelledby="billing-plans-title">
              <h2 id="billing-plans-title" className="billing-section-title">
                {t("plans.title")}
              </h2>
              {plans.error && !plans.data ? (
                <Banner
                  tone="danger"
                  title={t("plans.loadFailed")}
                  action={
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void plans.reload()}>
                      {t("retry")}
                    </button>
                  }
                >
                  {plans.error}
                </Banner>
              ) : !plans.data ? (
                <div className="billing-plan-skeletons" aria-hidden="true">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="panel skeleton billing-plan-skeleton" />
                  ))}
                </div>
              ) : planList.filter((plan) => !plan.inviteOnly).length === 0 ? (
                <div className="panel">
                  <EmptyState
                    icon={<CardIcon />}
                    title={t("plans.empty")}
                    hint={t("plans.emptyHint", { email: SUPPORT_EMAIL })}
                  />
                </div>
              ) : (
                <PlanList
                  plans={planList}
                  summary={data}
                  busy={busy}
                  onBuy={(plan) => setBuying(paidPlanCode(plan.code))}
                  onChange={(plan) => {
                    const code = paidPlanCode(plan.code);
                    if (code) setChange({ plan, code });
                  }}
                />
              )}
            </section>
          )}

          <Payments />

          <ProfileSection complete={data.billingProfileComplete} defaultEmail={user?.email ?? ""} />
        </div>
      )}

      {checkoutCode && checkoutPlan && data ? (
        <CheckoutDialog
          key={checkoutCode}
          plan={checkoutPlan}
          planCode={checkoutCode}
          profileComplete={data.billingProfileComplete}
          userEmail={user?.email ?? ""}
          onClose={closeCheckout}
        />
      ) : null}

      <ConfirmDialog
        cancelLabel={i18next.t("ui.cancel", { ns: "shell" })}
        open={change !== null}
        title={t("change.title", { plan: change?.plan.name ?? t("change.otherPlan") })}
        confirmLabel={busy ? t("change.busy") : t("change.confirm", { plan: change?.plan.name ?? t("change.otherPlan") })}
        busy={busy}
        onConfirm={() => void confirmChange()}
        onCancel={() => setChange(null)}
      >
        {upgrade ? (
          <p>{t("change.upgrade", { price: changeLabel })}</p>
        ) : (
          <p>
            {t("change.downgrade", {
              plan: data?.plan?.name ?? t("yourPlan"),
              date: data?.subscription ? longDate(data.subscription.currentPeriodEnd) : t("change.periodEnd"),
              price: changeLabel,
            })}
          </p>
        )}
        {changeNote ? <p className="billing-confirm-note">{t("change.todayPrice", { note: changeNote })}</p> : null}
      </ConfirmDialog>

      <ConfirmDialog
        cancelLabel={i18next.t("ui.cancel", { ns: "shell" })}
        open={confirmCancel}
        title={team ? t("cancelPlan.teamTitle") : t("cancelPlan.title")}
        confirmLabel={busy ? t("cancelPlan.busy") : t("cancelPlan.confirm")}
        tone="danger"
        busy={busy}
        onConfirm={() => void cancel()}
        onCancel={() => setConfirmCancel(false)}
      >
        {team ? (
          <p>
            {t("cancelPlan.team", {
              date: data?.subscription ? longDate(data.subscription.currentPeriodEnd) : t("cancelPlan.paidPeriodEnd"),
            })}
          </p>
        ) : (
          <p>
            {t("cancelPlan.text", {
              plan: data?.plan?.name ?? t("yourPlan"),
              date: data?.subscription ? longDate(data.subscription.currentPeriodEnd) : t("cancelPlan.paidPeriodEnd"),
            })}
          </p>
        )}
        <p>{t("cancelPlan.final")}</p>
      </ConfirmDialog>
    </div>
  );
}
