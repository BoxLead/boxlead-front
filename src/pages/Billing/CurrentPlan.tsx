import type { BillingSummary, PaidPlanCode, SubscriptionSummary } from "../../api/types";
import { Tag } from "../../components/ui/Tag";
import { currentPlan } from "../../data/billing";
import { isCheckoutUrl } from "../../util/checkout";
import { formatNumber } from "../../util/format";
import { formatMinor } from "../../util/planPrice";
import { SUBSCRIPTION_STATUS } from "./billingLabels";
import { longDate } from "./dates";

function teamChargeNote(subscription: SubscriptionSummary): string {
  if (subscription.cancelAtPeriodEnd) return `Lo diste de baja y termina el ${longDate(subscription.currentPeriodEnd)}. No se te cobra más.`;
  if (subscription.status === "PAUSED") return "Mientras esté pausado Mercado Pago no te lo cobra, pero si se reanuda te lo vuelve a cobrar.";
  return "No lo necesitás para usar BoxLead, pero Mercado Pago te lo sigue cobrando hasta que lo des de baja.";
}

type CurrentPlanProps = {
  summary: BillingSummary;
  planName: (code: PaidPlanCode) => string;
  busy: boolean;
  onCancel: () => void;
  onKeep: () => void;
};

function usageLabel(used: number, limit: number | null): string {
  if (limit === null) return `${formatNumber(used)} respuestas, sin límite`;
  return `${formatNumber(used)} de ${formatNumber(limit)} respuestas`;
}

function usageRatio(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0;
  return Math.min(1, used / limit);
}

export function CurrentPlan({ summary, planName, busy, onCancel, onKeep }: CurrentPlanProps) {
  const { usage, limits } = summary;
  const plan = currentPlan(summary);
  const team = plan?.source === "TEAM";
  const subscription = summary.subscription;
  const demo = team ? null : summary.demo;
  const status = subscription ? SUBSCRIPTION_STATUS[subscription.status] : null;
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
        Tu plan
      </h2>

      {team ? (
        <div className="billing-current-head">
          <p className="billing-current-name">Equipo de BoxLead</p>
          <Tag tone="accent">Sin cargo</Tag>
        </div>
      ) : plan ? (
        <div className="billing-current-head">
          <p className="billing-current-name">{plan.name ?? "Tu plan"}</p>
          {status ? <Tag tone={status.tone}>{status.label}</Tag> : null}
          {plan.source === "DEMO" ? <Tag tone="accent">Gratis</Tag> : null}
        </div>
      ) : (
        <div className="billing-current-head">
          <p className="billing-current-name">Sin plan</p>
        </div>
      )}

      <div className="billing-current-lines">
        {!plan ? <p>Elegí un plan para que tus agentes respondan y puedas enviar mensajes.</p> : null}
        {team ? (
          <p>
            Esta cuenta es del equipo de BoxLead. Usás la app sin pagar con los límites de Business mientras tengas un rol en el
            backoffice, así que no hace falta contratar un plan.
          </p>
        ) : null}
        {team && subscription && status ? (
          <p>
            También tenés un plan pago propio que hoy figura como <strong>{status.label}</strong>. {teamChargeNote(subscription)}
          </p>
        ) : null}
        {demo ? <p>Tu Beta gratis dura hasta el {longDate(demo.endsAt)}.</p> : null}
        {subscription && !subscription.cancelAtPeriodEnd && subscription.status === "ACTIVE" ? (
          <p>
            Próxima cuota de <strong>{formatMinor(subscription.price)}</strong> el {longDate(subscription.currentPeriodEnd)}.
          </p>
        ) : null}
        {subscription?.cancelAtPeriodEnd && !team ? (
          <p>Lo diste de baja. Tenés acceso hasta el {longDate(subscription.currentPeriodEnd)}.</p>
        ) : null}
        {subscription?.status === "PAST_DUE" ? (
          <p>
            Mercado Pago no pudo cobrar la cuota.
            {subscription.graceUntil && !team ? ` Seguís con acceso hasta el ${longDate(subscription.graceUntil)}.` : null}
          </p>
        ) : null}
        {summary.access === "RESTRICTED" && (subscription?.status === "SUSPENDED" || subscription?.status === "PAUSED") ? (
          <p>Tus agentes están apagados hasta que se regularice el pago.</p>
        ) : null}
        {subscription?.pendingPlanCode ? (
          <p>
            Pasás a {planName(subscription.pendingPlanCode)} el {longDate(subscription.currentPeriodEnd)}.
          </p>
        ) : null}
      </div>

      {plan ? (
        <div className="billing-usage">
          <div className="billing-usage-head">
            <span>Respuestas de agentes</span>
            <span>{usageLabel(usage.agentReplies.used, usage.agentReplies.limit)}</span>
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
              aria-label="Respuestas usadas en el período"
            />
          ) : null}
          <p className="billing-usage-hint">El contador vuelve a cero el {longDate(usage.periodEnd)}.</p>
          {limits.AGENTS_MAX !== undefined || limits.METRICS_HISTORY_DAYS !== undefined ? (
            <ul className="billing-limits">
              {limits.AGENTS_MAX !== undefined ? (
                <li>{limits.AGENTS_MAX === null ? "Agentes sin límite" : `Hasta ${limits.AGENTS_MAX} agentes`}</li>
              ) : null}
              {limits.METRICS_HISTORY_DAYS !== undefined && limits.METRICS_HISTORY_DAYS !== null ? (
                <li>{`Métricas de los últimos ${limits.METRICS_HISTORY_DAYS} días`}</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {paymentUrl || canCancel || (subscription?.pendingPlanCode && !team) ? (
        <div className="billing-card-actions">
          {paymentUrl ? (
            <a className="btn btn-primary btn-sm" href={paymentUrl} rel="noopener noreferrer">
              Cambiar el medio de pago
            </a>
          ) : null}
          {subscription?.pendingPlanCode && plan && !team ? (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onKeep}>
              Seguir en {plan.name ?? "tu plan"}
            </button>
          ) : null}
          {canCancel ? (
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={onCancel}>
              Dar de baja
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
