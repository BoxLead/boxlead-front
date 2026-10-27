import { useId } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../../src/components/EmptyState/EmptyState";
import type { Money } from "../../api/types";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { DataTable } from "../../components/list/DataTable";
import { Screen } from "../../components/Screen";
import { formatCount, formatMoney } from "../../format";
import { navItem } from "../../nav";
import { currentMonth, formatMonth, isMonth } from "./dates";
import { planLabel, SUBSCRIPTION_LABELS } from "./labels";
import { ErrorBlock, LoadingBlock, Muted, Section } from "./parts";
import { SUBSCRIPTION_STATUSES, type Overview, type Revenue } from "./types";

const MONTH_PARAM = "month";

function isEmpty(overview: Overview): boolean {
  const subscriptions = Object.values(overview.subscriptions.byStatus).reduce<number>((sum, count) => sum + (count ?? 0), 0);
  return (
    overview.users.total === 0 &&
    overview.users.newInMonth === 0 &&
    subscriptions === 0 &&
    overview.demos.active === 0 &&
    overview.payments.approvedInMonth === 0 &&
    overview.payments.rejectedInMonth === 0
  );
}

function Stat({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="panel overview-stat">
      <p className="panel-title">{label}</p>
      <p className="overview-stat-value num">{formatCount(value)}</p>
      {detail ? <p className="overview-stat-detail">{detail}</p> : null}
    </div>
  );
}

function Counts({ caption, rows, empty }: { caption: string; rows: { label: string; count: number }[]; empty: string }) {
  if (rows.length === 0) return <Muted>{empty}</Muted>;
  return (
    <ul className="overview-counts" aria-label={caption}>
      {rows.map((row) => (
        <li key={row.label}>
          <span>{row.label}</span>
          <strong className="num">{formatCount(row.count)}</strong>
        </li>
      ))}
    </ul>
  );
}

function MoneyList({ label, amounts }: { label: string; amounts: Money[] }) {
  return (
    <div className="overview-money">
      <p className="panel-title">{label}</p>
      {amounts.length === 0 ? (
        <Muted>Nada pendiente.</Muted>
      ) : (
        <ul>
          {amounts.map((amount) => (
            <li key={amount.currency} className="num">
              {formatMoney(amount)} <span className="overview-currency">{amount.currency}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RevenueTable({ revenue }: { revenue: Revenue[] }) {
  if (revenue.length === 0) return <Muted>No hubo cobros en este mes.</Muted>;
  return (
    <div className="customer-table">
      <DataTable
        caption="Ingresos del mes por moneda"
        rows={revenue}
        rowKey={(row) => row.currency}
        columns={[
          { key: "currency", header: "Moneda", cell: (row) => row.currency },
          { key: "gross", header: "Cobrado", align: "end", cell: (row) => formatMoney(row.gross) },
          { key: "refunded", header: "Reembolsado", align: "end", cell: (row) => formatMoney(row.refunded) },
          { key: "fees", header: "Costo de Mercado Pago", align: "end", cell: (row) => formatMoney(row.providerFees) },
          { key: "net", header: "Neto", align: "end", cell: (row) => <strong>{formatMoney(row.net)}</strong> },
        ]}
      />
    </div>
  );
}

function OverviewBody({ overview }: { overview: Overview }) {
  const byStatus = SUBSCRIPTION_STATUSES.flatMap((status) => {
    const count = overview.subscriptions.byStatus[status] ?? 0;
    return count > 0 ? [{ label: SUBSCRIPTION_LABELS[status], count }] : [];
  });
  const byPlan = Object.entries(overview.subscriptions.byPlan)
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({ label: planLabel(code), count }));
  const { revenue, commissions } = overview;
  const finance = revenue !== null;

  return (
    <div className="overview">
      <div className="overview-stats">
        <Stat label="Usuarios" value={overview.users.total} detail={`${formatCount(overview.users.newInMonth)} nuevos en el mes`} />
        <Stat label="Demos vigentes" value={overview.demos.active} detail="Hoy" />
        <Stat label="Pagos aprobados" value={overview.payments.approvedInMonth} detail="En el mes" />
        <Stat label="Pagos rechazados" value={overview.payments.rejectedInMonth} detail="En el mes" />
      </div>
      <div className="overview-grid">
        <Section title="Suscripciones por estado" hint="Cómo están hoy.">
          <Counts caption="Suscripciones por estado" rows={byStatus} empty="Todavía no hay suscripciones." />
        </Section>
        <Section title="Suscripciones por plan" hint="Las que no están canceladas, hoy.">
          <Counts caption="Suscripciones por plan" rows={byPlan} empty="Ninguna suscripción vigente." />
        </Section>
      </div>
      {finance ? (
        <>
          <Section title="Ingresos del mes" hint="Con IVA incluido. El neto descuenta reembolsos y el costo de Mercado Pago.">
            <RevenueTable revenue={revenue} />
          </Section>
          <Section title="Comisiones" hint="Lo que falta liquidar a los revendedores.">
            <div className="overview-money-grid">
              <MoneyList label="Aprobadas sin liquidar" amounts={commissions.approvedUnpaid ?? []} />
              <MoneyList label="Devengadas para liberar" amounts={commissions.accruedReleasable ?? []} />
            </div>
          </Section>
        </>
      ) : (
        <Muted>Los ingresos y las comisiones los ven Finanzas y Dueño.</Muted>
      )}
    </div>
  );
}

function MonthPicker({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  const id = useId();
  return (
    <div className="field overview-month">
      <label className="field-label" htmlFor={id}>
        Mes
      </label>
      <input
        id={id}
        className="input"
        type="month"
        value={value}
        max={currentMonth()}
        onChange={(event) => {
          if (isMonth(event.target.value)) onChange(event.target.value);
        }}
      />
    </div>
  );
}

export function OverviewScreen() {
  const [params, setParams] = useSearchParams();
  const requested = params.get(MONTH_PARAM) ?? "";
  const month = isMonth(requested) ? requested : "";
  const query = useAdminQuery<Overview>("/admin/overview", month ? `${MONTH_PARAM}=${month}` : "");
  const item = navItem("overview");
  const shown = query.status === "ready" ? query.data.month : month || currentMonth();

  function changeMonth(next: string) {
    setParams(next === currentMonth() ? {} : { [MONTH_PARAM]: next });
  }

  return (
    <Screen title={item.label} description={item.description} actions={<MonthPicker value={shown} onChange={changeMonth} />}>
      <p className="overview-period">Datos de {formatMonth(shown)}</p>
      {query.status === "loading" ? (
        <div className="panel">
          <LoadingBlock />
        </div>
      ) : query.status === "error" ? (
        <ErrorBlock title="No pudimos cargar el inicio" message={query.message} onRetry={query.reload} />
      ) : isEmpty(query.data) ? (
        <div className="panel">
          <EmptyState
            illustration="search"
            title="Todavía no hay nada para mostrar acá"
            hint="En este mes no hubo usuarios, suscripciones ni pagos."
          />
        </div>
      ) : (
        <OverviewBody overview={query.data} />
      )}
    </Screen>
  );
}
