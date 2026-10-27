import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import { DateText } from "../../components/DateText";
import { DataTable, type Column } from "../../components/list/DataTable";
import { Money } from "../../components/Money";
import { Screen } from "../../components/Screen";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../format";
import { downloadPayout } from "./api";
import { ExportPayoutDialog, MarkPaidDialog } from "./dialogs";
import { useDetailQuery, useResellerDirectory } from "./hooks";
import { COMMISSION_KIND, COMMISSION_STATUS, PAYOUT_STATUS, shortId } from "./labels";
import { DetailState, Facts, Muted, Section } from "./parts";
import type { Commission, PayoutDetail } from "./types";

const BACK = { to: "/liquidaciones", label: "Liquidaciones" };
const DESCRIPTION = "Total, estado y movimientos de la liquidación.";

type Dialog = "export" | "paid";

const ENTRY_COLUMNS: readonly Column<Commission>[] = [
  { key: "createdAt", header: "Alta", type: "date", cell: (row) => <DateText value={row.createdAt} /> },
  {
    key: "customer",
    header: "Cliente",
    width: "sm",
    cell: (row) => (
      <Link className="entity-link" to={`/usuarios/${row.customerUserId}`}>
        Cliente {shortId(row.customerUserId)}
      </Link>
    ),
  },
  { key: "kind", header: "Tipo", cell: (row) => `${COMMISSION_KIND[row.kind]}, ciclo ${row.cycleNumber}` },
  { key: "status", header: "Estado", type: "status", cell: (row) => <StatusBadge status={COMMISSION_STATUS[row.status]} /> },
  { key: "amount", header: "Monto", type: "money", cell: (row) => <Money money={row.amount} /> },
];

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
    <Screen
      title={`Liquidación al ${formatDate(payout.periodEnd)}`}
      description={payout.status === "DRAFT" ? "Para marcarla pagada primero exportá el CSV." : DESCRIPTION}
      back={BACK}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setDialog("export")}>
            Exportar CSV
          </button>
          {payout.status === "EXPORTED" ? (
            <button type="button" className="btn btn-primary" onClick={() => setDialog("paid")}>
              Marcar pagada
            </button>
          ) : null}
        </>
      }
      meta={
        <Facts
          strip
          label="Resumen"
          items={[
            {
              label: "Revendedor",
              value: (
                <Link className="entity-link" to={`/revendedores/${payout.resellerId}`}>
                  {directory.nameOf(payout.resellerId)}
                </Link>
              ),
            },
            { label: "Estado", value: <StatusBadge status={PAYOUT_STATUS[payout.status]} /> },
            { label: "Total", value: <Money money={payout.total} code strong /> },
            { label: "Armada", value: <DateText value={payout.createdAt} time /> },
            { label: "Pagada", value: <DateText value={payout.paidAt} time /> },
            payout.transferReference ? { label: "Referencia de la transferencia", value: payout.transferReference } : null,
          ]}
        />
      }
    >
      <Section title="Movimientos" flush>
        {entries.length === 0 ? <Muted>Esta liquidación no tiene movimientos.</Muted> : <DataTable caption="Movimientos" rows={entries} rowKey={(row) => row.id} columns={ENTRY_COLUMNS} />}
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
    </Screen>
  );
}

export function PayoutDetailScreen() {
  const { payoutId = "" } = useParams();
  const query = useDetailQuery<PayoutDetail>(`/admin/payouts/${encodeURIComponent(payoutId)}`);

  if (query.status === "ready") return <PayoutContent detail={query.data} reload={query.reload} />;
  return (
    <Screen title="Liquidación" description={DESCRIPTION} back={BACK}>
      <DetailState query={query} notFound="No encontramos esta liquidación" back={BACK}>
        {() => null}
      </DetailState>
    </Screen>
  );
}
