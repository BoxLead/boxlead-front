import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import type { AdminPage } from "../../api/types";
import { Bars } from "../../components/Bars";
import { DateText } from "../../components/DateText";
import { isUuid } from "../../components/list/filterRules";
import { DataTable, type Column } from "../../components/list/DataTable";
import { DateFilter, FilterBar } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useAdminQuery, type QueryResult } from "../../components/list/useAdminQuery";
import { Money } from "../../components/Money";
import { ReasonDialog } from "../../components/ReasonDialog";
import { Screen } from "../../components/Screen";
import { StatusBadge } from "../../components/StatusBadge";
import { formatCount, formatDate, formatDateTime } from "../../format";
import { referralsApi } from "./api";
import { AttributionDialog, CreatePayoutDialog } from "./dialogs";
import { useResellerDirectory } from "../../session/resellerDirectory";
import { useDetailQuery, useReferralRoles } from "./hooks";
import {
  ATTRIBUTION_SOURCE,
  CODE_STATUS,
  COMMISSION_STATUS,
  formatRate,
  planName,
  RESELLER_STATUS,
  SUBSCRIPTION_STATUS,
  vatLabel,
} from "./labels";
import { DetailState, Facts, FinanceOnly, Muted, Section, SectionGrid } from "./parts";
import type { ReferralCode, ResellerBilling, ResellerCustomer, ResellerDetail } from "./types";

const BACK = { to: "/revendedores", label: "Revendedores" };
const CUSTOMERS_PAGE = "clientes";
const DESCRIPTION = "Códigos, clics, clientes y comisiones del revendedor.";

type Dialog =
  | { kind: "code" }
  | { kind: "disable"; code: ReferralCode }
  | { kind: "attribute" }
  | { kind: "move"; customer: ResellerCustomer }
  | { kind: "payout" };

function clicksByCode(detail: ResellerDetail): Map<string, number> {
  const totals = new Map<string, number>();
  for (const click of detail.clicks) totals.set(click.referralCodeId, (totals.get(click.referralCodeId) ?? 0) + click.clicks);
  return totals;
}

function clicksByDay(detail: ResellerDetail): { day: string; clicks: number }[] {
  const totals = new Map<string, number>();
  for (const click of detail.clicks) totals.set(click.day, (totals.get(click.day) ?? 0) + click.clicks);
  return [...totals.entries()]
    .filter(([, clicks]) => clicks > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, clicks]) => ({ day, clicks }));
}

function BillingFacts({ billing }: { billing: ResellerBilling }) {
  return (
    <Facts
      columns={2}
      items={[
        { label: "Razón social", value: billing.legalName ?? "—" },
        { label: "CUIT", value: billing.taxId ?? "—" },
        { label: "Condición frente al IVA", value: vatLabel(billing.vatCondition) },
        { label: "Medio de cobro", value: billing.payoutMethod ?? "Sin cargar" },
        { label: "Dato de cobro", value: billing.payoutReference ?? "Sin cargar" },
        {
          label: "Términos aceptados",
          value: billing.termsVersion ? `Versión ${billing.termsVersion} el ${formatDateTime(billing.termsAcceptedAt)}` : "Todavía no los aceptó",
        },
      ]}
    />
  );
}

type Customers = QueryResult<AdminPage<ResellerCustomer>> & { reload: () => void };

type ContentProps = {
  detail: ResellerDetail;
  customers: Customers;
  reload: () => void;
};

function ResellerContent({ detail, customers, reload }: ContentProps) {
  const { owner, finance } = useReferralRoles();
  const directory = useResellerDirectory();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { reseller } = detail;
  const codeById = new Map(reseller.codes.map((code) => [code.id, code.code]));
  const codeClicks = clicksByCode(detail);
  const days = clicksByDay(detail);
  const totalClicks = days.reduce((sum, day) => sum + day.clicks, 0);
  const datesActive = Boolean(params.get("from") || params.get("to"));

  function setParam(changes: Record<string, string | null>) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });
  }

  function done(message: string) {
    setDialog(null);
    toast({ tone: "success", message });
    reload();
    customers.reload();
  }

  const codeColumns: Column<ReferralCode>[] = [
    { key: "code", header: "Código", type: "id", cell: (row) => <code className="ref-code">{row.code}</code> },
    { key: "status", header: "Estado", type: "status", cell: (row) => <StatusBadge status={CODE_STATUS[row.status]} /> },
    { key: "clicks", header: "Clics en el período", type: "number", cell: (row) => formatCount(codeClicks.get(row.id) ?? 0) },
    { key: "createdAt", header: "Alta", type: "date", cell: (row) => <DateText value={row.createdAt} /> },
    { key: "disabledAt", header: "Desactivado", type: "date", cell: (row) => <DateText value={row.disabledAt} /> },
  ];
  if (owner) {
    codeColumns.push({
      key: "actions",
      header: "Acciones",
      type: "actions",
      cell: (row) =>
        row.status === "ACTIVE" ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: "disable", code: row })}>
            Desactivar
          </button>
        ) : (
          <span className="sub-text">—</span>
        ),
    });
  }

  const customerColumns: Column<ResellerCustomer>[] = [
    {
      key: "email",
      header: "Cliente",
      width: "md",
      cell: (row) => (
        <Link className="entity-link" to={`/usuarios/${row.userId}`}>
          {row.email}
        </Link>
      ),
    },
    { key: "source", header: "Origen", cell: (row) => ATTRIBUTION_SOURCE[row.source] },
    {
      key: "code",
      header: "Código",
      type: "id",
      cell: (row) => (row.referralCodeId ? <code className="ref-code">{codeById.get(row.referralCodeId) ?? "—"}</code> : "—"),
    },
    { key: "attributedAt", header: "Atribuido", type: "date", cell: (row) => <DateText value={row.attributedAt} /> },
    { key: "plan", header: "Plan", cell: (row) => planName(row.planCode) },
    {
      key: "subscription",
      header: "Suscripción",
      type: "status",
      cell: (row) => (row.subscriptionStatus ? <StatusBadge status={SUBSCRIPTION_STATUS[row.subscriptionStatus]} /> : <span className="sub-text">Sin suscripción</span>),
    },
  ];
  if (owner) {
    customerColumns.push({
      key: "actions",
      header: "Acciones",
      type: "actions",
      cell: (row) => (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: "move", customer: row })}>
          Cambiar revendedor
        </button>
      ),
    });
  }

  return (
    <Screen
      title={reseller.displayName}
      description={DESCRIPTION}
      back={BACK}
      meta={
        <Facts
          strip
          label="Resumen"
          items={[
            { label: "Estado", value: <StatusBadge status={RESELLER_STATUS[reseller.status]} /> },
            { label: "Comisión", value: formatRate(reseller.rateBps) },
            { label: "Ciclos pagos", value: reseller.maxPaidCycles },
            { label: "Clientes atribuidos", value: formatCount(detail.customersCount) },
            { label: "Alta", value: <DateText value={reseller.createdAt} /> },
            {
              label: "Usuario",
              value: (
                <Link className="entity-link" to={`/usuarios/${reseller.userId}`}>
                  Ver usuario
                </Link>
              ),
            },
          ]}
        />
      }
    >
      <SectionGrid>
        <Section
          title="Códigos"
          flush
          wide
          actions={
            owner ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: "code" })}>
                Nuevo código
              </button>
            ) : null
          }
        >
          {reseller.codes.length === 0 ? (
            <Muted>Todavía no tiene códigos.</Muted>
          ) : (
            <DataTable caption="Códigos" columns={codeColumns} rows={reseller.codes} rowKey={(row) => row.id} />
          )}
        </Section>

        <Section
          title="Clics por día"
          wide
          hint={
            <>
              {datesActive ? "En el período elegido" : "En los últimos 30 días"} hubo <strong className="num">{formatCount(totalClicks)}</strong> clics.
            </>
          }
        >
          <FilterBar active={datesActive} onClear={() => setParam({ from: null, to: null })}>
            <DateFilter label="Desde" value={params.get("from") ?? ""} onChange={(value) => setParam({ from: value })} />
            <DateFilter label="Hasta" value={params.get("to") ?? ""} onChange={(value) => setParam({ to: value })} />
          </FilterBar>
          {days.length === 0 ? (
            <Muted>No hubo clics en este período.</Muted>
          ) : (
            <Bars caption="Clics por día" unit="clics" items={days.map((row) => ({ key: row.day, label: formatDate(row.day), value: row.clicks }))} />
          )}
        </Section>

        <Section title="Datos fiscales y de cobro">
          {detail.billing ? <BillingFacts billing={detail.billing} /> : <FinanceOnly what="Los datos fiscales y de cobro" />}
        </Section>

        <Section
          title="Comisiones"
          actions={
            finance ? (
              <>
                <Link className="btn btn-ghost btn-sm" to={`/comisiones?resellerId=${reseller.id}`}>
                  Ver comisiones
                </Link>
                <Link className="btn btn-ghost btn-sm" to={`/liquidaciones?resellerId=${reseller.id}`}>
                  Ver liquidaciones
                </Link>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: "payout" })}>
                  Armar liquidación
                </button>
              </>
            ) : null
          }
        >
          {detail.commissionTotals === null ? (
            <FinanceOnly what="Los totales de comisión" />
          ) : detail.commissionTotals.length === 0 ? (
            <Muted>Todavía no tiene comisiones.</Muted>
          ) : (
            <ul className="ref-totals">
              {detail.commissionTotals.map((total) => (
                <li key={`${total.status}-${total.amount.currency}`}>
                  <StatusBadge status={COMMISSION_STATUS[total.status]} />
                  <Money money={total.amount} code />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Clientes atribuidos"
          flush
          wide
          actions={
            owner ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: "attribute" })}>
                Atribuir cliente
              </button>
            ) : null
          }
        >
          <ListView
            caption="Clientes atribuidos"
            query={customers}
            columns={customerColumns}
            rowKey={(row) => row.userId}
            onPageChange={(target) => setParam({ [CUSTOMERS_PAGE]: target > 0 ? String(target) : null })}
            emptyTitle="Todavía no tiene clientes"
            emptyHint="Aparecen cuando alguien se registra con su link o su invitación."
            plain
          />
        </Section>
      </SectionGrid>

      {dialog?.kind === "code" ? (
        <ReasonDialog
          open
          title="Nuevo código"
          confirmLabel="Crear código"
          onConfirm={async (reason) => {
            const code = await referralsApi.issueCode(reseller.id, reason);
            done(`Creamos el código ${code.code}.`);
          }}
          onClose={() => setDialog(null)}
        >
          <p>BoxLead genera un código nuevo de 10 caracteres para {reseller.displayName}. Los códigos que ya tiene siguen andando.</p>
        </ReasonDialog>
      ) : null}
      {dialog?.kind === "disable" ? (
        <ReasonDialog
          open
          title="Desactivar código"
          confirmLabel="Desactivar"
          tone="danger"
          onConfirm={async (reason) => {
            await referralsApi.disableCode(dialog.code.id, reason);
            done(`El código ${dialog.code.code} quedó desactivado.`);
          }}
          onClose={() => setDialog(null)}
        >
          <p>
            El link con <code className="ref-code">{dialog.code.code}</code> sigue llevando a la landing pero deja de atribuir clientes nuevos. Los clientes
            que ya trajo no cambian. No se puede volver a activar.
          </p>
        </ReasonDialog>
      ) : null}
      {dialog?.kind === "attribute" ? (
        <AttributionDialog
          resellers={directory.resellers}
          fixedReseller={reseller}
          onClose={() => setDialog(null)}
          onDone={() => done("La atribución quedó corregida.")}
        />
      ) : null}
      {dialog?.kind === "move" ? (
        <AttributionDialog
          resellers={directory.resellers}
          fixedUser={{ userId: dialog.customer.userId, email: dialog.customer.email, resellerId: reseller.id }}
          onClose={() => setDialog(null)}
          onDone={() => done("La atribución quedó corregida.")}
        />
      ) : null}
      {dialog?.kind === "payout" ? (
        <CreatePayoutDialog
          resellers={directory.resellers}
          fixedReseller={reseller}
          onClose={() => setDialog(null)}
          onCreated={(payout) => {
            setDialog(null);
            toast({ tone: "success", message: "La liquidación quedó armada." });
            navigate(`/liquidaciones/${payout.id}`);
          }}
        />
      ) : null}
    </Screen>
  );
}

const NOT_FOUND = "No encontramos este revendedor";

function ResellerLoader({ resellerId }: { resellerId: string }) {
  const [params] = useSearchParams();
  const range = new URLSearchParams();
  for (const key of ["from", "to"]) {
    const value = params.get(key);
    if (value) range.set(key, value);
  }
  const query = useDetailQuery<ResellerDetail>(`/admin/resellers/${encodeURIComponent(resellerId)}`, range.toString());
  const page = Math.max(0, Math.floor(Number(params.get(CUSTOMERS_PAGE)) || 0));
  const customers = useAdminQuery<AdminPage<ResellerCustomer>>(
    `/admin/resellers/${encodeURIComponent(resellerId)}/customers`,
    page > 0 ? `page=${page}` : "",
  );

  if (query.status === "ready") return <ResellerContent detail={query.data} customers={customers} reload={query.reload} />;
  return (
    <Screen title="Revendedor" description={DESCRIPTION} back={BACK}>
      <DetailState query={query} notFound={NOT_FOUND} back={BACK}>
        {() => null}
      </DetailState>
    </Screen>
  );
}

export function ResellerDetailScreen() {
  const { resellerId = "" } = useParams();
  if (!isUuid(resellerId)) {
    return (
      <Screen title="Revendedor" description={DESCRIPTION} back={BACK}>
        <DetailState query={{ status: "error", message: NOT_FOUND, notFound: true, reload: () => undefined }} notFound={NOT_FOUND} back={BACK}>
          {() => null}
        </DetailState>
      </Screen>
    );
  }
  return <ResellerLoader key={resellerId} resellerId={resellerId} />;
}
