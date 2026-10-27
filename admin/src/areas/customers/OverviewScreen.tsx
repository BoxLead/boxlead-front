import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../../src/components/EmptyState/EmptyState";
import type { Money as MoneyValue } from "../../api/types";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { DataTable } from "../../components/list/DataTable";
import { Money } from "../../components/Money";
import { MonthPicker } from "../../components/MonthPicker";
import { Screen } from "../../components/Screen";
import { CardsSkeleton } from "../../components/Skeleton";
import { StatCard, StatGrid } from "../../components/StatCard";
import { formatCount, formatMonth } from "../../format";
import { navItem } from "../../nav";
import { currentMonth, isMonth } from "./dates";
import { planLabel, SUBSCRIPTION_LABELS } from "./labels";
import { ErrorBlock, Muted, Section, SectionGrid } from "./parts";
import { SUBSCRIPTION_STATUSES, type Overview, type Revenue } from "./types";
import "./customers.css";

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

function MoneyList({ label, amounts }: { label: string; amounts: MoneyValue[] }) {
  return (
    <div className="overview-money">
      <p className="overview-money-label">{label}</p>
      {amounts.length === 0 ? (
        <Muted>Nada pendiente.</Muted>
      ) : (
        <ul>
          {amounts.map((amount) => (
            <li key={amount.currency}>
              <Money money={amount} code strong />
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
    <DataTable
      caption="Ingresos del mes por moneda"
      rows={revenue}
      rowKey={(row) => row.currency}
      columns={[
        { key: "currency", header: "Moneda", type: "id", cell: (row) => row.currency },
        { key: "gross", header: "Cobrado", type: "money", cell: (row) => <Money money={row.gross} /> },
        { key: "refunded", header: "Reembolsado", type: "money", cell: (row) => <Money money={row.refunded} /> },
        { key: "fees", header: "Costo de Mercado Pago", type: "money", cell: (row) => <Money money={row.providerFees} /> },
        { key: "net", header: "Neto", type: "money", cell: (row) => <Money money={row.net} strong /> },
      ]}
    />
  );
}

function OverviewBody({ overview, month }: { overview: Overview; month: string }) {
  const byStatus = SUBSCRIPTION_STATUSES.flatMap((status) => {
    const count = overview.subscriptions.byStatus[status] ?? 0;
    return count > 0 ? [{ label: SUBSCRIPTION_LABELS[status], count }] : [];
  });
  const byPlan = Object.entries(overview.subscriptions.byPlan)
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({ label: planLabel(code), count }));
  const { revenue, commissions } = overview;
  const finance = revenue !== null;
  const period = formatMonth(month);

  return (
    <div className="overview">
      <StatGrid>
        <StatCard label="Usuarios" value={formatCount(overview.users.total)} period="Hoy" delta={{ value: overview.users.newInMonth, label: "nuevos en el mes" }} />
        <StatCard label="Demos vigentes" value={formatCount(overview.demos.active)} period="Hoy" />
        <StatCard label="Pagos aprobados" value={formatCount(overview.payments.approvedInMonth)} period={period} />
        <StatCard label="Pagos rechazados" value={formatCount(overview.payments.rejectedInMonth)} period={period} tone="danger" />
      </StatGrid>
      <SectionGrid>
        <Section title="Suscripciones por estado" hint="Cómo están hoy.">
          <Counts caption="Suscripciones por estado" rows={byStatus} empty="Todavía no hay suscripciones." />
        </Section>
        <Section title="Suscripciones por plan" hint="Las que no están canceladas, hoy.">
          <Counts caption="Suscripciones por plan" rows={byPlan} empty="Ninguna suscripción vigente." />
        </Section>
      </SectionGrid>
      {finance ? (
        <>
          <Section title="Ingresos del mes" hint="Con IVA incluido. El neto descuenta reembolsos y el costo de Mercado Pago." flush>
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
    <Screen title={item.label} description={item.description} actions={<MonthPicker value={shown} max={currentMonth()} onChange={changeMonth} />}>
      {query.status === "loading" ? (
        <CardsSkeleton />
      ) : query.status === "error" ? (
        <ErrorBlock title="No pudimos cargar el inicio" message={query.message} onRetry={query.reload} />
      ) : isEmpty(query.data) ? (
        <div className="panel">
          <EmptyState
            illustration="metrics"
            title="Todavía no hay nada para mostrar acá"
            hint="En este mes no hubo usuarios, suscripciones ni pagos."
          />
        </div>
      ) : (
        <OverviewBody overview={query.data} month={shown} />
      )}
    </Screen>
  );
}
