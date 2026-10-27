import { adminApi } from "../../api/client";
import { DateText } from "../../components/DateText";
import { Money } from "../../components/Money";
import { ReasonDialog } from "../../components/ReasonDialog";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatMoney } from "../../format";
import { SUBSCRIPTION_STATUS } from "../../status";
import { cancelReasonLabel, CHECKOUT_LABELS } from "./labels";
import { Facts, Muted, Section } from "./parts";
import type { Subscription } from "./types";
import { useActionDialogs } from "./useActionDialogs";

type SubscriptionPanelProps = {
  userId: string;
  subscription: Subscription | null;
  canOperate: boolean;
  onChanged: () => void;
};

type Dialog = "pause" | "resume" | "cancel";

const PAUSABLE = ["ACTIVE", "PAST_DUE", "SUSPENDED"];

function chargeText(subscription: Subscription): string {
  const money = subscription.charge ?? subscription.price;
  return `${formatMoney(money)} ${money.currency}`;
}

function period(subscription: Subscription): string | null {
  if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) return null;
  return `${formatDate(subscription.currentPeriodStart)} al ${formatDate(subscription.currentPeriodEnd)}`;
}

function yes(value: boolean): string {
  return value ? "Sí" : "No";
}

function pauseText(subscription: Subscription): string {
  const access = subscription.status === "SUSPENDED" ? "el acceso sigue restringido" : "el acceso queda restringido";
  return `Hoy se cobra ${chargeText(subscription)} por período. Mientras esté pausada no se cobra y ${access}.`;
}

function cancelText(subscription: Subscription): string {
  if (subscription.status === "INCOMPLETE") {
    return "Se cancela en Mercado Pago y la suscripción se cierra. Todavía no se cobró nada, así que no hay nada para devolver.";
  }
  return "Se cancela en Mercado Pago, la suscripción se cierra y no se vuelve a cobrar. Pierde el plan en el acto, aunque el período esté pago. No devuelve plata, para eso está el reembolso.";
}

export function SubscriptionPanel({ userId, subscription, canOperate, onChanged }: SubscriptionPanelProps) {
  const dialogs = useActionDialogs<Dialog>(onChanged);
  const base = `/admin/customers/${userId}/subscription`;
  const status = subscription?.status;
  const live = subscription !== null && status !== "CANCELED";

  const actions =
    canOperate && subscription && live ? (
      <>
        {status && PAUSABLE.includes(status) ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => dialogs.show("pause")}>
            Pausar
          </button>
        ) : null}
        {status === "PAUSED" ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => dialogs.show("resume")}>
            Reanudar
          </button>
        ) : null}
        <button type="button" className="btn btn-danger btn-sm" onClick={() => dialogs.show("cancel")}>
          Cancelar suscripción
        </button>
      </>
    ) : null;

  return (
    <Section title="Suscripción" hint="La última que tuvo." actions={actions}>
      {subscription ? (
        <Facts
          columns={2}
          items={[
            { label: "Estado", value: <StatusBadge status={SUBSCRIPTION_STATUS[subscription.status]} detail={subscription.providerStatus} /> },
            { label: "Precio", value: <Money money={subscription.price} code /> },
            subscription.charge ? { label: "Cobro", value: <Money money={subscription.charge} code /> } : null,
            period(subscription) ? { label: "Período", value: period(subscription) } : null,
            subscription.paidThrough ? { label: "Pagada hasta", value: <DateText value={subscription.paidThrough} /> } : null,
            subscription.graceUntil ? { label: "Gracia hasta", value: <DateText value={subscription.graceUntil} /> } : null,
            subscription.suspendedUntil ? { label: "Suspendida hasta", value: <DateText value={subscription.suspendedUntil} /> } : null,
            subscription.providerNextPaymentAt ? { label: "Próximo cobro", value: <DateText value={subscription.providerNextPaymentAt} /> } : null,
            { label: "Cancela al terminar el período", value: yes(subscription.cancelAtPeriodEnd) },
            subscription.disputed ? { label: "En disputa", value: "Sí" } : null,
            subscription.lastCheckoutStatus ? { label: "Último checkout", value: CHECKOUT_LABELS[subscription.lastCheckoutStatus] } : null,
            subscription.canceledAt ? { label: "Cancelada el", value: <DateText value={subscription.canceledAt} time /> } : null,
            subscription.cancelReason ? { label: "Motivo de la baja", value: cancelReasonLabel(subscription.cancelReason) } : null,
            { label: "Creada el", value: <DateText value={subscription.createdAt} time /> },
          ]}
        />
      ) : (
        <Muted>Nunca tuvo una suscripción.</Muted>
      )}
      {subscription ? (
        <>
          <ReasonDialog
            open={dialogs.open === "pause"}
            title="Pausar suscripción"
            confirmLabel="Pausar"
            onClose={dialogs.close}
            onConfirm={(reason) => dialogs.run(() => adminApi.post(`${base}/pause`, { reason }), "La suscripción quedó pausada.")}
          >
            <p>Primero se pausa el cobro en Mercado Pago y después la suscripción pasa a pausada.</p>
            <p>{pauseText(subscription)}</p>
          </ReasonDialog>
          <ReasonDialog
            open={dialogs.open === "resume"}
            title="Reanudar suscripción"
            confirmLabel="Reanudar"
            onClose={dialogs.close}
            onConfirm={(reason) => dialogs.run(() => adminApi.post(`${base}/resume`, { reason }), "La suscripción volvió a estar activa.")}
          >
            <p>Se reactiva el cobro en Mercado Pago y la suscripción vuelve a activa.</p>
            <p>El cobro vuelve a ser de {chargeText(subscription)} por período.</p>
          </ReasonDialog>
          <ReasonDialog
            open={dialogs.open === "cancel"}
            title="Cancelar suscripción"
            confirmLabel="Cancelar suscripción"
            tone="danger"
            onClose={dialogs.close}
            onConfirm={(reason) => dialogs.run(() => adminApi.post(`${base}/cancel`, { reason }), "La suscripción quedó cancelada.")}
          >
            <p>
              {cancelText(subscription)}
            </p>
            {subscription.status === "INCOMPLETE" ? null : <p>Hoy se cobra {chargeText(subscription)} por período.</p>}
          </ReasonDialog>
        </>
      ) : null}
    </Section>
  );
}
