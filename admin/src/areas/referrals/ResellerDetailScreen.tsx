import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import type { AdminPage } from "../../api/types";
import { DataTable, type Column } from "../../components/list/DataTable";
import { DateFilter, FilterBar } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { ReasonDialog } from "../../components/ReasonDialog";
import { Screen } from "../../components/Screen";
import { formatCount, formatDate, formatDateTime, formatMoney } from "../../format";
import { referralsApi } from "./api";
import { AttributionDialog, CreatePayoutDialog } from "./dialogs";
import { useDetailQuery, useReferralRoles, useResellerDirectory } from "./hooks";
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
import { DetailState, Fact, Facts, FinanceOnly, Section, StatusTag } from "./parts";
import type { ReferralCode, ResellerBilling, ResellerCustomer, ResellerDetail } from "./types";

const BACK = { to: "/revendedores", label: "Revendedores" };
const CUSTOMERS_PAGE = "clientes";

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
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, clicks]) => ({ day, clicks }));
}

function BillingFacts({ billing }: { billing: ResellerBilling }) {
  return (
    <Facts>
      <Fact label="Razón social">{billing.legalName ?? "—"}</Fact>
      <Fact label="CUIT">{billing.taxId ?? "—"}</Fact>
      <Fact label="Condición frente al IVA">{vatLabel(billing.vatCondition)}</Fact>
      <Fact label="Medio de cobro">{billing.payoutMethod ?? "Sin cargar"}</Fact>
      <Fact label="Dato de cobro">{billing.payoutReference ?? "Sin cargar"}</Fact>
      <Fact label="Términos aceptados">
        {billing.termsVersion ? `Versión ${billing.termsVersion} el ${formatDateTime(billing.termsAcceptedAt)}` : "Todavía no los aceptó"}
      </Fact>
    </Facts>
  );
}

type ContentProps = {
  detail: ResellerDetail;
  reload: () => void;
};

function ResellerContent({ detail, reload }: ContentProps) {
  const { owner, finance } = useReferralRoles();
  const directory = useResellerDirectory();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { reseller } = detail;
  const page = Math.max(0, Math.floor(Number(params.get(CUSTOMERS_PAGE)) || 0));
  const customers = useAdminQuery<AdminPage<ResellerCustomer>>(
    `/admin/resellers/${encodeURIComponent(reseller.id)}/customers`,
    page > 0 ? `page=${page}` : "",
  );
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
    { key: "code", header: "Código", cell: (row) => <code className="ref-code">{row.code}</code> },
    { key: "status", header: "Estado", cell: (row) => <StatusTag value={CODE_STATUS[row.status]} /> },
    { key: "clicks", header: "Clics en el período", align: "end", cell: (row) => formatCount(codeClicks.get(row.id) ?? 0) },
    { key: "createdAt", header: "Alta", cell: (row) => formatDate(row.createdAt) },
    { key: "disabledAt", header: "Desactivado", cell: (row) => formatDate(row.disabledAt) },
  ];
  if (owner) {
    codeColumns.push({
      key: "actions",
      header: "Acciones",
      cell: (row) =>
        row.status === "ACTIVE" ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: "disable", code: row })}>
            Desactivar
          </button>
        ) : (
          <span className="ref-muted">—</span>
        ),
    });
  }

  const customerColumns: Column<ResellerCustomer>[] = [
    {
      key: "email",
      header: "Cliente",
      cell: (row) => (
        <Link className="ref-link" to={`/usuarios/${row.userId}`}>
          {row.email}
        </Link>
      ),
    },
    { key: "source", header: "Origen", cell: (row) => ATTRIBUTION_SOURCE[row.source] },
    {
      key: "code",
      header: "Código",
      cell: (row) => (row.referralCodeId ? <code className="ref-code">{codeById.get(row.referralCodeId) ?? "—"}</code> : "—"),
    },
    { key: "attributedAt", header: "Atribuido", cell: (row) => formatDate(row.attributedAt) },
    { key: "plan", header: "Plan", cell: (row) => planName(row.planCode) },
    {
      key: "subscription",
      header: "Suscripción",
      cell: (row) => (row.subscriptionStatus ? SUBSCRIPTION_STATUS[row.subscriptionStatus] : "Sin suscripción"),
    },
  ];
  if (owner) {
    customerColumns.push({
      key: "actions",
      header: "Acciones",
      cell: (row) => (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: "move", customer: row })}>
          Cambiar revendedor
        </button>
      ),
    });
  }

  return (
    <div className="ref-stack">
      <section className="panel ref-summary" aria-label="Resumen">
        <Facts>
          <Fact label="Estado">
            <StatusTag value={RESELLER_STATUS[reseller.status]} />
          </Fact>
          <Fact label="Comisión">{formatRate(reseller.rateBps)}</Fact>
          <Fact label="Ciclos pagos">{reseller.maxPaidCycles}</Fact>
          <Fact label="Clientes atribuidos">{formatCount(detail.customersCount)}</Fact>
          <Fact label="Alta">{formatDate(reseller.createdAt)}</Fact>
          <Fact label="Usuario">
            <Link className="ref-link" to={`/usuarios/${reseller.userId}`}>
              Ver usuario
            </Link>
          </Fact>
        </Facts>
      </section>

      <Section
        title="Códigos"
        actions={
          owner ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: "code" })}>
              Nuevo código
            </button>
          ) : null
        }
      >
        {reseller.codes.length === 0 ? (
          <p className="ref-muted ref-pad">Todavía no tiene códigos.</p>
        ) : (
          <DataTable caption="Códigos" columns={codeColumns} rows={reseller.codes} rowKey={(row) => row.id} />
        )}
      </Section>

      <Section title="Clics por día">
        <div className="ref-pad ref-stack-sm">
          <FilterBar
            active={datesActive}
            onClear={() => setParam({ from: null, to: null })}
          >
            <DateFilter label="Desde" value={params.get("from") ?? ""} onChange={(value) => setParam({ from: value })} />
            <DateFilter label="Hasta" value={params.get("to") ?? ""} onChange={(value) => setParam({ to: value })} />
          </FilterBar>
          <p className="ref-muted">
            {datesActive ? "En el período elegido" : "En los últimos 30 días"} hubo <strong className="num">{formatCount(totalClicks)}</strong> clics.
          </p>
        </div>
        {days.length === 0 ? (
          <p className="ref-muted ref-pad">No hubo clics en este período.</p>
        ) : (
          <ul className="ref-days" aria-label="Clics por día">
            {days.map((row) => (
              <li key={row.day}>
                <span>{formatDate(row.day)}</span>
                <strong className="num">{formatCount(row.clicks)}</strong>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="ref-columns">
        <Section title="Datos fiscales y de cobro">
          <div className="ref-pad">{detail.billing ? <BillingFacts billing={detail.billing} /> : <FinanceOnly what="Los datos fiscales y de cobro" />}</div>
        </Section>
        <Section
          title="Comisiones"
          actions={
            finance ? (
              <>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: "payout" })}>
                  Armar liquidación
                </button>
                <Link className="btn btn-ghost btn-sm" to={`/comisiones?resellerId=${reseller.id}`}>
                  Ver comisiones
                </Link>
                <Link className="btn btn-ghost btn-sm" to={`/liquidaciones?resellerId=${reseller.id}`}>
                  Ver liquidaciones
                </Link>
              </>
            ) : null
          }
        >
          <div className="ref-pad">
            {detail.commissionTotals === null ? (
              <FinanceOnly what="Los totales de comisión" />
            ) : detail.commissionTotals.length === 0 ? (
              <p className="ref-muted">Todavía no tiene comisiones.</p>
            ) : (
              <ul className="ref-totals">
                {detail.commissionTotals.map((total) => (
                  <li key={`${total.status}-${total.amount.currency}`}>
                    <StatusTag value={COMMISSION_STATUS[total.status]} />
                    <span className="num">
                      {formatMoney(total.amount)} <span className="ref-muted">{total.amount.currency}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </div>

      <section className="ref-stack-sm" aria-labelledby="ref-customers-title">
        <header className="ref-list-head">
          <h2 id="ref-customers-title" className="ref-section-title">
            Clientes atribuidos
          </h2>
          {owner ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ kind: "attribute" })}>
              Atribuir cliente
            </button>
          ) : null}
        </header>
        <ListView
          caption="Clientes atribuidos"
          query={customers}
          columns={customerColumns}
          rowKey={(row) => row.userId}
          onPageChange={(target) => setParam({ [CUSTOMERS_PAGE]: target > 0 ? String(target) : null })}
          emptyTitle="Todavía no tiene clientes"
          emptyHint="Aparecen cuando alguien se registra con su link o su invitación."
        />
      </section>

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
    </div>
  );
}

export function ResellerDetailScreen() {
  const { resellerId = "" } = useParams();
  const [params] = useSearchParams();
  const range = new URLSearchParams();
  for (const key of ["from", "to"]) {
    const value = params.get(key);
    if (value) range.set(key, value);
  }
  const query = useDetailQuery<ResellerDetail>(`/admin/resellers/${encodeURIComponent(resellerId)}`, range.toString());
  const title = query.status === "ready" ? query.data.reseller.displayName : "Detalle de revendedor";

  return (
    <Screen title={title} description="Códigos, clics, clientes y comisiones del revendedor." back={BACK}>
      <DetailState query={query} notFound="No encontramos este revendedor" back={BACK}>
        {(detail) => <ResellerContent detail={detail} reload={query.reload} />}
      </DetailState>
    </Screen>
  );
}
