import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import { isStale, withMessage } from "../../api/errors";
import { DateText } from "../../components/DateText";
import { StatusBadge } from "../../components/StatusBadge";
import { DateFilter, FilterBar, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import type { Column } from "../../components/list/DataTable";
import { enumOf, type FilterRules } from "../../components/list/filterRules";
import { useListQuery } from "../../components/list/useListQuery";
import { ReasonDialog } from "../../components/ReasonDialog";
import { revokeDemo } from "./api";
import { ExtendDemoFlow } from "./ExtendDemoFlow";
import { GrantDemoFlow } from "./GrantDemoFlow";
import { whileHeld, type Hold } from "./hold";
import { DEMO_STATUS } from "./labels";
import { userLabel, type DemoGrant, type DemoGrantStatus } from "./types";

const FILTERS = ["status", "endsBefore"] as const;
const NO_DEMO = "Ese usuario ya no tiene Demo.";

const STATUS_OPTIONS = (Object.keys(DEMO_STATUS) as DemoGrantStatus[]).map((value) => ({
  value,
  label: DEMO_STATUS[value].label,
}));
const RULES: FilterRules = { status: enumOf(STATUS_OPTIONS), endsBefore: { kind: "date" } };

type DemoListProps = {
  tabs: ReactNode;
  canAct: boolean;
  creating: boolean;
  hold: Hold;
  onCloseCreate: () => void;
};

export function DemoList({ tabs, canAct, creating, hold, onCloseCreate }: DemoListProps) {
  const toast = useToast();
  const { params, query } = useListQuery<DemoGrant>("/admin/demo-grants", FILTERS, RULES);
  const [extending, setExtending] = useState<DemoGrant | null>(null);
  const [revoking, setRevoking] = useState<DemoGrant | null>(null);

  async function revoke(reason: string) {
    if (!revoking) return;
    const grant = revoking;
    await whileHeld(hold, () => revokeDemo(grant.userId, reason)).catch(withMessage(404, NO_DEMO)).catch(withMessage(409, NO_DEMO));
    toast({ tone: "success", message: `Le quitaste la Demo a ${userLabel(revoking)}.` });
    setRevoking(null);
    query.reload();
  }

  const columns: Column<DemoGrant>[] = [
    {
      key: "user",
      header: "Usuario",
      width: "lg",
      cell: (row) => (
        <Link className="invitations-email" to={`/usuarios/${row.userId}`}>
          {userLabel(row)}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Estado",
      type: "status",
      cell: (row) => (
        <span className="invitations-status">
          <StatusBadge status={DEMO_STATUS[row.status]} />
          {row.revokedAt ? (
            <span className="invitations-note">
              El <DateText value={row.revokedAt} />
            </span>
          ) : null}
        </span>
      ),
    },
    { key: "starts", header: "Inicio", type: "date", cell: (row) => <DateText value={row.startsAt} time /> },
    { key: "ends", header: "Fin", type: "date", cell: (row) => <DateText value={row.endsAt} time /> },
    { key: "origin", header: "Origen", cell: (row) => (row.invitationId ? "Invitación" : "Otorgada a mano") },
  ];

  if (canAct) {
    columns.push({
      key: "actions",
      header: "Acciones",
      type: "actions",
      cell: (row) =>
        row.status === "REVOKED" ? (
          <span className="invitations-note">—</span>
        ) : (
          <span className="row-actions">
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
      <ListView
        caption="Demos"
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay Demos"
        emptyHint="Una Demo otorgada es para quien ya tiene cuenta y arranca en el acto. Las de una invitación aparecen cuando la persona se registra."
        filters={
          <FilterBar active={params.active} onClear={params.clear} lead={tabs}>
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
          <GrantDemoFlow open={creating} hold={hold} onClose={onCloseCreate} onGranted={query.reload} />
          <ExtendDemoFlow grant={extending} hold={hold} onClose={() => setExtending(null)} onExtended={query.reload} />
          <ReasonDialog
            open={revoking !== null}
            title="Quitar Demo"
            confirmLabel="Quitar Demo"
            tone="danger"
            onConfirm={revoke}
            onClose={() => setRevoking(null)}
            onSettled={(failure) => {
              if (isStale(failure)) query.reload();
            }}
          >
            {revoking?.status === "ENDED" ? (
              <p>
                La Demo de <strong>{userLabel(revoking)}</strong> ya terminó. Quitarla no cambia su plan y deja lugar para otorgarle otra.
              </p>
            ) : (
              <p>
                Vas a quitarle la Demo a <strong>{revoking ? userLabel(revoking) : ""}</strong>. Si no tiene un plan pago, se queda sin
                plan desde ahora. Después le podés otorgar otra.
              </p>
            )}
          </ReasonDialog>
        </>
      ) : null}
    </>
  );
}
