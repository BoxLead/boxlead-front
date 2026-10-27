import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Tag } from "../../../../src/components/ui/Tag";
import { useToast } from "../../../../src/components/ui/toast";
import { FilterBar, SearchFilter, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import type { Column } from "../../components/list/DataTable";
import { useListQuery } from "../../components/list/useListQuery";
import { ReasonDialog } from "../../components/ReasonDialog";
import { formatDate } from "../../format";
import { revokeInvitation } from "./api";
import { CreateInvitationFlow } from "./CreateInvitationFlow";
import type { ResellerState } from "./useResellers";
import { daysText } from "./validation";
import { INVITATION_STATUS } from "./labels";
import type { Invitation, InvitationStatus } from "./types";

const FILTERS = ["status", "email"] as const;

const STATUS_OPTIONS = (Object.keys(INVITATION_STATUS) as InvitationStatus[]).map((value) => ({
  value,
  label: INVITATION_STATUS[value].label,
}));

type InvitationListProps = {
  tabs: ReactNode;
  canAct: boolean;
  resellers: ResellerState;
};

function closedNote(invitation: Invitation): string | null {
  if (invitation.acceptedAt) return `El ${formatDate(invitation.acceptedAt)}`;
  if (invitation.revokedAt) return `El ${formatDate(invitation.revokedAt)}`;
  return null;
}

export function InvitationList({ tabs, canAct, resellers }: InvitationListProps) {
  const toast = useToast();
  const { params, query } = useListQuery<Invitation>("/admin/invitations", FILTERS);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);

  function resellerName(id: string | null): ReactNode {
    if (!id) return "—";
    const name = resellers.status === "ready" ? resellers.names.get(id) : undefined;
    return name ?? <span className="invitations-id">{id.slice(0, 8)}</span>;
  }

  async function revoke(reason: string) {
    if (!revoking) return;
    await revokeInvitation(revoking.id, reason);
    toast({ tone: "success", message: `Revocaste la invitación de ${revoking.email}.` });
    setRevoking(null);
    query.reload();
  }

  const columns: Column<Invitation>[] = [
    { key: "email", header: "Email", cell: (row) => <span className="invitations-email">{row.email}</span> },
    {
      key: "status",
      header: "Estado",
      cell: (row) => {
        const note = closedNote(row);
        return (
          <span className="invitations-status">
            <Tag tone={INVITATION_STATUS[row.status].tone}>{INVITATION_STATUS[row.status].label}</Tag>
            {note ? <span className="invitations-note">{note}</span> : null}
            {row.acceptedUserId ? (
              <Link className="invitations-note" to={`/usuarios/${row.acceptedUserId}`}>
                Ver usuario
              </Link>
            ) : null}
          </span>
        );
      },
    },
    { key: "demo", header: "Demo", cell: (row) => <span className="num">{daysText(row.demoDays)}</span> },
    { key: "expires", header: "Vence", cell: (row) => formatDate(row.expiresAt) },
    { key: "reseller", header: "Revendedor", cell: (row) => resellerName(row.resellerId) },
    { key: "created", header: "Creada", cell: (row) => formatDate(row.createdAt) },
  ];

  if (canAct) {
    columns.push({
      key: "actions",
      header: "Acciones",
      align: "end",
      cell: (row) =>
        row.status === "OPEN" ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setRevoking(row)}>
            Revocar
          </button>
        ) : (
          <span className="invitations-note">—</span>
        ),
    });
  }

  return (
    <>
      <div className="invitations-toolbar">
        {tabs}
        {canAct ? (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            Nueva invitación
          </button>
        ) : null}
      </div>
      <ListView
        caption="Invitaciones"
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay invitaciones"
        emptyHint={canAct ? "Creá la primera con Nueva invitación." : undefined}
        filters={
          <FilterBar active={params.active} onClear={params.clear}>
            <SelectFilter
              label="Estado"
              value={params.value("status")}
              options={STATUS_OPTIONS}
              allLabel="Todas"
              onChange={(value) => params.setFilter("status", value)}
            />
            <SearchFilter
              label="Email"
              value={params.value("email")}
              placeholder="Empieza con…"
              onSubmit={(value) => params.setFilter("email", value)}
            />
          </FilterBar>
        }
      />
      {canAct ? (
        <>
          <CreateInvitationFlow open={creating} resellers={resellers} onClose={() => setCreating(false)} onCreated={query.reload} />
          <ReasonDialog
            open={revoking !== null}
            title="Revocar invitación"
            confirmLabel="Revocar"
            tone="danger"
            onConfirm={revoke}
            onClose={() => setRevoking(null)}
          >
            <p>
              Vas a revocar la invitación de <strong>{revoking?.email}</strong>. Su link deja de funcionar y no se puede volver a abrir.
              Si hace falta, creá una nueva.
            </p>
          </ReasonDialog>
        </>
      ) : null}
    </>
  );
}
