import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import { ReasonDialog } from "../../components/ReasonDialog";
import { Screen } from "../../components/Screen";
import type { Column } from "../../components/list/DataTable";
import { DateFilter, FilterBar, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useListQuery } from "../../components/list/useListQuery";
import { formatDate } from "../../format";
import { navItem } from "../../nav";
import { canAccess } from "../../session/roles";
import { useAdmin } from "../../session/session";
import { changeSubscription, type SubscriptionAction } from "./api";
import { Amount, CustomerCell, NoAction, RowActions, Stack, StatusTag } from "./cells";
import { PLAN_OPTIONS, planLabel, SUBSCRIPTION_STATUS, SUBSCRIPTION_STATUS_OPTIONS } from "./labels";
import { actionsFor, nextStep } from "./subscriptionSteps";
import type { SubscriptionRow } from "./types";

const FILTERS = ["status", "plan", "from", "to"] as const;

const ACTIONS: Record<SubscriptionAction, { button: string; title: string; confirm: string; done: string; tone: "primary" | "danger" }> = {
  pause: { button: "Pausar", title: "Pausar suscripción", confirm: "Pausar", done: "Pausamos la suscripción.", tone: "primary" },
  resume: { button: "Reanudar", title: "Reanudar suscripción", confirm: "Reanudar", done: "Reanudamos la suscripción.", tone: "primary" },
  cancel: { button: "Cancelar", title: "Cancelar suscripción", confirm: "Cancelar suscripción", done: "Cancelamos la suscripción.", tone: "danger" },
};

type Pending = { row: SubscriptionRow; action: SubscriptionAction };

function Explanation({ pending }: { pending: Pending }) {
  const who = pending.row.email ?? "este cliente";
  switch (pending.action) {
    case "pause":
      return (
        <>
          <p>Mercado Pago deja de cobrarle la cuota a {who} y la suscripción queda pausada hasta que la reanudes.</p>
          <p>Primero cambia en Mercado Pago. Si no responde, no cambia nada.</p>
        </>
      );
    case "resume":
      return (
        <>
          <p>Mercado Pago vuelve a cobrarle la cuota a {who} y la suscripción pasa a activa.</p>
          <p>Primero cambia en Mercado Pago. Si no responde, no cambia nada.</p>
        </>
      );
    case "cancel":
      return (
        <>
          <p>La suscripción de {who} se cancela ahora en Mercado Pago y no se le vuelve a cobrar.</p>
          <p>No devuelve plata. Si corresponde, reembolsá el pago desde Pagos.</p>
        </>
      );
  }
}

export function SubscriptionsScreen() {
  const me = useAdmin();
  const toast = useToast();
  const item = navItem("subscriptions");
  const { params, query } = useListQuery<SubscriptionRow>("/admin/subscriptions", FILTERS);
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const canOperate = canAccess(me.roles, ["OWNER"]);

  async function confirm(reason: string) {
    if (!pending) return;
    await changeSubscription(pending.row.userId, pending.action, reason);
    toast({ message: ACTIONS[pending.action].done });
    setOpen(false);
    query.reload();
  }

  const columns: Column<SubscriptionRow>[] = [
    {
      key: "customer",
      header: "Cliente",
      cell: (row) => (
        <Stack
          main={<CustomerCell userId={row.userId} email={row.email} />}
          detail={
            <>
              Alta {formatDate(row.createdAt)}.{" "}
              <Link className="billing-link" to={`/pagos?userId=${encodeURIComponent(row.userId)}`}>
                Ver pagos
              </Link>
            </>
          }
        />
      ),
    },
    { key: "plan", header: "Plan", cell: (row) => planLabel(row.planCode) },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <Stack
          main={<StatusTag status={SUBSCRIPTION_STATUS[row.status]} />}
          detail={row.disputed ? "Con disputa abierta" : row.cancelAtPeriodEnd && row.status !== "CANCELED" ? "Baja pedida" : undefined}
        />
      ),
    },
    {
      key: "charge",
      header: "Cuota",
      align: "end",
      cell: (row) => (
        <Stack
          main={<Amount money={row.charge} />}
          detail={row.price.currency !== row.charge.currency ? <Amount money={row.price} /> : undefined}
        />
      ),
    },
    { key: "next", header: "Próxima acción", cell: nextStep },
  ];

  if (canOperate) {
    columns.push({
      key: "actions",
      header: "Acciones",
      cell: (row) => {
        const actions = actionsFor(row);
        if (actions.length === 0) return <NoAction />;
        return (
          <RowActions>
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                className={action === "cancel" ? "btn btn-danger btn-sm" : "btn btn-secondary btn-sm"}
                aria-label={`${ACTIONS[action].button} la suscripción de ${row.email ?? row.userId}`}
                onClick={() => {
                  setPending({ row, action });
                  setOpen(true);
                }}
              >
                {ACTIONS[action].button}
              </button>
            ))}
          </RowActions>
        );
      },
    });
  }

  return (
    <Screen title={item.label} description={item.description}>
      <ListView
        caption="Suscripciones"
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay suscripciones"
        emptyHint="Aparecen cuando un cliente empieza un checkout de un plan pago."
        filters={
          <FilterBar active={params.active} onClear={params.clear}>
            <SelectFilter
              label="Estado"
              value={params.value("status")}
              options={SUBSCRIPTION_STATUS_OPTIONS}
              onChange={(value) => params.setFilter("status", value)}
            />
            <SelectFilter label="Plan" value={params.value("plan")} options={PLAN_OPTIONS} onChange={(value) => params.setFilter("plan", value)} />
            <DateFilter label="Creada desde" value={params.value("from")} onChange={(value) => params.setFilter("from", value)} />
            <DateFilter label="Creada hasta" value={params.value("to")} onChange={(value) => params.setFilter("to", value)} />
          </FilterBar>
        }
      />
      <ReasonDialog
        open={open && pending !== null}
        title={pending ? ACTIONS[pending.action].title : ""}
        confirmLabel={pending ? ACTIONS[pending.action].confirm : ""}
        tone={pending ? ACTIONS[pending.action].tone : "primary"}
        amount={pending?.row.charge}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      >
        {pending ? <Explanation pending={pending} /> : null}
      </ReasonDialog>
    </Screen>
  );
}
