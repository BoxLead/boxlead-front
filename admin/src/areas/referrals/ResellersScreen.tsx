import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import type { Column } from "../../components/list/DataTable";
import { ListView } from "../../components/list/ListView";
import { useListQuery } from "../../components/list/useListQuery";
import { Screen } from "../../components/Screen";
import { formatDate } from "../../format";
import { navItem } from "../../nav";
import { CreateResellerDialog } from "./dialogs";
import { useReferralRoles } from "./hooks";
import { CODE_STATUS, formatRate, RESELLER_STATUS } from "./labels";
import { StatusTag } from "./parts";
import type { Reseller } from "./types";

const NO_FILTERS: readonly string[] = [];

const COLUMNS: readonly Column<Reseller>[] = [
  {
    key: "name",
    header: "Revendedor",
    cell: (row) => (
      <Link className="ref-link" to={`/revendedores/${row.id}`}>
        {row.displayName}
      </Link>
    ),
  },
  { key: "status", header: "Estado", cell: (row) => <StatusTag value={RESELLER_STATUS[row.status]} /> },
  {
    key: "codes",
    header: "Códigos",
    cell: (row) =>
      row.codes.length === 0 ? (
        <span className="ref-muted">Sin códigos</span>
      ) : (
        <ul className="ref-codes">
          {row.codes.map((code) => (
            <li key={code.id}>
              <code className="ref-code">{code.code}</code>
              {code.status === "ACTIVE" ? null : <StatusTag value={CODE_STATUS[code.status]} />}
            </li>
          ))}
        </ul>
      ),
  },
  { key: "rate", header: "Comisión", align: "end", cell: (row) => formatRate(row.rateBps) },
  { key: "cycles", header: "Ciclos pagos", align: "end", cell: (row) => row.maxPaidCycles },
  { key: "createdAt", header: "Alta", cell: (row) => formatDate(row.createdAt) },
];

export function ResellersScreen() {
  const item = navItem("resellers");
  const { owner } = useReferralRoles();
  const { params, query } = useListQuery<Reseller>("/admin/resellers", NO_FILTERS);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  function created(reseller: Reseller) {
    setCreating(false);
    toast({ tone: "success", message: `${reseller.displayName} ya es revendedor.` });
    navigate(`/revendedores/${reseller.id}`);
  }

  return (
    <Screen
      title={item.label}
      description={item.description}
      actions={
        owner ? (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            Nuevo revendedor
          </button>
        ) : null
      }
    >
      <ListView
        caption="Revendedores"
        query={query}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay revendedores"
        emptyHint={owner ? "Creá el primero con su usuario y sus datos fiscales." : "Los crea un dueño del equipo."}
      />
      {creating ? <CreateResellerDialog onClose={() => setCreating(false)} onCreated={created} /> : null}
    </Screen>
  );
}
