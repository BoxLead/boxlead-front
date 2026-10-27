import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Tag } from "../../../../src/components/ui/Tag";
import { useToast } from "../../../../src/components/ui/toast";
import { DateFilter, FilterBar, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import type { Column } from "../../components/list/DataTable";
import { useListQuery } from "../../components/list/useListQuery";
import { ReasonDialog } from "../../components/ReasonDialog";
import { formatDate } from "../../format";
import { revokeDemo } from "./api";
import { ExtendDemoFlow } from "./ExtendDemoFlow";
import { GrantDemoFlow } from "./GrantDemoFlow";
import { DEMO_STATUS } from "./labels";
import { userLabel, type DemoGrant, type DemoGrantStatus } from "./types";

const FILTERS = ["status", "endsBefore"] as const;

const STATUS_OPTIONS = (Object.keys(DEMO_STATUS) as DemoGrantStatus[]).map((value) => ({
  value,
  label: DEMO_STATUS[value].label,
}));

type DemoListProps = {
  tabs: ReactNode;
  canAct: boolean;
};

export function DemoList({ tabs, canAct }: DemoListProps) {
  const toast = useToast();
  const { params, query } = useListQuery<DemoGrant>("/admin/demo-grants", FILTERS);
  const [granting, setGranting] = useState(false);
  const [extending, setExtending] = useState<DemoGrant | null>(null);
  const [revoking, setRevoking] = useState<DemoGrant | null>(null);

  async function revoke(reason: string) {
    if (!revoking) return;
    await revokeDemo(revoking.userId, reason);
    toast({ tone: "success", message: `Le quitaste la Demo a ${userLabel(revoking)}.` });
    setRevoking(null);
    query.reload();
  }

  const columns: Column<DemoGrant>[] = [
    {
      key: "user",
      header: "Usuario",
      cell: (row) => (
        <Link className="invitations-email" to={`/usuarios/${row.userId}`}>
          {userLabel(row)}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <span className="invitations-status">
          <Tag tone={DEMO_STATUS[row.status].tone}>{DEMO_STATUS[row.status].label}</Tag>
          {row.revokedAt ? <span className="invitations-note">El {formatDate(row.revokedAt)}</span> : null}
        </span>
      ),
    },
    { key: "starts", header: "Inicio", cell: (row) => formatDate(row.startsAt) },
    { key: "ends", header: "Fin", cell: (row) => formatDate(row.endsAt) },
    { key: "origin", header: "Origen", cell: (row) => (row.invitationId ? "Invitación" : "Otorgada a mano") },
  ];

  if (canAct) {
    columns.push({
      key: "actions",
      header: "Acciones",
      align: "end",
      cell: (row) =>
        row.status === "REVOKED" ? (
          <span className="invitations-note">—</span>
        ) : (
          <span className="invitations-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExtending(row)}>
              Extender
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setRevoking(row)}>
              Quitar
            </button>
          </span>
        ),
    });
  }

  return (
    <>
      <div className="invitations-toolbar">
        {tabs}
        {canAct ? (
          <button type="button" className="btn btn-primary" onClick={() => setGranting(true)}>
            Otorgar Demo
          </button>
        ) : null}
      </div>
      <ListView
        caption="Demos"
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay Demos"
        emptyHint="Aparecen cuando alguien acepta una invitación o cuando le otorgás una Demo a un usuario."
        filters={
          <FilterBar active={params.active} onClear={params.clear}>
            <SelectFilter
              label="Estado"
              value={params.value("status")}
              options={STATUS_OPTIONS}
              allLabel="Todas"
              onChange={(value) => params.setFilter("status", value)}
            />
            <DateFilter label="Terminan antes del" value={params.value("endsBefore")} onChange={(value) => params.setFilter("endsBefore", value)} />
          </FilterBar>
        }
      />
      {canAct ? (
        <>
          <GrantDemoFlow open={granting} onClose={() => setGranting(false)} onGranted={query.reload} />
          <ExtendDemoFlow grant={extending} onClose={() => setExtending(null)} onExtended={query.reload} />
          <ReasonDialog
            open={revoking !== null}
            title="Quitar Demo"
            confirmLabel="Quitar Demo"
            tone="danger"
            onConfirm={revoke}
            onClose={() => setRevoking(null)}
          >
            <p>
              Vas a quitarle la Demo a <strong>{revoking ? userLabel(revoking) : ""}</strong>. Si no tiene un plan pago, se queda sin
              plan desde ahora. Después le podés otorgar otra.
            </p>
          </ReasonDialog>
        </>
      ) : null}
    </>
  );
}
