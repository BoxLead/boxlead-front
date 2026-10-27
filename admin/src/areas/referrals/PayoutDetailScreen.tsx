import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import { DataTable } from "../../components/list/DataTable";
import { Screen } from "../../components/Screen";
import { formatDate, formatDateTime, formatMoney } from "../../format";
import { downloadPayout } from "./api";
import { ExportPayoutDialog, MarkPaidDialog } from "./dialogs";
import { useDetailQuery, useResellerDirectory } from "./hooks";
import { COMMISSION_KIND, COMMISSION_STATUS, PAYOUT_STATUS, shortId } from "./labels";
import { DetailState, Fact, Facts, Section, StatusTag } from "./parts";
import type { PayoutDetail } from "./types";

const BACK = { to: "/liquidaciones", label: "Liquidaciones" };

type Dialog = "export" | "paid";

function PayoutContent({ detail, reload }: { detail: PayoutDetail; reload: () => void }) {
  const { payout, entries } = detail;
  const directory = useResellerDirectory();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const toast = useToast();

  async function exportCsv(reason: string) {
    await downloadPayout(payout, reason);
    setDialog(null);
    toast({ tone: "success", message: "Bajamos el CSV de la liquidación." });
    reload();
  }

  return (
    <div className="ref-stack">
      <section className="panel ref-summary" aria-label="Resumen">
        <Facts>
          <Fact label="Revendedor">
            <Link className="ref-link" to={`/revendedores/${payout.resellerId}`}>
              {directory.nameOf(payout.resellerId)}
            </Link>
          </Fact>
          <Fact label="Estado">
            <StatusTag value={PAYOUT_STATUS[payout.status]} />
          </Fact>
          <Fact label="Total">
            <span className="num ref-strong">
              {formatMoney(payout.total)} <span className="ref-muted">{payout.total.currency}</span>
            </span>
          </Fact>
          <Fact label="Cierre del período">{formatDate(payout.periodEnd)}</Fact>
          <Fact label="Armada">{formatDateTime(payout.createdAt)}</Fact>
          <Fact label="Pagada">{formatDateTime(payout.paidAt)}</Fact>
          <Fact label="Referencia de la transferencia">{payout.transferReference ?? "—"}</Fact>
        </Facts>
        <div className="ref-summary-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setDialog("export")}>
            Exportar CSV
          </button>
          {payout.status === "EXPORTED" ? (
            <button type="button" className="btn btn-primary" onClick={() => setDialog("paid")}>
              Marcar pagada
            </button>
          ) : null}
        </div>
        {payout.status === "DRAFT" ? <p className="ref-muted">Para marcarla pagada primero exportá el CSV.</p> : null}
      </section>

      <Section title="Movimientos">
        {entries.length === 0 ? (
          <p className="ref-muted ref-pad">Esta liquidación no tiene movimientos.</p>
        ) : (
          <DataTable
            caption="Movimientos"
            rows={entries}
            rowKey={(row) => row.id}
            columns={[
              { key: "createdAt", header: "Alta", cell: (row) => formatDate(row.createdAt) },
              {
                key: "customer",
                header: "Cliente",
                cell: (row) => (
                  <Link className="ref-link" to={`/usuarios/${row.customerUserId}`}>
                    Cliente {shortId(row.customerUserId)}
                  </Link>
                ),
              },
              { key: "kind", header: "Tipo", cell: (row) => `${COMMISSION_KIND[row.kind]}, ciclo ${row.cycleNumber}` },
              { key: "status", header: "Estado", cell: (row) => <StatusTag value={COMMISSION_STATUS[row.status]} /> },
              { key: "amount", header: "Monto", align: "end", cell: (row) => <span className="num">{formatMoney(row.amount)}</span> },
            ]}
          />
        )}
      </Section>

      {dialog === "export" ? <ExportPayoutDialog payout={payout} onClose={() => setDialog(null)} onExport={exportCsv} /> : null}
      {dialog === "paid" ? (
        <MarkPaidDialog
          payout={payout}
          onClose={() => setDialog(null)}
          onPaid={() => {
            setDialog(null);
            toast({ tone: "success", message: "La liquidación quedó pagada." });
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

export function PayoutDetailScreen() {
  const { payoutId = "" } = useParams();
  const query = useDetailQuery<PayoutDetail>(`/admin/payouts/${encodeURIComponent(payoutId)}`);

  return (
    <Screen title="Detalle de liquidación" description="Total, estado y movimientos de la liquidación." back={BACK}>
      <DetailState query={query} notFound="No encontramos esta liquidación" back={BACK}>
        {(detail) => <PayoutContent detail={detail} reload={query.reload} />}
      </DetailState>
    </Screen>
  );
}
