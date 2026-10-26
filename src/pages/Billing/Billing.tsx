import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { BillingPlan, BillingSummary, PaidPlanCode } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { CardIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../context/auth";
import { BILLING_SUMMARY_KEY } from "../../data/billing";
import { PLANS_PATH } from "../../data/plans";
import { cancelSubscription, changePlan } from "../../data/subscription";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { paidPlanCode } from "../../util/checkout";
import { SUPPORT_EMAIL } from "../../util/company";
import { planPrice } from "../../util/planPrice";
import { billingErrorMessage, PLAN_RANK, rateNote } from "./billingLabels";
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

function changeResult(summary: BillingSummary, target: string): string {
  if (summary.plan?.code === target) return `Ahora tenés ${summary.plan.name}.`;
  if (summary.subscription?.pendingPlanCode === target) {
    return `Pasás a ${PLAN_NAMES[summary.subscription.pendingPlanCode]} el ${longDate(summary.subscription.currentPeriodEnd)}.`;
  }
  return "Guardamos el cambio de plan.";
}

export function Billing() {
  useDocumentTitle("Facturación");

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
  const requested = paidPlanCode(searchParams.get("checkout"));
  const checkoutCode = buying ?? (requested && data && !data.subscription ? requested : null);
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
    const done = await run(() => changePlan(target), (result) => changeResult(result, target), "No pudimos cambiar el plan. Probá de nuevo.");
    if (done) setChange(null);
  }

  async function keepPlan() {
    if (!currentCode) return;
    await run(() => changePlan(currentCode), () => `Seguís en ${planName(currentCode)}.`, "No pudimos deshacer el cambio. Probá de nuevo.");
  }

  async function cancel() {
    const done = await run(
      cancelSubscription,
      (result) =>
        result.subscription
          ? `Diste de baja tu plan. Tenés acceso hasta el ${longDate(result.subscription.currentPeriodEnd)}.`
          : "Diste de baja tu plan.",
      "No pudimos dar de baja el plan. Probá de nuevo.",
    );
    if (done) setConfirmCancel(false);
  }

  const upgrade = change && currentCode ? PLAN_RANK[change.code] > PLAN_RANK[currentCode] : false;
  const changePrice = change ? planPrice(change.plan) : null;
  const changeLabel = changePrice ? `${changePrice.amount} ${changePrice.period}` : "el precio del plan nuevo";
  const changeNote = changePrice ? rateNote(changePrice.rateDay) : null;

  return (
    <div className="page billing-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Facturación</h1>
          <p className="page-header-desc">Tu plan, el uso del período, tus pagos y tus datos fiscales.</p>
        </div>
      </header>

      {summary.error && !data ? (
        <Banner
          tone="danger"
          title="No pudimos cargar tu plan"
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void summary.reload()}>
              Reintentar
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
          {data.checkout ? (
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

          <section className="billing-section" aria-labelledby="billing-plans-title">
            <h2 id="billing-plans-title" className="billing-section-title">
              Planes
            </h2>
            {plans.error && !plans.data ? (
              <Banner
                tone="danger"
                title="No pudimos cargar los planes"
                action={
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => void plans.reload()}>
                    Reintentar
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
                  title="No hay planes disponibles ahora"
                  hint={`Escribinos a ${SUPPORT_EMAIL} y te ayudamos a elegir.`}
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
        open={change !== null}
        title={`¿Pasar a ${change?.plan.name ?? "otro plan"}?`}
        confirmLabel={busy ? "Cambiando…" : `Pasar a ${change?.plan.name ?? "otro plan"}`}
        busy={busy}
        onConfirm={() => void confirmChange()}
        onCancel={() => setChange(null)}
      >
        {upgrade ? (
          <p>
            El cambio rige ahora. Desde la próxima cuota pagás {changeLabel}, sin cobros extra por lo que queda de este
            período.
          </p>
        ) : (
          <p>
            Seguís con {data?.plan?.name ?? "tu plan"} hasta el{" "}
            {data?.subscription ? longDate(data.subscription.currentPeriodEnd) : "fin del período"} y desde ahí pagás{" "}
            {changeLabel}. Si subiste de plan en este período, el cambio rige ahora.
          </p>
        )}
        {changeNote ? <p className="billing-confirm-note">Precio de hoy. {changeNote}.</p> : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmCancel}
        title="¿Dar de baja tu plan?"
        confirmLabel={busy ? "Dando de baja…" : "Dar de baja"}
        tone="danger"
        busy={busy}
        onConfirm={() => void cancel()}
        onCancel={() => setConfirmCancel(false)}
      >
        <p>
          No se te va a cobrar más. Seguís usando {data?.plan?.name ?? "tu plan"} hasta el{" "}
          {data?.subscription ? longDate(data.subscription.currentPeriodEnd) : "fin del período pagado"}. Después tus agentes dejan de
          responder.
        </p>
        <p>La baja no se puede deshacer. Para volver, contratás de nuevo cuando termine el período.</p>
      </ConfirmDialog>
    </div>
  );
}
